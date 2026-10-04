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

            <!-- Private Key Backup Box (Only shown if key matches on-chain linkedRemotePubKey) -->
            <div v-if="activeOrSavedPrivateKey" class="p-3 bg-orange-light border border-orange-primary/30 rounded text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-orange-primary flex items-center gap-1">
                  🔑 Remote Private Key (Verified)
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
                <font-awesome-icon 
                  :icon="showStep2PrivKey ? 'eye-slash' : 'eye'" 
                  :title="showStep2PrivKey ? 'Hide Private Key' : 'Reveal Private Key'" 
                  class="absolute right-3 top-2.5 text-orange-primary hover:text-orange-action cursor-pointer text-xs" 
                  @click="showStep2PrivKey = !showStep2PrivKey"
                />
              </div>

              <p class="text-xxs text-gray-600">
                ✓ <strong>This private key is verified</strong> against your on-chain linked key. Keep it saved for node delegation.
              </p>
            </div>

            <!-- If the private key is stored encrypted in localStorage and locked -->
            <div v-else-if="hasStoredEncryptedKey" class="p-3 bg-blue-50 border border-blue-200 rounded text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-blue-900 flex items-center gap-1.5">
                  <font-awesome-icon icon="lock" class="text-blue-600" />
                  Encrypted Remote Key Saved in Storage
                </span>
                <button 
                  type="button" 
                  @click="openPasswordModal('unlock')" 
                  class="px-2.5 py-1 bg-blue-primary hover:bg-blue-600 text-white rounded text-xxs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <font-awesome-icon icon="key" class="text-xxs" />
                  Unlock with Password
                </button>
              </div>
              <p class="text-xxs text-blue-800">
                Your remote harvesting private key is safely encrypted in browser storage using your wallet password. Click unlock to view or delegate.
              </p>
            </div>

            <!-- If the private key is not yet restored in this browser session -->
            <div v-else class="p-3 bg-amber-50 border border-amber-300 rounded text-xs space-y-2">
              <div class="font-bold text-amber-900 flex items-center justify-between">
                <span>🔑 Enter Your Saved Remote Private Key</span>
              </div>
              <p class="text-xxs text-amber-800">
                This account was linked previously on-chain. Paste the 64-character remote private key you saved to restore it for this session:
              </p>
              <div class="relative">
                <input 
                  :type="showStep2PrivKey ? 'text' : 'password'" 
                  v-model="restoredPrivateKeyInput" 
                  placeholder="Paste your 64-character saved remote private key" 
                  class="w-full bg-white border border-amber-300 rounded p-1.5 font-mono text-xs text-gray-800 pr-12 focus:outline-none"
                />
                <font-awesome-icon 
                  :icon="showStep2PrivKey ? 'eye-slash' : 'eye'" 
                  :title="showStep2PrivKey ? 'Hide Private Key' : 'Reveal Private Key'" 
                  class="absolute right-3 top-2.5 text-amber-700 hover:text-amber-900 cursor-pointer text-xs" 
                  @click="showStep2PrivKey = !showStep2PrivKey"
                />
              </div>
              <div v-if="restoredKeyMismatch" class="text-xxs text-red-600 font-semibold">
                ✗ Entered private key does not derive to the on-chain linked public key.
              </div>
              <p class="text-xxs text-gray-500 pt-1 border-t border-amber-200">
                Lost your key? Click <strong>Unlink</strong> below to generate and link a new key pair.
              </p>
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
                  <font-awesome-icon 
                    :icon="showStep2PrivKey ? 'eye-slash' : 'eye'" 
                    :title="showStep2PrivKey ? 'Hide Private Key' : 'Reveal Private Key'" 
                    class="absolute right-3 top-2.5 text-blue-link hover:text-blue-primary cursor-pointer text-xs" 
                    @click="showStep2PrivKey = !showStep2PrivKey"
                  />
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
            <font-awesome-icon 
              :icon="showKey ? 'eye-slash' : 'eye'" 
              :title="showKey ? 'Hide Private Key' : 'Show Private Key'" 
              class="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer text-xs" 
              @click="showKey = !showKey"
            />
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

  <!-- Password Prompt Modal for Encrypt / Decrypt Remote Key -->
  <transition
    enter-active-class="animate__animated animate__fadeInDown"
    leave-active-class="animate__animated animate__fadeOutUp"
  >
    <div v-if="togglePasswordModal" class="popup-outer-lang fixed flex z-50">
      <div class="modal-popup-box">
        <div class="error error_box mb-3" v-if="passwordErr != ''">{{ passwordErr }}</div>
        <div class="text-center mt-2 text-xs font-semibold">{{ passwordModalTitle }}</div>
        <p class="text-center text-xxs text-gray-500 mt-1 px-2">{{ passwordModalDesc }}</p>
        <PasswordInput
          class="my-3"
          v-model="walletPasswdInput"
          :placeholder="$t('general.password')"
          :errorMessage="$t('general.passwordRequired')"
        />
        <button
          type="button"
          @click="onConfirmPasswordModal()"
          class="blue-btn font-semibold py-2 cursor-pointer text-center ml-auto mr-auto w-7/12 disabled:opacity-50 disabled:cursor-auto block"
          :disabled="!walletPasswdInput || walletPasswdInput.length < 8"
        >
          {{ passwordModalActionText }}
        </button>
        <div
          class="text-center cursor-pointer text-xs font-semibold text-blue-link mt-2"
          @click="closePasswordModal()"
        >
          {{ $t('general.cancel') }}
        </div>
      </div>
    </div>
  </transition>
  <div
    @click="closePasswordModal()"
    v-if="togglePasswordModal"
    class="fixed inset-0 bg-opacity-60 bg-gray-100 z-20"
  ></div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import { useI18n } from "vue-i18n";
import TransactionLayout from "@/components/TransactionLayout.vue";
import SelectInputAccount from "@/components/SelectInputAccount.vue";
import PasswordInput from "@/components/PasswordInput.vue";
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
  Crypto,
  Password,
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
const remotePrivateKeyInput = ref<string>("");

const isValidForLinkedKey = (privHex: string): boolean => {
  if (!privHex || !/^[0-9a-fA-F]{64}$/.test(privHex)) return false;
  if (!linkedRemotePubKey.value || linkedRemotePubKey.value === "0".repeat(64)) return false;
  try {
    const acc = Account.createFromPrivateKey(privHex, AppState.networkType || 184, 1);
    return acc.publicKey.toUpperCase() === linkedRemotePubKey.value.toUpperCase();
  } catch {
    return false;
  }
};

interface EncryptedRemoteKeyData {
  algo: string; // "pass:bip32"
  encrypted: string;
  iv: string;
}

const currentSessionPassword = ref<string>("");
const unlockedPrivateKey = ref<string>("");
const hasStoredEncryptedKey = ref<boolean>(false);

// Modal state
const togglePasswordModal = ref<boolean>(false);
const walletPasswdInput = ref<string>("");
const passwordErr = ref<string>("");
const passwordModalAction = ref<"unlock" | "link" | "saveRestored" | "unlockAndSubmit">("unlock");
const passwordModalTitle = ref<string>("");
const passwordModalDesc = ref<string>("");
const passwordModalActionText = ref<string>("");

const getStoredRemoteKeyRecord = (
  keyIdentifier: string
): { type: "encrypted"; data: EncryptedRemoteKeyData } | { type: "plain"; key: string } | null => {
  if (!keyIdentifier) return null;
  try {
    const raw = localStorage.getItem("sirius_remote_key_" + keyIdentifier);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.encrypted && parsed.iv) {
        return { type: "encrypted", data: parsed };
      }
    } catch {
      if (/^[0-9a-fA-F]{64}$/.test(raw.trim())) {
        return { type: "plain", key: raw.trim() };
      }
    }
  } catch {}
  return null;
};

const saveEncryptedRemoteKey = (
  keyIdentifier: string,
  privateKeyHex: string,
  passwordStr: string
) => {
  if (!keyIdentifier || !privateKeyHex || !passwordStr) return;
  try {
    const enc = Crypto.encodePrivateKey(privateKeyHex, passwordStr);
    const payload: EncryptedRemoteKeyData = {
      algo: "pass:bip32",
      encrypted: enc.ciphertext,
      iv: enc.iv,
    };
    localStorage.setItem("sirius_remote_key_" + keyIdentifier, JSON.stringify(payload));
  } catch (err) {
    console.error("Failed to encrypt remote key for storage:", err);
  }
};

const decryptStoredRecord = (record: EncryptedRemoteKeyData, passwordStr: string): string => {
  try {
    const common = { password: passwordStr, privateKey: "" };
    const wallet = { encrypted: record.encrypted, iv: record.iv };
    Crypto.passwordToPrivateKey(common, wallet, 1); // Pass_bip32
    return common.privateKey || "";
  } catch {
    return "";
  }
};

const openPasswordModal = (action: "unlock" | "link" | "saveRestored" | "unlockAndSubmit") => {
  passwordModalAction.value = action;
  walletPasswdInput.value = "";
  passwordErr.value = "";

  if (action === "unlock") {
    passwordModalTitle.value = "Unlock Remote Harvesting Key";
    passwordModalDesc.value = "Enter your wallet password to decrypt your saved remote private key.";
    passwordModalActionText.value = "Unlock Key";
  } else if (action === "unlockAndSubmit") {
    passwordModalTitle.value = "Unlock Remote Key for Delegation";
    passwordModalDesc.value = "Enter your wallet password to decrypt your remote key and activate on the node.";
    passwordModalActionText.value = "Unlock & Delegate";
  } else if (action === "link") {
    passwordModalTitle.value = "Encrypt & Save Remote Key";
    passwordModalDesc.value = "Enter your wallet password to encrypt your newly generated remote key before linking.";
    passwordModalActionText.value = "Encrypt & Link Account";
  } else if (action === "saveRestored") {
    passwordModalTitle.value = "Encrypt & Save Restored Key";
    passwordModalDesc.value = "Enter your wallet password to encrypt your restored remote key into browser storage.";
    passwordModalActionText.value = "Encrypt & Save Key";
  }
  togglePasswordModal.value = true;
};

const closePasswordModal = () => {
  togglePasswordModal.value = false;
  walletPasswdInput.value = "";
  passwordErr.value = "";
};

const onConfirmPasswordModal = async () => {
  if (!walletPasswdInput.value || walletPasswdInput.value.length < 8) {
    passwordErr.value = "Password must be at least 8 characters.";
    return;
  }

  const walletName = walletState.currentLoggedInWallet?.name || "";
  const netName = networkState.chainNetworkName;
  if (!WalletUtils.verifyWalletPassword(walletName, netName, walletPasswdInput.value)) {
    passwordErr.value = t("general.walletPasswordInvalid", { name: walletName });
    return;
  }

  currentSessionPassword.value = walletPasswdInput.value;

  if (passwordModalAction.value === "unlock" || passwordModalAction.value === "unlockAndSubmit") {
    const record =
      getStoredRemoteKeyRecord(selectedAddress.value) ||
      getStoredRemoteKeyRecord(linkedRemotePubKey.value);

    if (record && record.type === "encrypted") {
      const dec = decryptStoredRecord(record.data, walletPasswdInput.value);
      if (dec && isValidForLinkedKey(dec)) {
        unlockedPrivateKey.value = dec;
        remotePrivateKeyInput.value = dec;
        restoredPrivateKeyInput.value = dec;
        closePasswordModal();
        toast.add({
          severity: "success",
          summary: "Key Decrypted",
          detail: "Remote private key successfully decrypted!",
          group: "br-custom",
          life: 3000,
        });

        if (passwordModalAction.value === "unlockAndSubmit") {
          await submitKeyToNode();
        }
      } else {
        passwordErr.value = "Decrypted key does not match the on-chain linked account.";
      }
    } else {
      closePasswordModal();
    }
  } else if (passwordModalAction.value === "link") {
    if (ephemeralAccount.value && selectedAddress.value) {
      saveEncryptedRemoteKey(
        selectedAddress.value,
        ephemeralAccount.value.privateKey,
        walletPasswdInput.value
      );
      unlockedPrivateKey.value = ephemeralAccount.value.privateKey;
      closePasswordModal();
      executeBroadcastLink();
    }
  } else if (passwordModalAction.value === "saveRestored") {
    const k = restoredPrivateKeyInput.value.trim();
    if (k && isValidForLinkedKey(k)) {
      if (selectedAddress.value) {
        saveEncryptedRemoteKey(selectedAddress.value, k, walletPasswdInput.value);
      }
      if (linkedRemotePubKey.value) {
        saveEncryptedRemoteKey(linkedRemotePubKey.value, k, walletPasswdInput.value);
      }
      unlockedPrivateKey.value = k;
      remotePrivateKeyInput.value = k;
      hasStoredEncryptedKey.value = true;
      closePasswordModal();
      toast.add({
        severity: "success",
        summary: "Key Encrypted & Saved",
        detail: "Remote key verified, encrypted, and saved to browser storage!",
        group: "br-custom",
        life: 3000,
      });
    }
  }
};

const restoredPrivateKeyInput = ref<string>("");

const restoredKeyMismatch = computed(() => {
  const k = restoredPrivateKeyInput.value.trim();
  if (!k) return false;
  if (!/^[0-9a-fA-F]{64}$/.test(k)) return true;
  return !isValidForLinkedKey(k);
});

watch(restoredPrivateKeyInput, (newVal) => {
  const k = newVal.trim();
  if (k && isValidForLinkedKey(k)) {
    remotePrivateKeyInput.value = k;
    unlockedPrivateKey.value = k;
    if (currentSessionPassword.value && selectedAddress.value) {
      saveEncryptedRemoteKey(selectedAddress.value, k, currentSessionPassword.value);
      if (linkedRemotePubKey.value) {
        saveEncryptedRemoteKey(linkedRemotePubKey.value, k, currentSessionPassword.value);
      }
      hasStoredEncryptedKey.value = true;
      toast.add({
        severity: "success",
        summary: "Key Encrypted & Saved",
        detail: "Remote private key verified and encrypted in local storage!",
        group: "br-custom",
        life: 3000,
      });
    } else {
      openPasswordModal("saveRestored");
    }
  }
});

const activeOrSavedPrivateKey = computed(() => {
  if (isLinked.value) {
    if (unlockedPrivateKey.value && isValidForLinkedKey(unlockedPrivateKey.value.trim())) {
      return unlockedPrivateKey.value.trim();
    }
    if (restoredPrivateKeyInput.value && isValidForLinkedKey(restoredPrivateKeyInput.value.trim())) {
      return restoredPrivateKeyInput.value.trim();
    }
    if (remotePrivateKeyInput.value && isValidForLinkedKey(remotePrivateKeyInput.value.trim())) {
      return remotePrivateKeyInput.value.trim();
    }
    // Never return an unverified random key when linked
    return "";
  }

  return ephemeralAccount.value?.privateKey || "";
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

watch(remotePrivateKeyInput, (newVal) => {
  const k = newVal.trim();
  if (isLinked.value && isValidForLinkedKey(k) && currentSessionPassword.value) {
    if (selectedAddress.value) {
      saveEncryptedRemoteKey(selectedAddress.value, k, currentSessionPassword.value);
    }
    if (linkedRemotePubKey.value) {
      saveEncryptedRemoteKey(linkedRemotePubKey.value, k, currentSessionPassword.value);
    }
    hasStoredEncryptedKey.value = true;
  }
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
    if (isLinked.value) {
      const record =
        getStoredRemoteKeyRecord(selectedAddress.value) ||
        getStoredRemoteKeyRecord(linkedRemotePubKey.value);

      if (record) {
        if (record.type === "encrypted") {
          hasStoredEncryptedKey.value = true;
          if (unlockedPrivateKey.value && isValidForLinkedKey(unlockedPrivateKey.value)) {
            remotePrivateKeyInput.value = unlockedPrivateKey.value;
            restoredPrivateKeyInput.value = unlockedPrivateKey.value;
          } else if (currentSessionPassword.value) {
            const dec = decryptStoredRecord(record.data, currentSessionPassword.value);
            if (dec && isValidForLinkedKey(dec)) {
              unlockedPrivateKey.value = dec;
              remotePrivateKeyInput.value = dec;
              restoredPrivateKeyInput.value = dec;
            } else {
              unlockedPrivateKey.value = "";
              remotePrivateKeyInput.value = "";
              restoredPrivateKeyInput.value = "";
            }
          } else {
            unlockedPrivateKey.value = "";
            remotePrivateKeyInput.value = "";
            restoredPrivateKeyInput.value = "";
          }
        } else if (record.type === "plain") {
          if (isValidForLinkedKey(record.key)) {
            unlockedPrivateKey.value = record.key;
            remotePrivateKeyInput.value = record.key;
            restoredPrivateKeyInput.value = record.key;
            if (currentSessionPassword.value) {
              saveEncryptedRemoteKey(selectedAddress.value, record.key, currentSessionPassword.value);
              if (linkedRemotePubKey.value) {
                saveEncryptedRemoteKey(linkedRemotePubKey.value, record.key, currentSessionPassword.value);
              }
              hasStoredEncryptedKey.value = true;
            }
          }
        }
      } else {
        hasStoredEncryptedKey.value = false;
        if (!unlockedPrivateKey.value || !isValidForLinkedKey(unlockedPrivateKey.value)) {
          unlockedPrivateKey.value = "";
          remotePrivateKeyInput.value = "";
          restoredPrivateKeyInput.value = "";
        }
      }
    } else {
      hasStoredEncryptedKey.value = false;
      unlockedPrivateKey.value = "";
      restoredPrivateKeyInput.value = "";
      if (!ephemeralAccount.value) {
        generateEphemeralAccount();
      }
      if (ephemeralAccount.value) {
        remotePrivateKeyInput.value = ephemeralAccount.value.privateKey;
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
  if (!ephemeralAccount.value || !selectedAddress.value) return;

  if (currentSessionPassword.value) {
    saveEncryptedRemoteKey(
      selectedAddress.value,
      ephemeralAccount.value.privateKey,
      currentSessionPassword.value
    );
    unlockedPrivateKey.value = ephemeralAccount.value.privateKey;
    hasStoredEncryptedKey.value = true;
    executeBroadcastLink();
  } else {
    openPasswordModal("link");
  }
};

const executeBroadcastLink = () => {
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
  if (hasStoredEncryptedKey.value && (!activeOrSavedPrivateKey.value || !unlockedPrivateKey.value)) {
    openPasswordModal("unlockAndSubmit");
    return;
  }

  const keyToUse = activeOrSavedPrivateKey.value || remotePrivateKeyInput.value.trim();
  if (!keyToUse || !isValidForLinkedKey(keyToUse)) return;

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

  if (!isKeyMatchingLinked.value && !isValidForLinkedKey(keyToUse)) {
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
        remotePrivateKey: keyToUse,
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
