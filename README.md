# ProximaX Sirius Web Wallet (Enhanced Community Edition)

A modern, fast, and non-custodial web wallet for the **ProximaX Sirius Blockchain**, enhanced with **1-Click Delegated Staking**, **Remote Validator Activation**, and automated community node discovery.

[![Deploy Web Wallet to GitHub Pages](https://github.com/igorgoc/web-wallet-vuejs/actions/workflows/deploy-gh-pages.yml/badge.svg)](https://github.com/igorgoc/web-wallet-vuejs/actions/workflows/deploy-gh-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## What's New in this Fork?

This forked edition extends the official ProximaX Web Wallet with native support for **Delegated Harvesting & Staking Pools**, allowing any user with **at least 100,000 XPX** to participate in POS+ network consensus and earn block rewards without running their own server infrastructure.

### Key Fork Highlights:

1. **1-Click Delegated Staking & Remote Validator Activation**:
   - **100% Non-Custodial & Safe**: Your XPX never leaves your wallet. You retain full control over your funds and private keys. Staking works by linking an ephemeral remote key pair on-chain (`AccountKeyLinkTransaction`).
   - **Minimum Stake Requirement**: Requires a minimum balance of **100,000 XPX** (enforced by the ProximaX Sirius network POS+ consensus protocol).
   - **Seamless Activation**: The wallet generates the remote key pair, links it on-chain, and securely transmits the encrypted key payload to your chosen community validator node in a single guided flow.
   - **Real-Time Status & Rewards**: Live tracking of remote harvester activation, node link confirmation, and harvested block rewards directly in the UI.

2. **Community Node Discovery & Pairing**:
   - Browse active community validator nodes running [ProximaX Sirius Core](https://github.com/igorgoc/proximax-sirius-core).
   - Inspect live block heights, network latency, and available delegation slots before connecting.
   - Custom node operator input support: pair with any private or community node by entering its public key or IP.

3. **Modernized Developer Architecture & CI/CD**:
   - Built on **Node.js 20** and **Vite** with strict TypeScript type-checking (`vue-tsc`).
   - Automated cryptographic test suites (`npm run test:unit`) verifying Ed25519 key links, encrypted payload serialization, and transaction signing.
   - Production performance budgets and benchmark verification (`npm run test:perf`).
   - Automated deployment pipeline to GitHub Pages with Content Security Policy (CSP) headers.

---

## Delegated Staking

### Prerequisites:
- A ProximaX Sirius account holding **at least 100,000 XPX** (minimum stake required for POS+ consensus eligibility).
- A reserve of **~50 XPX** to cover on-chain network transaction fees (account key linking, committee registration, and encrypted activation message).

### Step-by-Step Activation:
1. **Open Delegated Staking**:
   Log in to your wallet and navigate to **Services** → **Delegated Staking**.
2. **Step 1: Account & Stake**:
   Select your wallet account holding ≥ 100,000 XPX.  
   *(Note: Recent deposits mature over ~24 hours / 5,760 blocks before harvester committee registration unlocks).*
3. **Step 2: Link Remote Key**:
   The wallet automatically generates a dedicated remote harvesting key pair. Reveal, copy, or download a backup file (`.txt`) of this key, then click **Link Key** to broadcast the on-chain `AccountKeyLinkTransaction`.
4. **Step 3: Register Harvester**:
   Click **Register Harvester** to broadcast the on-chain `AddHarvesterTransaction` and register your account into the network's POS+ Harvester Committee.
5. **Step 4: Activate on Validator Node**:
   Select an active community node from the validator list (or enter the public key of a node running [ProximaX Sirius Core](https://github.com/igorgoc/proximax-sirius-core)). Unlock your remote key with your wallet password to send the encrypted activation message to the validator.
6. **Start Harvesting & Earn Rewards**:
   Within seconds, the validator node's dynamic hot-reloader (`v1.9.11+`) ingests your remote key without node downtime. Your dashboard will switch to **Actively Harvesting** with real-time tracking of signed blocks and earned fees.
7. **Stop or Change Validator Anytime**:
   Click **Deactivate & Stop Delegating** (or **Unlink** in Step 2) at any time to remove your key from the node and unlink on-chain. Staked funds never leave your custody throughout the entire process.

---

## Developer Quick Start

### Prerequisites:
- **Node.js**: `v20.x` (LTS recommended)
- **npm**: `v10.x+`

### Setup:
```bash
# Clone the repository
git clone https://github.com/igorgoc/web-wallet-vuejs.git
cd web-wallet-vuejs

# Install dependencies
npm install --legacy-peer-deps
```

### Development Server:
```bash
# Starts local Vite development server with hot module replacement (HMR)
npm run dev
```

### Testing & Verification:
```bash
# Run strict TypeScript type verification
npm run type-check

# Run cryptographic & security unit tests
npm run test:unit

# Run performance benchmark check
npm run test:perf

# Run ESLint fix
npm run lint
```

### Production Build:
```bash
# Compiles and minifies for production deployment
npm run build
```

---

## Live Deployment

The wallet is continuously deployed to GitHub Pages on every push to the `develop` branch:
- **Live Wallet**: [https://igorgoc.github.io/web-wallet-vuejs/](https://igorgoc.github.io/web-wallet-vuejs/)

---

## Related Projects

- **Validator Node & Manager**: [ProximaX Sirius Core Native Cockpit](https://github.com/igorgoc/proximax-sirius-core) — Lightweight native node manager and community validator pool engine for macOS, Linux, Windows, and Home Assistant OS.
- **Catapult Consensus Engine**: [cpp-xpx-chain](https://github.com/igorgoc/cpp-xpx-chain) — C++ Sirius Core engine with multi-key dynamic delegated harvesting and FastFinality hot-reloading.
- **Blockchain Explorer**: [https://explorer.xpxsirius.io](https://explorer.xpxsirius.io)

---

## License

This project is licensed under the **MIT License**.