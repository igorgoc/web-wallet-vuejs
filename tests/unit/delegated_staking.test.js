const test = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');

// -------------------------------------------------------------
// Mock Server & Prober Helper for Validator Discovery Logic
// -------------------------------------------------------------
function simulateNodeProbe(candidate, mockNodeResponse, shouldThrow = false) {
  if (shouldThrow) {
    return {
      ...candidate,
      online: false,
      pingMs: 999,
      activeSlots: 0,
      maxSlots: 0,
      features: [],
      eligible: false,
      statusReason: 'Offline / CORS blocked',
    };
  }

  const features = Array.isArray(mockNodeResponse.features) ? mockNodeResponse.features : [];
  const hasHotload = features.includes('delegated_harvesting_hotload');
  const delHarv = mockNodeResponse.delegatedHarvesting || {};
  const activeSlots = typeof delHarv.activeSlots === 'number' ? delHarv.activeSlots : 0;
  const maxSlots = typeof delHarv.maxSlots === 'number' ? delHarv.maxSlots : 100;
  const hasAvailableSlots = activeSlots < maxSlots;

  let eligible = true;
  let statusReason = undefined;

  if (!hasHotload) {
    eligible = false;
    statusReason = 'Ineligible (engine lacks dynamic hotload)';
  } else if (!hasAvailableSlots) {
    eligible = false;
    statusReason = 'Pool Full (0 slots available)';
  }

  return {
    ...candidate,
    name: delHarv.nodeName || candidate.name,
    online: true,
    pingMs: mockNodeResponse._simulatedPing || 25,
    activeSlots,
    maxSlots,
    features,
    eligible,
    statusReason,
    nodePublicKey: delHarv.nodeKey || candidate.nodePublicKey,
  };
}

function sortValidators(probed) {
  return [...probed].sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    if (a.online && !b.online) return -1;
    if (!a.online && b.online) return 1;
    return a.pingMs - b.pingMs;
  });
}

// -------------------------------------------------------------
// Unit Tests: Validator Discovery & Health Handshake
// -------------------------------------------------------------
test('Validator Discovery: accepts node with dynamic hotload and available slots', () => {
  const candidate = {
    id: 'node-1',
    name: 'Mainnet Node 1',
    endpoint: 'http://node1.example.com:8080',
  };

  const mockResponse = {
    status: 'running',
    features: ['delegated_harvesting_hotload', 'fast_finality'],
    delegatedHarvesting: {
      activeSlots: 2,
      maxSlots: 10,
      nodeKey: 'A'.repeat(64),
      nodeName: 'Mainnet-Val-1',
    },
    _simulatedPing: 35,
  };

  const result = simulateNodeProbe(candidate, mockResponse);

  assert.strictEqual(result.online, true);
  assert.strictEqual(result.eligible, true);
  assert.strictEqual(result.activeSlots, 2);
  assert.strictEqual(result.maxSlots, 10);
  assert.strictEqual(result.name, 'Mainnet-Val-1');
  assert.strictEqual(result.statusReason, undefined);
});

test('Validator Discovery: rejects legacy node lacking delegated_harvesting_hotload', () => {
  const candidate = {
    id: 'legacy-node',
    name: 'Old Catapult Node',
    endpoint: 'http://legacy.example.com:8080',
  };

  // Node is running, but lacks hotload feature
  const mockResponse = {
    status: 'running',
    features: ['fast_finality'],
    delegatedHarvesting: {
      activeSlots: 0,
      maxSlots: 5,
    },
    _simulatedPing: 18,
  };

  const result = simulateNodeProbe(candidate, mockResponse);

  assert.strictEqual(result.online, true);
  assert.strictEqual(result.eligible, false);
  assert.match(result.statusReason, /lacks dynamic hotload/);
});

test('Validator Discovery: marks node with 0 slots as Pool Full', () => {
  const candidate = {
    id: 'full-node',
    name: 'Full Validator',
    endpoint: 'http://full.example.com:8080',
  };

  const mockResponse = {
    status: 'running',
    features: ['delegated_harvesting_hotload'],
    delegatedHarvesting: {
      activeSlots: 10,
      maxSlots: 10, // Full capacity!
    },
    _simulatedPing: 22,
  };

  const result = simulateNodeProbe(candidate, mockResponse);

  assert.strictEqual(result.online, true);
  assert.strictEqual(result.eligible, false);
  assert.match(result.statusReason, /Pool Full/);
});

test('Validator Discovery: handles unreachable / offline node gracefully', () => {
  const candidate = {
    id: 'offline-node',
    name: 'Unreachable Node',
    endpoint: 'http://192.0.2.1:8080',
  };

  const result = simulateNodeProbe(candidate, {}, true);

  assert.strictEqual(result.online, false);
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.statusReason, 'Offline / CORS blocked');
});

test('Validator Discovery: sorts eligible lowest-latency nodes first', () => {
  const nodes = [
    { id: '1', name: 'High Ping Eligible', eligible: true, online: true, pingMs: 120 },
    { id: '2', name: 'Low Ping Eligible', eligible: true, online: true, pingMs: 15 },
    { id: '3', name: 'Ineligible Node', eligible: false, online: true, pingMs: 5 },
    { id: '4', name: 'Offline Node', eligible: false, online: false, pingMs: 999 },
    { id: '5', name: 'Mid Ping Eligible', eligible: true, online: true, pingMs: 45 },
  ];

  const sorted = sortValidators(nodes);

  assert.strictEqual(sorted[0].id, '2'); // 15ms eligible
  assert.strictEqual(sorted[1].id, '5'); // 45ms eligible
  assert.strictEqual(sorted[2].id, '1'); // 120ms eligible
  assert.strictEqual(sorted[3].id, '3'); // 5ms ineligible
  assert.strictEqual(sorted[4].id, '4'); // offline
});

// -------------------------------------------------------------
// Unit Tests: Remote Key Encryption & Decryption
// -------------------------------------------------------------
function encryptKey(privateKeyHex, password) {
  const key = crypto.scryptSync(password, 'sirius-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(privateKeyHex, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    algo: 'pass:scrypt',
    encrypted,
    iv: iv.toString('hex'),
  };
}

function decryptKey(payload, password) {
  try {
    const key = crypto.scryptSync(password, 'sirius-salt', 32);
    const iv = Buffer.from(payload.iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(payload.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

test('Key Security: correctly encrypts and decrypts remote 64-hex key with password', () => {
  const testPrivKey = '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
  const testPassword = 'WalletSecurePassword2026!';

  const enc = encryptKey(testPrivKey, testPassword);
  assert.ok(enc.encrypted);
  assert.ok(enc.iv);
  assert.notStrictEqual(enc.encrypted, testPrivKey);

  const dec = decryptKey(enc, testPassword);
  assert.strictEqual(dec, testPrivKey);
});

test('Key Security: fails decryption with incorrect password', () => {
  const testPrivKey = '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF';
  const testPassword = 'CorrectPassword123!';
  const wrongPassword = 'WrongPassword456!';

  const enc = encryptKey(testPrivKey, testPassword);
  const dec = decryptKey(enc, wrongPassword);

  assert.strictEqual(dec, null);
});

// -------------------------------------------------------------
// Unit Tests: Scoped Metadata Key Specification
// -------------------------------------------------------------
test('On-Chain Protocol: scoped metadata key utf8 "sirius.v" matches 16-hex uint64', () => {
  const utf8Key = 'sirius.v';
  const hexKey = Buffer.from(utf8Key, 'utf8').toString('hex');

  // 's'=73, 'i'=69, 'r'=72, 'i'=69, 'u'=75, 's'=73, '.'=2e, 'v'=76
  assert.strictEqual(hexKey, '7369726975732e76');
  assert.strictEqual(hexKey.length, 16); // Exactly 8 bytes (64 bits)
});

// -------------------------------------------------------------
// Unit Tests: Active Harvesting & On-Chain Announcement Detection
// -------------------------------------------------------------
function computeActiveHarvesting(isHarvesterRegistered, isKeyHotloadedOnNode, isDelegationAnnouncedOnChain, lastSignedBlockHeight) {
  return Boolean(isHarvesterRegistered && (isKeyHotloadedOnNode || isDelegationAnnouncedOnChain || lastSignedBlockHeight > 0));
}

test('Active Harvesting State: correctly evaluates active state across different signals', () => {
  // 1. Registered + announced on-chain => true
  assert.strictEqual(computeActiveHarvesting(true, false, true, 0), true);

  // 2. Registered + key hotloaded via REST => true
  assert.strictEqual(computeActiveHarvesting(true, true, false, 0), true);

  // 3. Registered + signed block height > 0 => true
  assert.strictEqual(computeActiveHarvesting(true, false, false, 14050000), true);

  // 4. Not registered on-chain => always false even if hotloaded
  assert.strictEqual(computeActiveHarvesting(false, true, true, 14050000), false);

  // 5. Registered but no announcement or slot active => false
  assert.strictEqual(computeActiveHarvesting(true, false, false, 0), false);
});

test('Outgoing Delegation Inspection: correctly filters encrypted delegation transfers', () => {
  const transactions = [
    { type: 16724, message: { type: 1, payload: '4EEEF4...' } }, // Valid encrypted delegation
    { type: 16724, message: { type: 0, payload: 'Plain message' } }, // Plain transfer
    { type: 16716, message: { type: 1, payload: '4EEEF4...' } }, // AccountLink (not transfer)
    { type: 16724, message: null }, // Transfer without message
  ];

  const hasDelegation = transactions.some(
    (t) => t.type === 16724 && t.message && t.message.type === 1
  );

  assert.strictEqual(hasDelegation, true);

  const nonDelegationList = [
    { type: 16724, message: { type: 0, payload: 'plain' } },
  ];
  const hasNoDelegation = nonDelegationList.some(
    (t) => t.type === 16724 && t.message && t.message.type === 1
  );
  assert.strictEqual(hasNoDelegation, false);
});

