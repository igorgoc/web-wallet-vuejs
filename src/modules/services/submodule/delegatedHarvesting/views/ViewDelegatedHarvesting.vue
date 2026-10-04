<template>
  <div class="mt-8 px-5 pt-5 max-w-5xl mx-auto">
    <div class="flex items-center gap-3 mb-2">
      <router-link :to="{ name: 'ViewServices' }" class="text-blue-primary hover:underline text-xs flex items-center gap-1 font-semibold">
        &larr; {{ $t("general.backToServices", "Services") }}
      </router-link>
    </div>

    <!-- Title & Introduction Banner -->
    <div class="bg-gradient-to-r from-blue-900 to-indigo-800 text-white rounded-xl p-6 shadow-md mb-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Delegated Staking & Node Harvesting</h1>
          <p class="text-blue-200 text-xs mt-1 max-w-2xl">
            Delegate your account's harvesting stake (≥ 100,000 XPX) to a high-uptime community validator node. 
            Block rewards are credited directly to your account on-chain.
          </p>
        </div>
        <div class="flex items-center gap-2 bg-blue-950/60 border border-blue-400/30 px-3 py-2 rounded-lg text-xs">
          <span class="text-emerald-400 font-bold">100% Non-Custodial</span>
          <span class="text-gray-300">| Funds never leave your wallet</span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Steps 1, 2, 3 -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Step 1: Account Selection & Stake -->
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div class="text-sm font-bold text-gray-800 mb-2.5 flex items-center justify-between">
            <span>1. Account & Stake</span>
            <span v-if="accountBalance >= 100000" class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
              Eligible ({{ formatNumber(accountBalance) }} XPX)
            </span>
            <span v-else class="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">
              Below 100k XPX Minimum
            </span>
          </div>

          <SelectInputAccount 
            :type="'dynamic'" 
            :label="'Harvester Account'" 
            @select-account="onSelectAddress" 
            @select-account-public-key="onSelectPublicKey" 
          />

          <div class="mt-2.5 grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100">
            <div>
              <span class="text-gray-500">Balance:</span>
              <div class="font-bold text-gray-800">{{ formatNumber(accountBalance) }} {{ nativeTokenName }}</div>
            </div>
            <div>
              <span class="text-gray-500">Min. Required:</span>
              <div class="font-bold text-gray-800">100,000 {{ nativeTokenName }}</div>
            </div>
          </div>

          <div v-if="isMaturing" class="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            Recent deposits mature over ~24h (5,760 blocks) before harvester registration unlocks.
          </div>
        </div>

        <!-- Step 2: Account Link (Remote Key) -->
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-2.5">
            <div class="text-sm font-bold text-gray-800">2. Link Remote Key</div>
            <span v-if="isLinked" class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
              Linked
            </span>
            <span v-else class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">
              Not Linked
            </span>
          </div>

          <!-- If already linked -->
          <div v-if="isLinked" class="space-y-2">
            <div class="bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-xs">
              <span class="text-gray-500 block text-xxs uppercase font-semibold">Linked Public Key</span>
              <div class="font-mono text-xs break-all text-gray-800 font-semibold mt-0.5">
                {{ linkedRemotePubKey }}
              </div>
            </div>
            <div class="flex items-center justify-between pt-0.5">
              <span class="text-xs text-green-600 font-semibold">
                &check; Linked on Sirius Mainnet
              </span>
              <button 
                @click="broadcastUnlink" 
                class="text-xs text-red-500 hover:text-red-700 font-semibold hover:underline"
              >
                Unlink
              </button>
            </div>
          </div>

          <!-- If not linked -->
          <div v-else class="space-y-2.5">
            <div class="bg-blue-50 border border-blue-200 p-2.5 rounded-lg text-xs">
              <span class="text-blue-700 font-semibold block mb-0.5">Generated Remote Key:</span>
              <div class="font-mono text-xs break-all text-blue-900 font-semibold">
                {{ ephemeralRemotePubKey }}
              </div>
            </div>
            <button 
              @click="broadcastLink" 
              class="w-full blue-btn py-2 text-xs font-semibold text-white rounded-lg shadow-sm"
              :disabled="accountBalance < 0.2"
            >
              Link Key
            </button>
          </div>
        </div>

        <!-- Step 3: Harvester Committee Registration -->
        <div class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div class="flex items-center justify-between mb-2.5">
            <div class="text-sm font-bold text-gray-800">3. Register Harvester</div>
            <span v-if="isHarvesterRegistered" class="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
              Registered
            </span>
            <span v-else class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold">
              Pending
            </span>
          </div>

          <div v-if="isHarvesterRegistered" class="p-2.5 bg-green-50 border border-green-200 rounded-lg text-xs text-green-800 flex items-center gap-2">
            <span class="text-green-600 text-sm font-bold">&check;</span>
            <span>Registered in Harvester Committee</span>
          </div>

          <div v-else class="space-y-2">
            <button 
              @click="broadcastAddHarvester" 
              class="w-full blue-btn py-2 text-xs font-semibold text-white rounded-lg shadow-sm"
              :disabled="!isLinked || accountBalance < 100000"
            >
              Register Harvester
            </button>
            <div v-if="accountBalance < 100000" class="text-xxs text-red-500 text-center">
              Requires min. 100,000 XPX stake.
            </div>
          </div>
        </div>

      </div>

      <!-- Right Column: Step 4 - Connect to Validator Node -->
      <div class="space-y-6">
        
        <div class="bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-md">
          <div class="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
            <span class="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
            Activate on Validator Node
          </div>

          <!-- Prerequisites Checklist -->
          <div class="mb-3.5 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5 text-xs">
            <div class="font-bold text-gray-700 flex items-center justify-between pb-1 border-b border-slate-200">
              <span>Prerequisites</span>
              <span v-if="canActivateOnNode" class="text-xxs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">READY</span>
              <span v-else class="text-xxs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">PENDING</span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-gray-600">Stake (≥ 100k {{ nativeTokenName }}):</span>
              <span v-if="hasMinimumBalance" class="text-emerald-700 font-semibold">
                ✓ {{ formatNumber(accountBalance) }}
              </span>
              <span v-else class="text-red-600 font-semibold">
                ✗ {{ formatNumber(accountBalance) }}
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-gray-600">Key Linked (Step 2):</span>
              <span v-if="isLinked" class="text-emerald-700 font-semibold">
                ✓ Linked
              </span>
              <span v-else class="text-amber-700 font-semibold">
                ✗ Not Linked
              </span>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-gray-600">Harvester (Step 3):</span>
              <span v-if="isHarvesterRegistered" class="text-emerald-700 font-semibold">
                ✓ Registered
              </span>
              <span v-else class="text-amber-700 font-semibold">
                ✗ Pending
              </span>
            </div>

            <div v-if="remotePrivateKeyInput.trim()" class="flex items-center justify-between pt-1 border-t border-slate-200">
              <span class="text-gray-600">Key Matches:</span>
              <span v-if="isLinked && isKeyMatchingLinked" class="text-emerald-700 font-semibold">
                ✓ Matches
              </span>
              <span v-else-if="!isLinked" class="text-gray-400">
                Awaiting Link
              </span>
              <span v-else class="text-red-600 font-semibold">
                ✗ Mismatch
              </span>
            </div>
          </div>

          <!-- Node Selection -->
          <div class="space-y-2 mb-3">
            <label class="block text-xs font-semibold text-gray-700">Validator Node</label>
            <select 
              v-model="selectedNodePreset" 
              class="w-full border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-indigo-500"
            >
              <option value="default">⭐ Igor's Community Validator (Local / Host)</option>
              <option value="custom">🌐 Custom Node...</option>
            </select>

            <div v-if="selectedNodePreset === 'custom'" class="mt-1.5">
              <input 
                type="text" 
                v-model="customNodeUrl" 
                placeholder="http://node-ip:8080" 
                class="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <!-- Remote Private Key Input -->
          <div class="space-y-1.5 mb-3.5">
            <label class="block text-xs font-semibold text-gray-700">
              Remote Private Key (64-char Hex)
            </label>
            <div class="relative">
              <input 
                :type="showKey ? 'text' : 'password'" 
                v-model="remotePrivateKeyInput" 
                placeholder="64-character remote key" 
                class="w-full border border-gray-300 rounded-lg p-2 text-xs font-mono pr-10 focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="button" 
                @click="showKey = !showKey" 
                class="absolute right-2 top-2 text-gray-400 hover:text-gray-600 text-xs"
              >
                {{ showKey ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <!-- Action Button -->
          <button 
            @click="submitKeyToNode" 
            :disabled="!canActivateOnNode || isSubmitting" 
            class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition shadow"
          >
            <span v-if="isSubmitting">Connecting to Node...</span>
            <span v-else-if="!hasMinimumBalance">Cannot Activate: Balance &lt; 100k {{ nativeTokenName }}</span>
            <span v-else-if="!isLinked">Cannot Activate: Not Linked</span>
            <span v-else-if="!isHarvesterRegistered">Cannot Activate: Not Registered</span>
            <span v-else-if="!isKeyMatchingLinked">Cannot Activate: Key Mismatch</span>
            <span v-else>Activate on Validator Node &rarr;</span>
          </button>

          <!-- Result Message -->
          <div v-if="nodeMessage" class="mt-3 p-2.5 rounded-lg text-xs" :class="nodeSuccess ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'">
            <div class="font-bold mb-0.5">{{ nodeSuccess ? 'Success' : 'Error' }}</div>
            <div>{{ nodeMessage }}</div>
          </div>

          <!-- Node Connected Status -->
          <div class="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <span class="text-gray-500">Target:</span>
            <span class="font-mono text-gray-700 font-semibold">{{ targetNodeUrl }}</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
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
    const acc = Account.createFromPrivateKey(k, AppState.networkType);
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
const onSelectAddress = (address: string) => {
  selectedAddress.value = address;
  refreshAccountDetails();
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

onMounted(() => {
  generateEphemeralAccount();
  const defaultAcc = walletState.currentLoggedInWallet?.selectDefaultAccount();
  if (defaultAcc) {
    selectedAddress.value = defaultAcc.address;
    selectedPublicKey.value = defaultAcc.publicKey;
    refreshAccountDetails();
  }
});
</script>
