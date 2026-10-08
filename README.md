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

## User Guide: Delegated Staking (Become a Remote Validator)

### Prerequisites:
- A ProximaX Sirius wallet account holding **at least 100,000 XPX**.
- A small amount of XPX (~0.05 XPX) to cover on-chain network transaction fees.

### Step-by-Step Activation:
1. **Open the Harvesting Tab**:
   Log in to your wallet and navigate to **Services** → **Harvesting** (or the Delegated Staking dashboard).
2. **Select a Validator Node**:
   Choose an active node from the community validator list (or enter the public key of a node running [proximax-sirius-core](https://github.com/igorgoc/proximax-sirius-core)).
3. **Link Remote Key**:
   Click **Activate Delegated Harvesting**. The wallet will:
   - Generate a dedicated remote harvesting key pair.
   - Announce an on-chain `AccountKeyLinkTransaction` linking your main account to the remote key.
   - Send an encrypted activation message to the target validator node.
4. **Start Harvesting**:
   Once confirmed on-chain (~15 seconds), the validator node's dynamic hot-reloader ingests your key without downtime. Your account begins participating in POS+ block harvesting and earning network transaction fees!
5. **Stop Anytime**:
   Click **Deactivate Harvesting** at any time to unlink your remote key on-chain. Staked funds remain in your custody throughout the entire process.

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