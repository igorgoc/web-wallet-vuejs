<template>
  <TransactionLayout class="mt-8">
    <template #white>
      <div class="flex items-center justify-between mb-4">
        <div class="font-semibold text-sm md:text-base text-gray-800">
          Delegated Staking & Node Harvesting
        </div>
        <div class="flex items-center gap-1.5 text-xs text-green-700 bg-green-100 px-2.5 py-1 rounded-full font-semibold">
          <span>🛡️</span>
          <span>100% Non-Custodial</span>
        </div>
      </div>

      <!-- Overview Info Callout -->
      <div class="mb-5 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 leading-relaxed">
        Delegate your account's harvesting stake (≥ 100,000 {{ nativeTokenName }}) to a community validator node.
        Your funds never leave your wallet, and block rewards are deposited directly into your account on-chain.
      </div>

      <div class="space-y-6">
        <!-- Step 1: Account & Stake -->
        <div class="border border-gray-200 rounded p-4 bg-white shadow-sm">
          <div class="text-xs font-bold text-gray-800 mb-2 flex items-center justify-between">
            <span class="uppercase tracking-wider">1. Account & Stake</span>
            <span v-if="accountBalance >= 100000" class="text-xxs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
              Eligible ({{ formatNumber(accountBalance) }} {{ nativeTokenName }})
            </span>
            <span v-else class="text-xxs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
              Below 100k {{ nativeTokenName }} Minimum
            </span>
          </div>

          <SelectInputAccount 
            :type="'dynamic'" 
            :label="'Harvester Account'" 
            @select-account="onSelectAddress" 
            @select-account-public-key="onSelectPublicKey" 
          />

          <div class="mt-2.5 grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded border border-gray-200">
            <div>
              <span class="text-gray-500">Balance:</span>
              <div class="font-bold text-gray-800">{{ formatNumber(accountBalance) }} {{ nativeTokenName }}</div>
            </div>
            <div>
              <span class="text-gray-500">Min. Required:</span>
              <div class="font-bold text-gray-800">100,000 {{ nativeTokenName }}</div>
            </div>
          </div>

          <div v-if="isMaturing" class="mt-2.5 p-2 bg-orange-light border border-orange-primary/30 rounded text-xs text-orange-primary">
            Recent deposits mature over ~24h (5,760 blocks) before harvester registration unlocks.
          </div>

          <div v-if="isLinked && !isHarvesterRegistered" class="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-base">ℹ️</span>
              <span><strong>Account Linked on-chain.</strong> Step 2 is already complete. Proceed to <strong>Step 3</strong> to register as a harvester.</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Link Remote Key -->
        <div class="border border-gray-200 rounded p-4 bg-white shadow-sm">
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold text-gray-800 uppercase tracking-wider">2. Link Remote Key</div>
            <span v-if="isLinked" class="text-xxs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
              Linked
            </span>
            <span v-else class="text-xxs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">
              Not Linked
            </span>
          </div>

          <!-- If already linked -->
          <div v-if="isLinked" class="space-y-2.5">
            <div class="bg-gray-50 border border-gray-200 p-2.5 rounded text-xs">
              <span class="text-gray-500 block text-xxs uppercase font-semibold">Linked Remote Public Key (On-Chain)</span>
              <div class="font-mono text-xs break-all text-gray-800 font-semibold mt-0.5">
                {{ linkedRemotePubKey }}
              </div>
            </div>

            <!-- Private Key Backup Box -->
            <div v-if="activeOrSavedPrivateKey" class="p-3 bg-orange-light border border-orange-primary/30 rounded text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-orange-primary flex items-center gap-1">
                  🔑 Remote Private Key (Save for Node Delegation)
                </span>
                <div class="flex items-center gap-1.5">
                  <button 
                    type="button" 
                    @click="copyKey(activeOrSavedPrivateKey)" 
                    class="px-2 py-0.5 bg-orange-primary hover:bg-orange-action text-white rounded text-xxs font-bold transition cursor-pointer"
                  >
                    Copy Key
                  </button>
                  <button 
                    type="button" 
                    @click="downloadBackupFile" 
                    class="px-2 py-0.5 bg-navy-primary hover:bg-navy-lighter text-white rounded text-xxs font-bold transition cursor-pointer"
                  >
                    Download Backup (.txt)
                  </button>
                </div>
              </div>

              <div class="relative">
                <input 
                  :type="showStep2PrivKey ? 'text' : 'password'" 
                  readonly 
                  :value="activeOrSavedPrivateKey" 
                  class="w-full bg-white border border-orange-primary/30 rounded p-1.5 font-mono text-xs text-gray-800 pr-12 focus:outline-none"
                />
                <button 
                  type="button" 
                  @click="showStep2PrivKey = !showStep2PrivKey" 
                  class="absolute right-2 top-1.5 text-orange-primary hover:text-orange-action text-xxs font-semibold cursor-pointer"
                >
                  {{ showStep2PrivKey ? 'Hide' : 'Reveal' }}
                </button>
              </div>

              <p class="text-xxs text-gray-600">
                ⚠️ <strong>Save this private key now.</strong> The blockchain only stores your public key. You will need this key whenever you connect to a validator node.
              </p>
            </div>

            <div v-else class="p-2.5 bg-gray-50 border border-gray-200 rounded text-xxs text-gray-600">
              ℹ️ Private key not cached in this browser session. If you do not have it saved, click <strong>Unlink</strong> below to generate and link a new key pair.
            </div>

            <div class="flex items-center justify-between pt-0.5">
              <span class="text-xs text-green-600 font-semibold">
                &check; Linked on Sirius Mainnet
              </span>
              <button 
                type="button"
                @click="broadcastUnlink" 
                class="text-xs text-red-primary hover:underline font-semibold cursor-pointer"
              >
                Unlink
              </button>
            </div>
          </div>

          <!-- If not linked -->
          <div v-else class="space-y-2.5">
            <div class="bg-blue-50 border border-blue-200 p-2.5 rounded text-xs space-y-2">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-blue-primary font-semibold text-xxs uppercase">Remote Private Key (Required for Step 4)</span>
                  <div class="flex items-center gap-1.5">
                    <button 
                      type="button" 
                      @click="copyKey(ephemeralAccount?.privateKey || '')" 
                      class="text-xxs text-blue-link hover:underline font-bold cursor-pointer"
                    >
                      Copy
                    </button>
                    <button 
                      type="button" 
                      @click="downloadBackupFile" 
                      class="text-xxs text-blue-link hover:underline font-bold cursor-pointer"
                    >
                      Download (.txt)
                    </button>
                  </div>
                </div>
                <div class="relative">
                  <input 
                    :type="showStep2PrivKey ? 'text' : 'password'" 
                    readonly 
                    :value="ephemeralAccount?.privateKey" 
                    class="w-full bg-white border border-blue-200 rounded p-1.5 font-mono text-xs text-gray-800 pr-12 focus:outline-none"
                  />
                  <button 
                    type="button" 
                    @click="showStep2PrivKey = !showStep2PrivKey" 
                    class="absolute right-2 top-1.5 text-blue-link hover:underline text-xxs font-semibold cursor-pointer"
                  >
                    {{ showStep2PrivKey ? 'Hide' : 'Reveal' }}
                  </button>
                </div>
                <span class="text-xxs text-gray-500 block mt-1">
                  Save this key before linking. You will submit it in Step 4.
                </span>
              </div>
            </div>

            <button 
              type="button"
              @click="broadcastLink" 
              class="w-full blue-btn py-3 text-xs font-semibold text-white rounded shadow-sm cursor-pointer"
              :disabled="accountBalance < 0.2"
            >
              Link Key
            </button>
          </div>
        </div>

        <!-- Step 3: Harvester Committee Registration -->
        <div 
          class="rounded p-4 shadow-sm transition-all duration-200 border"
          :class="!isLinked 
            ? 'bg-gray-100/80 border-gray-200 opacity-60' 
            : 'bg-white border-gray-200'"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="text-xs font-bold uppercase tracking-wider" :class="!isLinked ? 'text-gray-400' : 'text-gray-800'">
              3. Register Harvester
            </div>
            <span v-if="isHarvesterRegistered" class="text-xxs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
              Registered
            </span>
            <span v-else-if="!isLinked" class="text-xxs px-2 py-0.5 bg-gray-200 text-gray-500 rounded-full font-semibold">
              Locked (Step 2 Pending)
            </span>
            <span v-else class="text-xxs px-2 py-0.5 bg-orange-light text-orange-primary rounded-full font-semibold border border-orange-primary/30">
              Ready to Register
            </span>
          </div>

          <!-- If already registered -->
          <div v-if="isHarvesterRegistered" class="p-2.5 bg-green-50 border border-green-200 rounded text-xs text-green-800 flex items-center gap-2">
            <span class="text-green-600 text-sm font-bold">&check;</span>
            <span>Registered in Harvester Committee</span>
          </div>

          <!-- If locked because linking is not done -->
          <div v-else-if="!isLinked" class="space-y-2">
            <div class="p-2.5 bg-gray-200/50 border border-gray-200 rounded text-xs text-gray-500 flex items-center gap-2">
              <span class="text-sm">🔒</span>
              <span>Account must be linked in Step 2 before registering as a harvester.</span>
            </div>
            <button 
              type="button"
              disabled 
              class="w-full py-3 text-xs font-semibold text-gray-400 bg-gray-200 border border-gray-300 rounded cursor-not-allowed"
            >
              Register Harvester (Locked)
            </button>
          </div>

          <!-- If linked and ready to register -->
          <div v-else class="space-y-2">
            <div class="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              💡 Account key is linked on-chain. Register below to participate in block harvesting.
            </div>
            <button 
              type="button"
              @click="broadcastAddHarvester" 
              class="w-full blue-btn py-3 text-xs font-semibold text-white rounded shadow-sm cursor-pointer"
              :disabled="accountBalance < 100000"
            >
              Register Harvester
            </button>
            <div v-if="accountBalance < 100000" class="text-xxs text-red-primary text-center">
              Requires min. 100,000 {{ nativeTokenName }} stake.
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #navy>
      <div class="text-white space-y-4">
        <div class="font-semibold text-sm border-b border-navy-lighter pb-3 text-white">
          4. Activate on Validator Node
        </div>

        <!-- Prerequisites Checklist -->
        <div class="p-3 bg-navy-lighter/30 border border-navy-lighter/60 rounded text-xs space-y-2">
          <div class="font-bold text-gray-200 flex items-center justify-between pb-1.5 border-b border-navy-lighter/50">
            <span>Prerequisites</span>
            <span v-if="canActivateOnNode" class="text-xxs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">READY</span>
            <span v-else class="text-xxs px-2 py-0.5 rounded-full bg-orange-primary/20 text-orange-200 border border-orange-primary/40 font-bold">PENDING</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-300">Stake (≥ 100k {{ nativeTokenName }}):</span>
            <span v-if="hasMinimumBalance" class="text-emerald-400 font-semibold">
              ✓ {{ formatNumber(accountBalance) }}
            </span>
            <span v-else class="text-red-400 font-semibold">
              ✗ {{ formatNumber(accountBalance) }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-300">Key Linked (Step 2):</span>
            <span v-if="isLinked" class="text-emerald-400 font-semibold">
              ✓ Linked
            </span>
            <span v-else class="text-orange-primary font-semibold">
              ✗ Not Linked
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-300">Harvester (Step 3):</span>
            <span v-if="isHarvesterRegistered" class="text-emerald-400 font-semibold">
              ✓ Registered
            </span>
            <span v-else class="text-orange-primary font-semibold">
              ✗ Pending
            </span>
          </div>

          <div v-if="remotePrivateKeyInput.trim()" class="flex items-center justify-between pt-1 border-t border-navy-lighter/50">
            <span class="text-gray-300">Key Matches:</span>
            <span v-if="isLinked && isKeyMatchingLinked" class="text-emerald-400 font-semibold">
              ✓ Matches
            </span>
            <span v-else-if="!isLinked" class="text-gray-400">
              Awaiting Link
            </span>
            <span v-else class="text-red-400 font-semibold">
              ✗ Mismatch
            </span>
          </div>
        </div>

        <!-- Node Selection -->
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-gray-200">Validator Node</label>
          <select 
            v-model="selectedNodePreset" 
            class="w-full bg-white text-gray-800 border border-gray-300 rounded p-2 text-xs font-semibold focus:outline-none"
          >
            <option value="default">⭐ Igor's Community Validator (Local / Host)</option>
            <option value="custom">🌐 Custom Node...</option>
          </select>

          <div v-if="selectedNodePreset === 'custom'" class="mt-1">
            <input 
              type="text" 
              v-model="customNodeUrl" 
              placeholder="http://node-ip:8080" 
              class="w-full bg-white text-gray-800 border border-gray-300 rounded p-2 text-xs font-mono focus:outline-none"
            />
          </div>
        </div>

        <!-- Remote Private Key Input -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-gray-200">
              Remote Private Key (64-char Hex)
            </label>
            <span v-if="isLinked && isKeyMatchingLinked" class="text-xxs text-emerald-400 font-semibold">
              ✓ Matches
            </span>
          </div>
          <div class="relative">
            <input 
              :type="showKey ? 'text' : 'password'" 
              v-model="remotePrivateKeyInput" 
              placeholder="64-character remote key" 
              class="w-full bg-white text-gray-800 border border-gray-300 rounded p-2 text-xs font-mono pr-12 focus:outline-none"
            />
            <button 
              type="button" 
              @click="showKey = !showKey" 
              class="absolute right-2 top-2 text-gray-500 hover:text-gray-700 text-xs font-semibold cursor-pointer"
            >
              {{ showKey ? 'Hide' : 'Show' }}
            </button>
          </div>
        </div>

        <!-- Action Button (Matching ViewHarvesterTxn.vue blue-btn style) -->
        <button 
          type="button"
          @click="submitKeyToNode" 
          :disabled="!canActivateOnNode || isSubmitting" 
          class="mt-3 w-full blue-btn py-4 disabled:opacity-50 disabled:cursor-auto text-white text-xs font-semibold cursor-pointer"
        >
          <span v-if="isSubmitting">Connecting to Node...</span>
          <span v-else-if="!hasMinimumBalance">Cannot Activate: Balance &lt; 100k {{ nativeTokenName }}</span>
          <span v-else-if="!isLinked">Cannot Activate: Not Linked</span>
          <span v-else-if="!isHarvesterRegistered">Cannot Activate: Not Registered</span>
          <span v-else-if="!isKeyMatchingLinked">Cannot Activate: Key Mismatch</span>
          <span v-else>Activate on Validator Node &rarr;</span>
        </button>

        <!-- Result Message Box -->
        <div v-if="nodeMessage" class="p-2.5 rounded text-xs" :class="nodeSuccess ? 'bg-emerald-900/60 border border-emerald-500 text-emerald-200' : 'bg-red-900/60 border border-red-500 text-red-200'">
          <div class="font-bold mb-0.5">{{ nodeSuccess ? 'Success' : 'Error' }}</div>
          <div>{{ nodeMessage }}</div>
        </div>

        <!-- Node Connected Status -->
        <div class="mt-4 pt-3 border-t border-navy-lighter/40 flex items-center justify-between text-xs text-gray-300">
          <span class="text-gray-400">Target Node:</span>
          <span class="font-mono text-white font-semibold truncate ml-2">{{ targetNodeUrl }}</span>
        </div>

        <!-- Cancel Link (identical to ViewHarvesterTxn.vue) -->
        <div class="text-center mt-3 pt-2">
          <router-link
            :to="{ name: 'ViewServices' }"
            class="content-center text-xs text-white border-b-2 border-white hover:text-gray-200"
          >{{ $t("general.cancel") }}</router-link>
        </div>
      </div>
    </template>
  </TransactionLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import TransactionLayout from "@/components/TransactionLayout.vue";
import SelectInputAccount from "@/components/SelectInputAccount.vue";
import { walletState } from "@/state/walletState";
import { AppState } from "@/state/appState";
import { networkState } from "@/state/networkState";
import { Helper } from "@/util/typeHelper";
import { WalletUtils } from "@/util/walletUtils";
import { TransactionState } from "@/state/transactionState";
import {
  Account,
  Address,
  LinkAction,
  PublicAccount,
} from "tsjs-xpx-chain-sdk";
import { copyToClipboard } from "@/util/functions";

const router = useRouter();
const toast = useToast();
const { t } = useI18n();

const selectedAddress = ref<string>("");
const selectedPublicKey = ref<string>("");
const accountBalance = ref<number>(0);
const nativeTokenName = computed(() => AppState.nativeToken?.label || "XPX");

const linkedRemotePubKey = ref<string>("");
const isLinked = computed(() => {
  return linkedRemotePubKey.value !== "" && linkedRemotePubKey.value !== "0".repeat(64);
});

const ephemeralAccount = ref<Account | null>(null);
const ephemeralRemotePubKey = computed(() => ephemeralAccount.value?.publicKey || "");

const showStep2PrivKey = ref<boolean>(false);

const activeOrSavedPrivateKey = computed(() => {
  if (remotePrivateKeyInput.value && isKeyValid.value) {
    return remotePrivateKeyInput.value.trim();
  }
  if (selectedAddress.value) {
    const saved = localStorage.getItem("sirius_remote_key_" + selectedAddress.value);
    if (saved && /^[0-9a-fA-F]{64}$/.test(saved)) {
      return saved;
    }
  }
  if (ephemeralAccount.value?.privateKey) {
    return ephemeralAccount.value.privateKey;
  }
  return "";
});

const copyKey = (val: string) => {
  if (!val) return;
  copyToClipboard(val);
  toast.add({
    severity: "info",
    summary: "Copied",
    detail: "Remote private key copied to clipboard!",
    group: "br-custom",
    life: 3000,
  });
};

const downloadBackupFile = () => {
  const priv = activeOrSavedPrivateKey.value;
  if (!priv) return;
  const content = `=== Sirius Delegated Harvester Key Backup ===
Generated: ${new Date().toISOString()}
Owner Account Address: ${selectedAddress.value}
Linked Remote Public Key: ${linkedRemotePubKey.value || ephemeralRemotePubKey.value}
Remote Private Key: ${priv}

IMPORTANT NOTES:
1. This remote key pair contains 0 XPX funds.
2. It is exclusively used by your chosen Sirius validator node to sign harvested blocks.
3. Save this file safely so you can activate or reconnect your account to any validator node anytime.
`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sirius-remote-key-${selectedAddress.value || "backup"}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast.add({
    severity: "info",
    summary: "Backup Saved",
    detail: "Downloaded remote key backup file.",
    group: "br-custom",
    life: 4000,
  });
};

const isHarvesterRegistered = ref<boolean>(false);
const isMaturing = ref<boolean>(false);

// Node delegation state
const selectedNodePreset = ref<string>("default");
const customNodeUrl = ref<string>("http://localhost:8080");
const targetNodeUrl = computed(() => {
  if (selectedNodePreset.value === "default") {
    return "http://localhost:8080";
  }
  return customNodeUrl.value.trim().replace(/\/+$/, "");
});

const remotePrivateKeyInput = ref<string>("");
const showKey = ref<boolean>(false);
const isSubmitting = ref<boolean>(false);
const nodeMessage = ref<string>("");
const nodeSuccess = ref<boolean>(false);

const isKeyValid = computed(() => {
  const k = remotePrivateKeyInput.value.trim();
  return /^[0-9a-fA-F]{64}$/.test(k);
});

const derivedRemotePubKey = computed(() => {
  const k = remotePrivateKeyInput.value.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(k)) return "";
  try {
    const acc = Account.createFromPrivateKey(k, AppState.networkType || 184, 1);
    return acc.publicKey;
  } catch {
    return "";
  }
});

const isKeyMatchingLinked = computed(() => {
  if (!isLinked.value || !derivedRemotePubKey.value) return false;
  return derivedRemotePubKey.value.toUpperCase() === linkedRemotePubKey.value.toUpperCase();
});

const hasMinimumBalance = computed(() => {
  return accountBalance.value >= 100000;
});

const canActivateOnNode = computed(() => {
  return (
    isKeyValid.value &&
    hasMinimumBalance.value &&
    isLinked.value &&
    isKeyMatchingLinked.value &&
    isHarvesterRegistered.value
  );
});

// Format numbers
const formatNumber = (num: number) => {
  return Number(num).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

// Generate fresh ephemeral account
const generateEphemeralAccount = () => {
  ephemeralAccount.value = Account.generateNewAccount(AppState.networkType);
  if (!remotePrivateKeyInput.value && ephemeralAccount.value) {
    remotePrivateKeyInput.value = ephemeralAccount.value.privateKey;
  }
};

// Account selection callbacks
const onSelectAddress = async (address: string) => {
  selectedAddress.value = address;
  await refreshAccountDetails();
  if (!isLinked.value && !ephemeralAccount.value) {
    generateEphemeralAccount();
  }
};

const onSelectPublicKey = (pubKey: string) => {
  selectedPublicKey.value = pubKey;
};

// Query on-chain account info
const refreshAccountDetails = async () => {
  if (!selectedAddress.value || !AppState.chainAPI) return;

  try {
    const accInfo = await AppState.chainAPI.accountAPI.getAccountInfo(
      Address.createFromRawAddress(selectedAddress.value)
    );

    // 1. Balance
    const assetIndex = accInfo.mosaics.findIndex(
      (m) => m.id.toHex() === AppState.nativeToken.assetId
    );
    if (assetIndex !== -1) {
      accountBalance.value =
        accInfo.mosaics[assetIndex].amount.compact() /
        Math.pow(10, AppState.nativeToken.divisibility);
    } else {
      accountBalance.value = 0;
    }

    // 2. Linked key
    linkedRemotePubKey.value = accInfo.linkedAccountKey || "";
    if (selectedAddress.value) {
      const savedKey = localStorage.getItem("sirius_remote_key_" + selectedAddress.value);
      if (savedKey && /^[0-9a-fA-F]{64}$/.test(savedKey)) {
        remotePrivateKeyInput.value = savedKey;
      } else if (isLinked.value) {
        remotePrivateKeyInput.value = "";
      }
    }

    // 3. Maturation check (snapshots with 0 balance)
    if (accInfo.snapshots && accInfo.snapshots.length > 0) {
      const hasZero = accInfo.snapshots.some(
        (s: any) => s.amount === "0" || s.amount === 0
      );
      isMaturing.value = hasZero;
    } else {
      isMaturing.value = false;
    }

    // 4. Check Harvester Committee Registration
    const targetHarvKey = isLinked.value
      ? linkedRemotePubKey.value
      : selectedPublicKey.value;

    if (targetHarvKey && targetHarvKey !== "0".repeat(64)) {
      try {
        const harvInfo =
          await AppState.chainAPI.harvesterAPI.getAccountHarvestingHarvesterInfo(
            Helper.createPublicAccount(targetHarvKey, AppState.networkType)
          );
        isHarvesterRegistered.value = harvInfo && harvInfo.length > 0;
      } catch {
        isHarvesterRegistered.value = false;
      }
    }
  } catch (err) {
    console.error("Error refreshing account details:", err);
  }
};

// Broadcast AccountLink
const broadcastLink = () => {
  if (!ephemeralAccount.value) return;
  if (selectedAddress.value) {
    try {
      localStorage.setItem("sirius_remote_key_" + selectedAddress.value, ephemeralAccount.value.privateKey);
    } catch {}
  }
  const linkTx = AppState.buildTxn
    .accountLinkBuilder()
    .remoteAccountKey(ephemeralAccount.value.publicKey)
    .linkAction(LinkAction.Link)
    .build();

  TransactionState.unsignedTransactionPayload = linkTx.serialize();
  TransactionState.selectedAddress = selectedAddress.value;
  router.push({ name: "ViewConfirmTransaction" });
};

// Broadcast Unlink
const broadcastUnlink = () => {
  if (!linkedRemotePubKey.value) return;
  const unlinkTx = AppState.buildTxn
    .accountLinkBuilder()
    .remoteAccountKey(linkedRemotePubKey.value)
    .linkAction(LinkAction.Unlink)
    .build();

  TransactionState.unsignedTransactionPayload = unlinkTx.serialize();
  TransactionState.selectedAddress = selectedAddress.value;
  router.push({ name: "ViewConfirmTransaction" });
};

// Broadcast AddHarvester
const broadcastAddHarvester = () => {
  const harvPub = isLinked.value
    ? linkedRemotePubKey.value
    : selectedPublicKey.value;
  const harvPubAcc = PublicAccount.createFromPublicKey(
    harvPub,
    AppState.networkType
  );

  const addHarvTx = AppState.buildTxn
    .addHarvesterBuilder()
    .harvesterKey(harvPubAcc)
    .build();

  TransactionState.unsignedTransactionPayload = addHarvTx.serialize();
  TransactionState.selectedAddress = selectedAddress.value;
  router.push({ name: "ViewConfirmTransaction" });
};

// Submit key to node
const submitKeyToNode = async () => {
  if (!isKeyValid.value) return;

  if (!hasMinimumBalance.value) {
    nodeSuccess.value = false;
    nodeMessage.value = `Cannot activate: Account balance (${formatNumber(accountBalance.value)} ${nativeTokenName.value}) is below the required 100,000 ${nativeTokenName.value}.`;
    return;
  }

  if (!isLinked.value) {
    nodeSuccess.value = false;
    nodeMessage.value = "Cannot activate: Account is not linked on-chain. Please complete Step 2 (Link Account Key) first.";
    return;
  }

  if (!isKeyMatchingLinked.value) {
    nodeSuccess.value = false;
    nodeMessage.value = "Cannot activate: The entered private key does not match the on-chain linked public key.";
    return;
  }

  if (!isHarvesterRegistered.value) {
    nodeSuccess.value = false;
    nodeMessage.value = "Cannot activate: Account is not registered in the Harvester Committee on-chain. Please complete Step 3 (Register Harvester) first.";
    return;
  }

  isSubmitting.value = true;
  nodeMessage.value = "";

  try {
    const res = await fetch(`${targetNodeUrl.value}/api/harvesting/delegated/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        remotePrivateKey: remotePrivateKeyInput.value.trim(),
        ownerAddress: selectedAddress.value,
        label: "Sirius-Web-Wallet-Delegator",
      }),
    });

    const data = await res.json();
    if (res.ok && data.status === "success") {
      nodeSuccess.value = true;
      nodeMessage.value = `Successfully hot-loaded into node! Harvester Public Key: ${data.harvesterPublicKey}`;
      toast.add({
        severity: "success",
        summary: "Node Connected",
        detail: "Delegated harvester key activated on validator node!",
        life: 5000,
      });
    } else {
      nodeSuccess.value = false;
      nodeMessage.value = data.error || "Validator node returned an error.";
    }
  } catch (err: any) {
    nodeSuccess.value = false;
    nodeMessage.value = `Failed to connect to ${targetNodeUrl.value}. Ensure the node is online and accessible. (${err.message})`;
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(async () => {
  const defaultAcc = walletState.currentLoggedInWallet?.selectDefaultAccount();
  if (defaultAcc) {
    selectedAddress.value = defaultAcc.address;
    selectedPublicKey.value = defaultAcc.publicKey;
    await refreshAccountDetails();
  }
  if (!isLinked.value && !ephemeralAccount.value) {
    generateEphemeralAccount();
  }
});
</script>
