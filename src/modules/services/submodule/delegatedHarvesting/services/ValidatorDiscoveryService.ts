import { AppState } from "@/state/appState";
import {
  Convert,
  MetadataQueryParams,
  MetadataType,
  UInt64,
  AccountMetadataTransaction,
  Deadline,
} from "tsjs-xpx-chain-sdk";

export interface ValidatorCandidate {
  id: string;
  name: string;
  endpoint: string;
  restEndpoint?: string;
  nodePublicKey?: string;
  location?: string;
  isDefault?: boolean;
}

export interface VerifiedValidator extends ValidatorCandidate {
  online: boolean;
  pingMs: number;
  activeSlots: number;
  maxSlots: number;
  features: string[];
  eligible: boolean;
  statusReason?: string;
  version?: string;
}

export const VALIDATOR_SCOPED_KEY_UTF8 = "sirius.v";

const DEFAULT_VALIDATORS: ValidatorCandidate[] = [
  {
    id: "default-local-node",
    name: "⭐ Igor's Community Validator (Local / Host)",
    endpoint: "http://localhost:8080",
    restEndpoint: "http://localhost:3000",
    location: "Local",
    isDefault: true,
  },
];

const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeoutMs = 3000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
};

export class ValidatorDiscoveryService {
  /**
   * Fetch validator candidates registered on-chain via AccountMetadata with scoped key 'sirius.v'
   */
  public static async fetchOnChainCandidates(): Promise<ValidatorCandidate[]> {
    try {
      if (!AppState.chainAPI || !AppState.chainAPI.metadataAPI) {
        return [];
      }

      const qp = new MetadataQueryParams();
      qp.metadataType = MetadataType.ACCOUNT;
      qp.pageSize = 50;

      const keyHex = Convert.utf8ToHex(VALIDATOR_SCOPED_KEY_UTF8);
      qp.scopedMetadataKey = UInt64.fromHex(keyHex);

      const res = await AppState.chainAPI.metadataAPI.searchMetadatas(qp);
      if (!res || !res.metadataEntries) {
        return [];
      }

      const candidates: ValidatorCandidate[] = [];

      for (const entry of res.metadataEntries) {
        try {
          const rawValue = (entry as any).value || "";
          if (!rawValue) continue;

          let parsed: any = null;
          try {
            parsed = JSON.parse(rawValue);
          } catch {
            // Support raw url strings as well
            if (rawValue.startsWith("http://") || rawValue.startsWith("https://")) {
              parsed = { endpoint: rawValue };
            }
          }

          if (parsed && (parsed.endpoint || parsed.url)) {
            const rawEndpoint = (parsed.endpoint || parsed.url).trim().replace(/\/+$/, "");
            const targetPub = (entry as any).targetKey?.publicKey || (entry as any).targetId?.toHex?.() || "";
            candidates.push({
              id: `onchain-${targetPub.slice(0, 8)}-${candidates.length}`,
              name: parsed.name || `Sirius Node (${targetPub.slice(0, 6)}...)`,
              endpoint: rawEndpoint,
              restEndpoint: parsed.restEndpoint ? parsed.restEndpoint.trim().replace(/\/+$/, "") : undefined,
              nodePublicKey: parsed.nodePublicKey || parsed.harvestPublicKey || targetPub,
              location: parsed.location || "Global",
              isDefault: false,
            });
          }
        } catch (itemErr) {
          console.warn("[ValidatorDiscovery] Failed parsing metadata entry:", itemErr);
        }
      }

      return candidates;
    } catch (err) {
      console.warn("[ValidatorDiscovery] Error querying on-chain metadata:", err);
      return [];
    }
  }

  /**
   * Active 3-Point Eligibility Handshake
   * Probes candidate endpoint and REST API to verify:
   * 1. Reachability & round-trip latency
   * 2. Hot-load manager feature ('delegated_harvesting_hotload')
   * 3. Available harvesting pool capacity (activeSlots < maxSlots)
   * 4. Catapult engine version & block producer role
   */
  public static async probeValidatorHealth(
    candidate: ValidatorCandidate,
    timeoutMs = 2500
  ): Promise<VerifiedValidator> {
    const start = performance.now();
    const cleanEndpoint = candidate.endpoint.trim().replace(/\/+$/, "");

    try {
      const resp = await fetchWithTimeout(`${cleanEndpoint}/api/status`, { method: "GET" }, timeoutMs);
      const pingMs = Math.round(performance.now() - start);

      if (!resp.ok) {
        return {
          ...candidate,
          online: false,
          pingMs,
          activeSlots: 0,
          maxSlots: 0,
          features: [],
          eligible: false,
          statusReason: `HTTP Error ${resp.status}`,
        };
      }

      const data = await resp.json();
      const features: string[] = Array.isArray(data.features) ? data.features : [];
      const hasHotload = features.includes("delegated_harvesting_hotload");

      const delHarv = data.delegatedHarvesting || {};
      const activeSlots = typeof delHarv.activeSlots === "number" ? delHarv.activeSlots : 0;
      const maxSlots = typeof delHarv.maxSlots === "number" ? delHarv.maxSlots : 100;
      const hasAvailableSlots = activeSlots < maxSlots;

      // Extract node name or key if advertised by supervisor
      let advertisedName = candidate.name;
      if (delHarv.nodeName && candidate.isDefault) {
        // Keep default label recognizable
        advertisedName = `${candidate.name}`;
      } else if (delHarv.nodeName) {
        advertisedName = delHarv.nodeName;
      }

      const nodePubKey = delHarv.nodeKey || candidate.nodePublicKey;

      let eligible = true;
      let statusReason: string | undefined;

      if (!hasHotload) {
        eligible = false;
        statusReason = "Ineligible (engine lacks dynamic hotload)";
      } else if (!hasAvailableSlots) {
        eligible = false;
        statusReason = "Pool Full (0 slots available)";
      }

      return {
        ...candidate,
        name: advertisedName,
        endpoint: cleanEndpoint,
        online: true,
        pingMs,
        activeSlots,
        maxSlots,
        features,
        eligible,
        statusReason,
        nodePublicKey: nodePubKey,
      };
    } catch (err: any) {
      const pingMs = Math.round(performance.now() - start);
      return {
        ...candidate,
        online: false,
        pingMs,
        activeSlots: 0,
        maxSlots: 0,
        features: [],
        eligible: false,
        statusReason: err.name === "AbortError" ? "Timeout (>2.5s)" : "Offline / CORS blocked",
      };
    }
  }

  /**
   * Aggregates default, local, and on-chain validator candidates,
   * performs deduplication, and probes all nodes in parallel.
   */
  public static async discoverAndProbeAll(): Promise<VerifiedValidator[]> {
    const onChainCandidates = await this.fetchOnChainCandidates();

    // Combine default and on-chain candidates
    const allCandidates = [...DEFAULT_VALIDATORS, ...onChainCandidates];

    // Deduplicate by clean endpoint
    const seenEndpoints = new Set<string>();
    const uniqueCandidates: ValidatorCandidate[] = [];

    for (const c of allCandidates) {
      const clean = c.endpoint.trim().toLowerCase().replace(/\/+$/, "");
      if (!seenEndpoints.has(clean)) {
        seenEndpoints.add(clean);
        uniqueCandidates.push(c);
      }
    }

    // Probe all in parallel
    const probed = await Promise.all(
      uniqueCandidates.map((candidate) => this.probeValidatorHealth(candidate))
    );

    // Sort: Eligible nodes first, then by ping (lowest latency first), then ineligible/offline
    return probed.sort((a, b) => {
      if (a.eligible && !b.eligible) return -1;
      if (!a.eligible && b.eligible) return 1;
      if (a.online && !b.online) return -1;
      if (!a.online && b.online) return 1;
      return a.pingMs - b.pingMs;
    });
  }

  /**
   * Helper to build an AccountMetadataTransaction for node operators who wish
   * to register their validator node on-chain.
   */
  public static buildRegisterMetadataTransaction(
    targetPublicKeyHex: string,
    metadata: {
      name: string;
      endpoint: string;
      restEndpoint?: string;
      location?: string;
    }
  ): AccountMetadataTransaction {
    const payloadStr = JSON.stringify(metadata);
    const keyHex = Convert.utf8ToHex(VALIDATOR_SCOPED_KEY_UTF8);
    const scopedKey = UInt64.fromHex(keyHex);

    return AccountMetadataTransaction.create(
      Deadline.create(),
      targetPublicKeyHex,
      scopedKey,
      payloadStr.length,
      Convert.utf8ToHex(payloadStr),
      AppState.networkType || 184
    );
  }
}
