<template>
  <TransactionLayout class="mt-8">
    <template #white>
      <div class="flex items-center justify-between mb-6">
        <div class="font-semibold text-sm md:text-base text-gray-800">
          Delegated Staking
        </div>
        <div class="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span>&check;</span>
          <span>100% Non-Custodial</span>
        </div>
      </div>

      <!-- Overview Info Callout -->
      <div class="mb-8 p-4 bg-white border border-gray-200 rounded text-xs text-gray-600 leading-relaxed">
        Stake ≥ 100k {{ nativeTokenName }} with a community validator to earn block rewards directly into your wallet.
      </div>

      <div class="space-y-8">
        <!-- Step 1: Account & Stake -->
        <div class="border border-gray-200 rounded p-6 bg-white shadow-sm space-y-4">
          <div class="text-xs font-bold text-gray-800 flex items-center justify-between">
            <span class="uppercase tracking-wider">1. Account & Stake</span>
            <span v-if="accountBalance >= 100000" class="text-xs text-gray-600 font-medium flex items-center gap-1">
              <span>&check;</span>
              <span>Eligible ({{ formatNumber(accountBalance) }} {{ nativeTokenName }})</span>
            </span>
            <span v-else class="text-xs text-red-600 font-medium">
              Below 100k {{ nativeTokenName }} Minimum
            </span>
          </div>

          <SelectInputAccount 
            :type="'dynamic'" 
            :label="'Harvester Account'" 
            @select-account="onSelectAddress" 
            @select-account-public-key="onSelectPublicKey" 
          />

          <div class="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded border border-gray-200">
            <div>
              <span class="text-gray-500 text-xxs uppercase tracking-wider block">Balance</span>
              <div class="font-bold text-gray-800 mt-0.5">{{ formatNumber(accountBalance) }} {{ nativeTokenName }}</div>
            </div>
            <div>
              <span class="text-gray-500 text-xxs uppercase tracking-wider block">Min. Required</span>
              <div class="font-bold text-gray-800 mt-0.5">100,000 {{ nativeTokenName }}</div>
            </div>
          </div>

          <div v-if="isMaturing" class="p-3 bg-white border border-gray-200 rounded text-xs text-gray-600">
            Recent deposits mature over ~24h (5,760 blocks) before harvester registration unlocks.
          </div>

          <div v-if="isLinked && !isHarvesterRegistered" class="p-3 bg-white border border-gray-200 rounded text-xs text-gray-600 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span>&check;</span>
              <span>Account linked on-chain. Step 2 is complete — proceed to Step 3 to register as a harvester.</span>
            </div>
          </div>
        </div>

        <!-- Live Staking & Delegator Rewards Status Card -->
        <div v-if="isLinked || isHarvesterRegistered" class="border border-gray-200 rounded p-6 bg-white shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="text-xs font-bold text-gray-800 uppercase tracking-wider">
              Delegated Staking Dashboard
            </div>
            <span v-if="isHarvesterRegistered && isKeyHotloadedOnNode" class="text-xs text-gray-600 font-medium flex items-center gap-1">
              <span>&check;</span> Actively Harvesting
            </span>
            <span v-else-if="isHarvesterRegistered" class="text-xs text-gray-600 font-medium flex items-center gap-1">
              <span>&check;</span> Registered Harvester
            </span>
            <span v-else class="text-xs text-gray-500 font-medium">
              Key Linked (Pending Registration)
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="bg-gray-50 border border-gray-200 p-3 rounded">
              <span class="text-gray-500 text-xxs uppercase tracking-wider block">Staking Balance</span>
              <span class="font-bold text-gray-800 mt-0.5 block">{{ formatNumber(accountBalance) }} {{ nativeTokenName }}</span>
            </div>
            <div class="bg-gray-50 border border-gray-200 p-3 rounded">
              <span class="text-gray-500 text-xxs uppercase tracking-wider block">Last Signed Block</span>
              <span class="font-mono font-bold text-gray-800 mt-0.5 block">
                {{ lastSignedBlockHeight > 0 ? '#' + formatNumber(lastSignedBlockHeight) : '—' }}
              </span>
            </div>
            <div class="bg-gray-50 border border-gray-200 p-3 rounded">
              <span class="text-gray-500 text-xxs uppercase tracking-wider block">Connected Node</span>
              <span class="font-semibold text-gray-800 truncate mt-0.5 block" :title="targetNodeUrl">
                {{ isKeyHotloadedOnNode ? (selectedValidator ? selectedValidator.name : 'Connected') : 'Awaiting Step 4' }}
              </span>
            </div>
          </div>

          <!-- Deactivation / Revoke Quick Action -->
          <div v-if="isLinked" class="pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
            <span class="text-gray-500 text-xxs">Need to change validator or reclaim funds?</span>
            <button
              type="button"
              @click="deactivateAndUnlink"
              :disabled="isDeactivating"
              class="text-xs text-red-600 hover:underline font-semibold transition cursor-pointer flex items-center gap-1 bg-transparent p-0 border-0"
            >
              <span>{{ isDeactivating ? 'Deactivating...' : 'Deactivate & Stop Delegating' }}</span>
            </button>
          </div>
        </div>

        <!-- Step 2: Link Remote Key -->
        <div class="border border-gray-200 rounded p-6 bg-white shadow-sm space-y-4">
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-bold text-gray-800 uppercase tracking-wider">2. Link Remote Key</div>
            <span v-if="isLinked" class="text-xs text-gray-600 font-medium flex items-center gap-1">
              <span>&check;</span> Linked
            </span>
            <span v-else class="text-xs text-gray-400 font-medium">
              Not Linked
            </span>
          </div>

          <!-- If already linked -->
          <div v-if="isLinked" class="space-y-4">
            <div class="bg-gray-50 border border-gray-200 p-3 rounded text-xs">
              <span class="text-gray-500 block text-xxs uppercase tracking-wider font-semibold">Linked Remote Public Key (On-Chain)</span>
              <div class="font-mono text-xs break-all text-gray-800 font-semibold mt-1">
                {{ linkedRemotePubKey }}
              </div>
            </div>

            <!-- Private Key Backup Box (Only shown if key matches on-chain linkedRemotePubKey) -->
            <div v-if="activeOrSavedPrivateKey" class="p-4 bg-white border border-gray-200 rounded text-xs space-y-3">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-700 text-xxs uppercase tracking-wider">
                  Remote Private Key (Verified)
                </span>
                <div class="flex items-center gap-2">
                  <button 
                    type="button" 
                    @click="copyKey(activeOrSavedPrivateKey)" 
                    class="text-xxs text-blue-link hover:underline font-semibold cursor-pointer"
                  >
                    Copy Key
                  </button>
                  <span class="text-gray-300">|</span>
                  <button 
                    type="button" 
                    @click="downloadBackupFile" 
                    class="text-xxs text-blue-link hover:underline font-semibold cursor-pointer"
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
                  class="w-full bg-gray-50 border border-gray-200 rounded p-2 font-mono text-xs text-gray-800 pr-12 focus:outline-none"
                />
                <font-awesome-icon 
                  :icon="showStep2PrivKey ? 'eye-slash' : 'eye'" 
                  :title="showStep2PrivKey ? 'Hide Private Key' : 'Reveal Private Key'" 
                  class="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer text-xs" 
                  @click="showStep2PrivKey = !showStep2PrivKey"
                />
              </div>

              <p class="text-xxs text-gray-500">
                &check; Verified against your on-chain linked key. Keep it saved for node delegation.
              </p>
            </div>

            <!-- If the private key is stored encrypted in localStorage and locked -->
            <div v-else-if="hasStoredEncryptedKey" class="p-4 bg-white border border-gray-200 rounded text-xs space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-700 text-xxs uppercase tracking-wider">
                  Encrypted Remote Key Saved in Storage
                </span>
                <button 
                  type="button" 
                  @click="openPasswordModal('unlock')" 
                  class="text-xxs text-blue-link hover:underline font-semibold cursor-pointer"
                >
                  Unlock with Password
                </button>
              </div>
              <p class="text-xxs text-gray-500">
                Your remote harvesting private key is safely encrypted in browser storage using your wallet password.
              </p>
            </div>

            <!-- If the private key is not yet restored in this browser session -->
            <div v-else class="p-4 bg-white border border-gray-200 rounded text-xs space-y-3">
              <div class="font-semibold text-gray-700 text-xxs uppercase tracking-wider">
                Enter Your Saved Remote Private Key
              </div>
              <p class="text-xxs text-gray-500">
                This account was linked previously on-chain. Paste the 64-character remote private key you saved to restore it:
              </p>
              <div class="relative">
                <input 
                  :type="showStep2PrivKey ? 'text' : 'password'" 
                  v-model="restoredPrivateKeyInput" 
                  placeholder="Paste your 64-character saved remote private key" 
                  class="w-full bg-gray-50 border border-gray-200 rounded p-2 font-mono text-xs text-gray-800 pr-12 focus:outline-none"
                />
                <font-awesome-icon 
                  :icon="showStep2PrivKey ? 'eye-slash' : 'eye'" 
                  :title="showStep2PrivKey ? 'Hide Private Key' : 'Reveal Private Key'" 
                  class="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer text-xs" 
                  @click="showStep2PrivKey = !showStep2PrivKey"
                />
              </div>
              <div v-if="restoredKeyMismatch" class="text-xxs text-red-600 font-semibold">
                Entered private key does not derive to the on-chain linked public key.
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-gray-200">
              <span class="text-xs text-gray-600 font-medium">
                &check; Linked on Sirius Mainnet
              </span>
              <button 
                type="button"
                @click="broadcastUnlink" 
                class="text-xs text-red-600 hover:underline font-semibold cursor-pointer bg-transparent border-0 p-0"
              >
                Unlink
              </button>
            </div>
          </div>

          <!-- If not linked -->
          <div v-else class="space-y-4">
            <div class="bg-gray-50 border border-gray-200 p-3 rounded text-xs space-y-2">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-gray-500 font-semibold text-xxs uppercase tracking-wider">Remote Private Key (Required for Step 4)</span>
                  <div class="flex items-center gap-2">
                    <button 
                      type="button" 
                      @click="copyKey(ephemeralAccount?.privateKey || '')" 
                      class="text-xxs text-blue-link hover:underline font-semibold cursor-pointer"
                    >
                      Copy
                    </button>
                    <span class="text-gray-300">|</span>
                    <button 
                      type="button" 
                      @click="downloadBackupFile" 
                      class="text-xxs text-blue-link hover:underline font-semibold cursor-pointer"
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
                    class="w-full bg-white border border-gray-200 rounded p-2 font-mono text-xs text-gray-800 pr-12 focus:outline-none"
                  />
                  <font-awesome-icon 
                    :icon="showStep2PrivKey ? 'eye-slash' : 'eye'" 
                    :title="showStep2PrivKey ? 'Hide Private Key' : 'Reveal Private Key'" 
                    class="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer text-xs" 
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
          class="rounded p-6 shadow-sm transition-all duration-200 border space-y-4"
          :class="!isLinked 
            ? 'bg-gray-50 border-gray-200 opacity-60' 
            : 'bg-white border-gray-200'"
        >
          <div class="flex items-center justify-between mb-1">
            <div class="text-xs font-bold uppercase tracking-wider" :class="!isLinked ? 'text-gray-400' : 'text-gray-800'">
              3. Register Harvester
            </div>
            <span v-if="isHarvesterRegistered" class="text-xs text-gray-600 font-medium flex items-center gap-1">
              <span>&check;</span> Registered
            </span>
            <span v-else-if="!isLinked" class="text-xs text-gray-400 font-medium">
              Locked (Step 2 Pending)
            </span>
            <span v-else class="text-xs text-blue-primary font-medium">
              Ready to Register
            </span>
          </div>

          <!-- If already registered -->
          <div v-if="isHarvesterRegistered" class="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700 flex items-center gap-2">
            <span class="text-gray-500 font-bold">&check;</span>
            <span>Registered in Harvester Committee</span>
          </div>

          <!-- If locked because linking is not done -->
          <div v-else-if="!isLinked" class="space-y-3">
            <div class="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-500 flex items-center gap-2">
              <span class="text-xs">🔒</span>
              <span>Account must be linked in Step 2 before registering as a harvester.</span>
            </div>
            <button 
              type="button" 
              disabled 
              class="w-full py-3 text-xs font-semibold text-gray-400 bg-gray-100 border border-gray-200 rounded cursor-not-allowed"
            >
              Register Harvester (Locked)
            </button>
          </div>

          <!-- If linked and ready to register -->
          <div v-else class="space-y-3">
            <div class="p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
              Account key is linked on-chain. Register below to participate in block harvesting.
            </div>
            <button 
              type="button" 
              @click="broadcastAddHarvester" 
              class="w-full blue-btn py-3 text-xs font-semibold text-white rounded shadow-sm cursor-pointer"
              :disabled="accountBalance < 100000"
            >
              Register Harvester
            </button>
            <div v-if="accountBalance < 100000" class="text-xxs text-red-600 text-center font-medium">
              Requires min. 100,000 {{ nativeTokenName }} stake.
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #navy>
      <div class="text-white space-y-4">
        <div class="font-bold text-xs text-blue-primary uppercase pb-3 border-b border-navy-lighter tracking-wider">
          4. Activate on Validator Node
        </div>

        <!-- Prerequisites Checklist -->
        <div class="p-3 bg-navy-lighter/30 border border-navy-lighter/60 rounded text-xs space-y-2">
          <div class="font-bold text-gray-200 flex items-center justify-between pb-1.5 border-b border-navy-lighter/50">
            <span>Prerequisites</span>
            <span v-if="canActivateOnNode" class="text-xxs text-gray-300 font-medium">&check; Ready</span>
            <span v-else class="text-xxs text-gray-400 font-medium">Pending</span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-300">Stake (≥ 100k {{ nativeTokenName }}):</span>
            <span v-if="hasMinimumBalance" class="text-gray-200 font-semibold">
              &check; {{ formatNumber(accountBalance) }}
            </span>
            <span v-else class="text-red-400 font-semibold">
              ✗ {{ formatNumber(accountBalance) }}
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-300">Key Linked (Step 2):</span>
            <span v-if="isLinked" class="text-gray-200 font-semibold">
              &check; Linked
            </span>
            <span v-else class="text-gray-400 font-semibold">
              ✗ Not Linked
            </span>
          </div>

          <div class="flex items-center justify-between">
            <span class="text-gray-300">Harvester (Step 3):</span>
            <span v-if="isHarvesterRegistered" class="text-gray-200 font-semibold">
              &check; Registered
            </span>
            <span v-else class="text-gray-400 font-semibold">
              ✗ Pending
            </span>
          </div>

          <div v-if="remotePrivateKeyInput.trim()" class="flex items-center justify-between pt-1 border-t border-navy-lighter/50">
            <span class="text-gray-300">Key Matches:</span>
            <span v-if="isLinked && isKeyMatchingLinked" class="text-gray-200 font-semibold">
              &check; Matches
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
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-gray-200">Validator Node</label>
            <button 
              type="button" 
              @click="refreshValidators" 
              :disabled="isDiscoveringNodes" 
              class="text-xxs text-blue-link hover:underline flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
              title="Refresh and probe candidate validator nodes"
            >
              <font-awesome-icon icon="sync-alt" :class="{ 'fa-spin': isDiscoveringNodes }" class="text-xxs" />
              <span>{{ isDiscoveringNodes ? 'Scanning...' : 'Refresh Nodes' }}</span>
            </button>
          </div>

          <select 
            v-model="selectedValidatorId" 
            class="w-full bg-navy-lighter/40 text-white border border-navy-lighter rounded p-2 text-xs font-medium focus:border-blue-primary focus:outline-none"
          >
            <option v-if="isDiscoveringNodes && discoveredValidators.length === 0" disabled value="" class="bg-navy-primary text-white">
              Scanning network for validators...
            </option>
            <option 
              v-for="val in discoveredValidators" 
              :key="val.id" 
              :value="val.id"
              :disabled="!val.eligible && !val.isDefault"
              class="bg-navy-primary text-white"
            >
              {{ val.name }} ({{ val.pingMs }}ms, {{ val.activeSlots }}/{{ val.maxSlots }} slots){{ !val.eligible ? ' - ' + (val.statusReason || 'Ineligible') : '' }}
            </option>
            <option value="custom" class="bg-navy-primary text-white">Custom Node...</option>
          </select>

          <!-- Selected Node Info Card -->
          <div v-if="selectedValidator && selectedValidatorId !== 'custom'" class="mt-1.5 p-2.5 bg-navy-lighter/30 rounded border border-navy-lighter/60 text-xxs space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Endpoint:</span>
              <span class="font-mono text-gray-200 font-semibold">{{ selectedValidator.endpoint }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Roundtrip Latency:</span>
              <span class="text-gray-200 font-semibold">{{ selectedValidator.pingMs }} ms</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Harvesting Pool Slots:</span>
              <span class="text-gray-200 font-semibold">
                {{ selectedValidator.activeSlots }} / {{ selectedValidator.maxSlots }} harvesters
              </span>
            </div>
            <div class="flex items-center justify-between pt-1 border-t border-navy-lighter/40">
              <span class="text-gray-300">Capabilities:</span>
              <div class="flex items-center gap-2 text-gray-300 text-3xs font-medium">
                <span v-if="selectedValidator.features.includes('fast_finality')">&check; Finality</span>
                <span v-if="selectedValidator.features.includes('delegated_harvesting_hotload')">&check; Hotload</span>
                <span v-else class="text-gray-400">Standard</span>
              </div>
            </div>
          </div>

          <div v-if="selectedValidatorId === 'custom'" class="mt-1 space-y-1">
            <div class="flex gap-2">
              <input 
                type="text" 
                v-model="customNodeUrl" 
                placeholder="http://node-ip:8080" 
                class="flex-1 bg-navy-lighter/40 text-white border border-navy-lighter rounded p-2 text-xs font-mono placeholder-gray-400 focus:border-blue-primary focus:outline-none"
              />
              <button 
                type="button" 
                @click="probeCustomNode" 
                :disabled="isProbingCustom"
                class="px-3 py-1 bg-blue-primary hover:bg-blue-600 text-white rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {{ isProbingCustom ? 'Testing...' : 'Test' }}
              </button>
            </div>
            <div v-if="customProbeResult" class="text-xxs p-2 rounded" :class="customProbeResult.eligible ? 'bg-navy-lighter/30 text-gray-200 border border-navy-lighter/60' : 'bg-red-950/40 text-red-300 border border-red-500/40'">
              {{ customProbeResult.eligible ? `✓ Connected (${customProbeResult.pingMs}ms, ${customProbeResult.activeSlots}/${customProbeResult.maxSlots} slots)` : `✗ ${customProbeResult.statusReason || 'Connection failed'}` }}
            </div>
          </div>
        </div>

        <!-- Remote Private Key Input -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-gray-200">
              Remote Private Key (64-char Hex)
            </label>
            <span v-if="isLinked && isKeyMatchingLinked" class="text-xxs text-gray-300 font-medium">
              &check; Matches
            </span>
          </div>
          <div class="relative">
            <input 
              :type="showKey ? 'text' : 'password'" 
              v-model="remotePrivateKeyInput" 
              placeholder="64-character remote key" 
              class="w-full bg-navy-lighter/40 text-white border border-navy-lighter rounded p-2 text-xs font-mono pr-10 placeholder-gray-400 focus:border-blue-primary focus:outline-none"
            />
            <font-awesome-icon 
              :icon="showKey ? 'eye-slash' : 'eye'" 
              :title="showKey ? 'Hide Private Key' : 'Show Private Key'" 
              class="absolute right-3 top-2.5 text-gray-400 hover:text-white cursor-pointer text-xs" 
              @click="showKey = !showKey"
            />
          </div>
        </div>

        <!-- Action Button (Matching ViewHarvesterTxn.vue blue-btn style) -->
        <button 
          type="button"
          @click="submitKeyToNode" 
          :disabled="!canActivateOnNode || isSubmitting" 
          class="mt-3 w-full blue-btn py-4 disabled:opacity-50 disabled:cursor-auto text-white text-xs font-semibold cursor-pointer uppercase tracking-wider"
        >
          <span v-if="isSubmitting">Connecting to Node...</span>
          <span v-else-if="!hasMinimumBalance">Cannot Activate: Balance &lt; 100k {{ nativeTokenName }}</span>
          <span v-else-if="!isLinked">Cannot Activate: Not Linked</span>
          <span v-else-if="!isHarvesterRegistered">Cannot Activate: Not Registered</span>
          <span v-else-if="!isKeyMatchingLinked">Cannot Activate: Key Mismatch</span>
          <span v-else-if="selectedValidator && !selectedValidator.eligible">Cannot Activate: {{ selectedValidator.statusReason }}</span>
          <span v-else>Activate on Validator Node &rarr;</span>
        </button>

        <!-- Result Message Box -->
        <div v-if="nodeMessage" class="p-3 rounded text-xs space-y-1" :class="nodeSuccess ? 'bg-navy-lighter/40 border border-navy-lighter text-gray-200' : 'bg-red-950/40 border border-red-500/60 text-red-200'">
          <div class="font-bold">{{ nodeSuccess ? 'Success' : 'Error' }}</div>
          <div>{{ nodeMessage }}</div>
        </div>

        <!-- Node Connected Status -->
        <div class="mt-4 pt-3 border-t border-navy-lighter flex items-center justify-between text-xs text-gray-300">
          <span class="text-gray-400">Target Node:</span>
          <span class="font-mono text-gray-200 truncate ml-2 text-right">{{ targetNodeUrl }}</span>
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
import {
  ValidatorDiscoveryService,
  type VerifiedValidator,
} from "../services/ValidatorDiscoveryService";

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

// Dynamic Node delegation & discovery state
const isDiscoveringNodes = ref<boolean>(false);
const discoveredValidators = ref<VerifiedValidator[]>([]);
const selectedValidatorId = ref<string>("default-local-node");
const customNodeUrl = ref<string>("http://localhost:8080");
const isProbingCustom = ref<boolean>(false);
const customProbeResult = ref<VerifiedValidator | null>(null);

const isDeactivating = ref<boolean>(false);
const isKeyHotloadedOnNode = ref<boolean>(false);
const lastSignedBlockHeight = ref<number>(0);

const checkNodeHotloadStatus = async () => {
  if (!targetNodeUrl.value) return;
  try {
    const res = await fetch(`${targetNodeUrl.value}/api/harvesting/delegated/list`);
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list)) {
        const targetPub = linkedRemotePubKey.value.toUpperCase();
        isKeyHotloadedOnNode.value = list.some(
          (k: any) =>
            (k.harvesterPublicKey && k.harvesterPublicKey.toUpperCase() === targetPub) ||
            (k.fileName && selectedAddress.value && k.fileName.includes(selectedAddress.value))
        );
      }
    }
  } catch {
    isKeyHotloadedOnNode.value = false;
  }
};

const deactivateAndUnlink = async () => {
  if (
    !confirm(
      "Are you sure you want to stop delegated staking? This will remove your remote key from the validator node and prompt an on-chain Unlink transaction."
    )
  ) {
    return;
  }
  isDeactivating.value = true;
  try {
    const safeName = selectedAddress.value || linkedRemotePubKey.value;
    if (safeName && targetNodeUrl.value) {
      try {
        await fetch(`${targetNodeUrl.value}/api/harvesting/delegated/remove`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: safeName + ".key" }),
        });
      } catch (nodeErr) {
        console.warn("Failed to remove key from validator node:", nodeErr);
      }
    }

    isKeyHotloadedOnNode.value = false;
    toast.add({
      severity: "info",
      summary: "Node Key Removed",
      detail: "Remote key removed from validator node. Now initiating on-chain Unlink...",
      life: 4000,
    });

    broadcastUnlink();
  } catch (err: any) {
    console.error("Deactivation error:", err);
  } finally {
    isDeactivating.value = false;
  }
};

const refreshValidators = async () => {
  isDiscoveringNodes.value = true;
  try {
    const list = await ValidatorDiscoveryService.discoverAndProbeAll();
    discoveredValidators.value = list;
    if (selectedValidatorId.value !== "custom") {
      const match = list.find((v) => v.id === selectedValidatorId.value);
      if (!match) {
        const firstEligible = list.find((v) => v.eligible) || list[0];
        if (firstEligible) {
          selectedValidatorId.value = firstEligible.id;
        }
      }
    }
  } catch (err) {
    console.error("Failed to discover validator nodes:", err);
  } finally {
    isDiscoveringNodes.value = false;
  }
};

const probeCustomNode = async () => {
  if (!customNodeUrl.value.trim()) return;
  isProbingCustom.value = true;
  try {
    const res = await ValidatorDiscoveryService.probeValidatorHealth({
      id: "custom",
      name: "Custom Node",
      endpoint: customNodeUrl.value.trim(),
    });
    customProbeResult.value = res;
  } catch (err) {
    console.error("Failed to probe custom node:", err);
  } finally {
    isProbingCustom.value = false;
  }
};

const selectedValidator = computed(() => {
  if (selectedValidatorId.value === "custom") return null;
  return discoveredValidators.value.find((v) => v.id === selectedValidatorId.value) || null;
});

const targetNodeUrl = computed(() => {
  if (selectedValidatorId.value === "custom") {
    return customNodeUrl.value.trim().replace(/\/+$/, "");
  }
  return selectedValidator.value?.endpoint || "http://localhost:8080";
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
  const isTargetEligible =
    selectedValidatorId.value === "custom"
      ? (customProbeResult.value ? customProbeResult.value.eligible : true)
      : (selectedValidator.value ? selectedValidator.value.eligible : true);

  return (
    isTargetEligible &&
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
    const accSnapshots = (accInfo as any).snapshots;
    if (accSnapshots && accSnapshots.length > 0) {
      const hasZero = accSnapshots.some(
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
        if (harvInfo && harvInfo.length > 0) {
          const first = harvInfo[0];
          lastSignedBlockHeight.value = first.lastSigningBlockHeight ? first.lastSigningBlockHeight.compact() : 0;
        } else {
          lastSignedBlockHeight.value = 0;
        }
      } catch {
        isHarvesterRegistered.value = false;
        lastSignedBlockHeight.value = 0;
      }
    }
    await checkNodeHotloadStatus();
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
      isKeyHotloadedOnNode.value = true;
      toast.add({
        severity: "success",
        summary: "Node Connected",
        detail: "Delegated harvester key activated on validator node!",
        life: 5000,
      });
      refreshValidators();
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
  refreshValidators();
});
</script>
