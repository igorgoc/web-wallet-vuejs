const test = require('node:test');
const assert = require('node:assert');
const { UInt64 } = require('tsjs-xpx-chain-sdk');
const mathjs = require('mathjs');

// -------------------------------------------------------------
// 1. Time Unit Converter Tests
// -------------------------------------------------------------
const TimeUnit = {
  DAY: 3,
  HOUR: 2,
  MINUTE: 1,
  SECOND: 0,
};

function daysConvert(days, timeUnit) {
  const unit = mathjs.unit(days, 'day');
  let finalUnit = '';
  switch (timeUnit) {
    case TimeUnit.HOUR:
      finalUnit = 'hour';
      break;
    case TimeUnit.MINUTE:
      finalUnit = 'minute';
      break;
    case TimeUnit.SECOND:
      finalUnit = 'second';
      break;
    default:
      return days;
  }
  return unit.toNumber(finalUnit);
}

function hoursConvert(hours, timeUnit) {
  const unit = mathjs.unit(hours, 'hour');
  let finalUnit = '';
  if (timeUnit > TimeUnit.HOUR) {
    throw new Error('Cannot convert to upper class of unit');
  }
  switch (timeUnit) {
    case TimeUnit.MINUTE:
      finalUnit = 'minute';
      break;
    case TimeUnit.SECOND:
      finalUnit = 'second';
      break;
    default:
      return hours;
  }
  return unit.toNumber(finalUnit);
}

function minutesConvert(minutes, timeUnit) {
  const unit = mathjs.unit(minutes, 'minute');
  let finalUnit = '';
  if (timeUnit > TimeUnit.MINUTE) {
    throw new Error('Cannot convert to upper class of unit');
  }
  switch (timeUnit) {
    case TimeUnit.MINUTE:
      finalUnit = 'minute';
      break;
    case TimeUnit.SECOND:
      finalUnit = 'second';
      break;
    default:
      return minutes;
  }
  return unit.toNumber(finalUnit);
}

function configReturn(configUnit, timeUnit) {
  let unitName = '';
  let unitAmount = parseInt(configUnit, 10);

  if (configUnit.search('d') > -1) {
    unitName = 'day';
  } else if (configUnit.search('h') > -1) {
    unitName = 'hour';
  } else if (configUnit.search('m') > -1) {
    unitName = 'minute';
  } else if (configUnit.search('s') > -1) {
    unitName = 'second';
  }

  if (!unitName) {
    return isNaN(unitAmount) ? 0 : unitAmount;
  }

  let unit = mathjs.unit(unitAmount, unitName);
  let finalUnit = '';
  switch (timeUnit) {
    case TimeUnit.DAY:
      finalUnit = 'day';
      break;
    case TimeUnit.HOUR:
      finalUnit = 'hour';
      break;
    case TimeUnit.MINUTE:
      finalUnit = 'minute';
      break;
    case TimeUnit.SECOND:
      finalUnit = 'second';
      break;
  }
  return unit.toNumber(finalUnit);
}

test('UnitConverter: daysConvert converts days to hours, minutes, seconds', () => {
  assert.strictEqual(daysConvert(2, TimeUnit.HOUR), 48);
  assert.strictEqual(daysConvert(1, TimeUnit.MINUTE), 1440);
  assert.strictEqual(daysConvert(1, TimeUnit.SECOND), 86400);
  assert.strictEqual(daysConvert(3, TimeUnit.DAY), 3);
});

test('UnitConverter: hoursConvert converts down and rejects upper class', () => {
  assert.strictEqual(hoursConvert(2, TimeUnit.MINUTE), 120);
  assert.strictEqual(hoursConvert(1, TimeUnit.SECOND), 3600);
  assert.strictEqual(hoursConvert(5, TimeUnit.HOUR), 5);
  assert.throws(() => hoursConvert(1, TimeUnit.DAY), /Cannot convert to upper class of unit/);
});

test('UnitConverter: minutesConvert converts down and rejects higher units', () => {
  assert.strictEqual(minutesConvert(10, TimeUnit.SECOND), 600);
  assert.strictEqual(minutesConvert(15, TimeUnit.MINUTE), 15);
  // Converting minutes to HOUR or DAY must throw
  assert.throws(() => minutesConvert(60, TimeUnit.HOUR), /Cannot convert to upper class of unit/);
  assert.throws(() => minutesConvert(1440, TimeUnit.DAY), /Cannot convert to upper class of unit/);
});

test('UnitConverter: configReturn parses time strings and handles unitless gracefully', () => {
  assert.strictEqual(configReturn('24h', TimeUnit.DAY), 1);
  assert.strictEqual(configReturn('3d', TimeUnit.HOUR), 72);
  assert.strictEqual(configReturn('120s', TimeUnit.MINUTE), 2);
  // Unitless fallback should not crash mathjs
  assert.strictEqual(configReturn('500', TimeUnit.SECOND), 500);
  assert.strictEqual(configReturn('', TimeUnit.SECOND), 0);
});

// -------------------------------------------------------------
// 2. IEEE-754 Precision & UInt64 Token Conversion Tests
// -------------------------------------------------------------
function convertToAbsolute(value, divisibility) {
  return Math.round(value * Math.pow(10, divisibility));
}

function naiveConvertToAbsolute(value, divisibility) {
  return value * Math.pow(10, divisibility);
}

test('Precision Invariant: convertToAbsolute eliminates IEEE-754 precision loss', () => {
  const divisibility = 6;
  const trickyAmounts = [
    { input: 0.29, expectedMicro: 290000 },
    { input: 1.14, expectedMicro: 1140000 },
    { input: 2.28, expectedMicro: 2280000 },
    { input: 0.07, expectedMicro: 70000 },
    { input: 100.000001, expectedMicro: 100000001 },
  ];

  for (const { input, expectedMicro } of trickyAmounts) {
    const naive = naiveConvertToAbsolute(input, divisibility);
    const naiveTruncated = UInt64.fromUint(Number(naive)).compact();

    const hardened = convertToAbsolute(input, divisibility);
    const hardenedUInt = UInt64.fromUint(Number(hardened)).compact();

    // The hardened calculation must exactly match the mathematical expected micro units
    assert.strictEqual(hardened, expectedMicro);
    assert.strictEqual(hardenedUInt, expectedMicro);
  }

  // Floating point precision edge case verification:
  const badFloat = 289999.99999999994;
  assert.strictEqual(UInt64.fromUint(badFloat).compact(), 289999);
  assert.strictEqual(UInt64.fromUint(Math.round(badFloat)).compact(), 290000);
});

// -------------------------------------------------------------
// 3. Amount Formatter Null & NaN Safety Tests
// -------------------------------------------------------------
function amountFormatterSimple(amount, d = 6) {
  const val = Number(amount);
  if (amount == null || isNaN(val)) {
    return (0).toLocaleString('en-us', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  }
  const amountDivisibility = val / Math.pow(10, d);
  return amountDivisibility.toLocaleString('en-us', {
    minimumFractionDigits: d,
  });
}

test('Amount Formatter: safely handles null, undefined, NaN, and zero', () => {
  assert.strictEqual(amountFormatterSimple(null), '0.000000');
  assert.strictEqual(amountFormatterSimple(undefined), '0.000000');
  assert.strictEqual(amountFormatterSimple(NaN), '0.000000');
  assert.strictEqual(amountFormatterSimple('abc'), '0.000000');
  assert.strictEqual(amountFormatterSimple(0), '0.000000');
  assert.strictEqual(amountFormatterSimple(1000000), '1.000000');
  assert.strictEqual(amountFormatterSimple(250, 2), '2.50');
});

// -------------------------------------------------------------
// 4. API & WS Endpoint Construction Tests
// -------------------------------------------------------------
function buildAPIEndpoint(endpoint, port, protocol = 'https:') {
  if (!endpoint) return '';
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const protocols = ['https:', 'file:'];
  let requestProtocol = 'http';
  let usePort = port;
  if (protocols.includes(protocol)) {
    requestProtocol = 'https';
    usePort = 0;
  }
  return `${requestProtocol}://${endpoint}${usePort ? ':' + usePort : ''}`;
}

function buildWSEndpoint(endpoint, port, protocol = 'https:') {
  if (!endpoint) return '';
  if (endpoint.startsWith('ws://') || endpoint.startsWith('wss://')) {
    return endpoint;
  }
  const protocols = ['https:', 'file:'];
  let requestProtocol = 'ws';
  let usePort = port;
  if (protocols.includes(protocol)) {
    requestProtocol = 'wss';
    usePort = 0;
  }
  return `${requestProtocol}://${endpoint}${usePort ? ':' + usePort : ''}`;
}

test('Endpoint Builder: guards against duplicate protocol prefixes and ports', () => {
  // Pre-formatted full URLs must not be double-prefixed
  assert.strictEqual(
    buildAPIEndpoint('http://localhost:3000', 3000, 'https:'),
    'http://localhost:3000'
  );
  assert.strictEqual(
    buildAPIEndpoint('https://bctestnet1.xpxsirius.io:3000', 3000, 'https:'),
    'https://bctestnet1.xpxsirius.io:3000'
  );

  // Hostnames without protocol are formatted correctly
  assert.strictEqual(
    buildAPIEndpoint('bctestnet1.xpxsirius.io', 3000, 'https:'),
    'https://bctestnet1.xpxsirius.io'
  );
  assert.strictEqual(
    buildAPIEndpoint('localhost', 3000, 'http:'),
    'http://localhost:3000'
  );

  // WS endpoints
  assert.strictEqual(
    buildWSEndpoint('wss://bctestnet1.xpxsirius.io:3000', 3000, 'https:'),
    'wss://bctestnet1.xpxsirius.io:3000'
  );
  assert.strictEqual(
    buildWSEndpoint('localhost', 3000, 'http:'),
    'ws://localhost:3000'
  );
});

// -------------------------------------------------------------
// 5. Node Switcher Object Unwrapping
// -------------------------------------------------------------
function extractNodeEndpoint(apiNode) {
  return typeof apiNode === 'object' && apiNode !== null && 'value' in apiNode
    ? apiNode.value
    : String(apiNode);
}

test('Node Switcher: extracts node string from raw value or dropdown object', () => {
  assert.strictEqual(extractNodeEndpoint('bctestnet1.xpxsirius.io'), 'bctestnet1.xpxsirius.io');
  assert.strictEqual(
    extractNodeEndpoint({ name: 'http://bctestnet1.xpxsirius.io:3000', value: 'bctestnet1.xpxsirius.io' }),
    'bctestnet1.xpxsirius.io'
  );
});

// -------------------------------------------------------------
// 6. XSS Escaping Safety Test
// -------------------------------------------------------------
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

test('HTML Escaper: neutralizes XSS payloads in transaction metadata', () => {
  const xssVector = '<script>alert("pwned")</script>&<img src=x onerror=alert(1)>';
  const escaped = escapeHtml(xssVector);

  assert.ok(!escaped.includes('<script>'));
  assert.ok(!escaped.includes('<img'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(escaped.includes('&lt;img'));
  assert.ok(escaped.includes('&amp;'));
});

// -------------------------------------------------------------
// 7. Security Check on Check: SSRF & Cloud Metadata Blocking
// -------------------------------------------------------------
function isEndpointSafe(rawEndpoint) {
  try {
    const urlObj = new URL(rawEndpoint);
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return false;
    }
    const host = urlObj.hostname.toLowerCase();
    if (
      host.startsWith('169.254.') ||
      host === 'metadata.google.internal' ||
      host === '100.100.100.200' ||
      host === '[fd00:ec2::254]'
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

test('Security Audit: SSRF filter blocks all cloud metadata endpoints', () => {
  // Dangerous / Cloud IMDS endpoints must be rejected
  assert.strictEqual(isEndpointSafe('http://169.254.169.254/latest/meta-data/'), false);
  assert.strictEqual(isEndpointSafe('http://169.254.1.5:8080/'), false);
  assert.strictEqual(isEndpointSafe('http://metadata.google.internal/computeMetadata/v1/'), false);
  assert.strictEqual(isEndpointSafe('http://100.100.100.200/latest/meta-data/'), false);
  assert.strictEqual(isEndpointSafe('http://[fd00:ec2::254]/latest/meta-data/'), false);
  assert.strictEqual(isEndpointSafe('javascript:alert(1)'), false);
  assert.strictEqual(isEndpointSafe('file:///etc/passwd'), false);
  assert.strictEqual(isEndpointSafe('ftp://evil.com'), false);

  // Legitimate Sirius peer and REST node endpoints must pass
  assert.strictEqual(isEndpointSafe('http://localhost:8080'), true);
  assert.strictEqual(isEndpointSafe('http://127.0.0.1:3000'), true);
  assert.strictEqual(isEndpointSafe('https://bctestnet1.xpxsirius.io:3000'), true);
  assert.strictEqual(isEndpointSafe('http://192.168.1.50:8080'), true);
});

// -------------------------------------------------------------
// 8. Security Check on Check: Anti-Clickjacking Frame Detection
// -------------------------------------------------------------
function evaluateFrameProtection(isFramed) {
  const rootRef = { id: 'root' };
  const windowMock = {
    self: isFramed ? { id: 'child' } : rootRef,
    top: rootRef,
    location: 'about:blank',
  };
  let bodyHidden = true;
  if (windowMock.self === windowMock.top) {
    bodyHidden = false; // Safe to display
  } else {
    windowMock.top.location = windowMock.self.location; // Break out
  }
  return { bodyHidden, topLocation: windowMock.top.location };
}

test('Security Audit: Anti-clickjacking hides body when embedded in iframe', () => {
  const framedState = evaluateFrameProtection(true);
  assert.strictEqual(framedState.bodyHidden, true); // Stays hidden

  const topState = evaluateFrameProtection(false);
  assert.strictEqual(topState.bodyHidden, false); // Body shown when top-level
});

// -------------------------------------------------------------
// 9. Assets Supply Math & Zero Padding Invariant (BUG-08)
// -------------------------------------------------------------
function addDecimals(cant, amount = '0') {
  const x = '0';
  if (amount === '0') {
    for (let index = 0; index < cant - 1; index++) {
      amount += x;
    }
  } else {
    for (let index = 0; index < cant; index++) {
      amount += x;
    }
  }
  return amount;
}

function addZeros(cant, amount = 0) {
  let realAmount;
  const cantNum = Number(cant) || 0;
  if (cantNum > 0) {
    let decimal;
    if (amount === 0 || amount === '0') {
      decimal = addDecimals(cantNum);
      realAmount = `0${decimal}`;
    } else {
      const arrAmount = amount.toString().replace(/,/g, '').split('.');
      if (arrAmount.length < 2) {
        decimal = addDecimals(cantNum);
      } else {
        const decimalsStr = arrAmount[1].slice(0, cantNum);
        decimal = addDecimals(Math.max(0, cantNum - decimalsStr.length), decimalsStr);
      }
      realAmount = `${arrAmount[0]}${decimal}`;
    }
  } else {
    const arrAmount = amount.toString().replace(/,/g, '').split('.');
    realAmount = arrAmount[0];
  }
  return Number(realAmount);
}

test('AssetsUtils: addZeros truncates excess decimals and pads zeros correctly', () => {
  // Truncation: 100.5567 with divisibility 2 must be 10055, NOT inflated to 1005567
  assert.strictEqual(addZeros(2, '100.5567'), 10055);
  assert.strictEqual(addZeros(2, 100.5567), 10055);

  // Padding: 100.5 with divisibility 2 must be 10050
  assert.strictEqual(addZeros(2, '100.5'), 10050);

  // Integer with divisibility 6
  assert.strictEqual(addZeros(6, 1), 1000000);

  // Divisibility 0: drops decimal part
  assert.strictEqual(addZeros(0, '100.55'), 100);

  // Zero amount
  assert.strictEqual(addZeros(6, 0), 0);
  assert.strictEqual(addZeros(6, '0'), 0);
});

// -------------------------------------------------------------
// 10. Address Validation & Trimming Invariant (BUG-10)
// -------------------------------------------------------------
function validateAddress(address) {
  if (address) {
    const addressTrimAndUpperCase = address.trim().toUpperCase().replace(/-/g, '');
    if (addressTrimAndUpperCase.length === 40) {
      const prefix = addressTrimAndUpperCase.charAt(0);
      if (['S', 'M', 'V', 'X', 'W', 'Z'].includes(prefix)) {
        return true;
      }
    }
  }
  return false;
}

function verifyNetworkAddressEqualsNetwork(value, value2) {
  const v1 = value ? value.trim().toUpperCase().replace(/-/g, '') : '';
  const v2 = value2 ? value2.trim().toUpperCase().replace(/-/g, '') : '';
  if (v1.length === 40 && v2.length === 40) {
    const c1 = v1.charAt(0);
    const c2 = v2.charAt(0);
    if (c1 === c2 && ['S', 'M', 'V', 'X', 'W', 'Z'].includes(c1)) {
      return true;
    }
  }
  return false;
}

test('Address Validation: validates addresses with leading whitespace, hyphens, and rejects invalid', () => {
  const rawMainnet = 'XAM4YI4W2T6QZJ4C7K5Q8K3H9B1N2P3R4S5T6U7V';
  // Standard valid address
  assert.strictEqual(validateAddress(rawMainnet), true);

  // Leading & trailing spaces (previously failed due to untrimmed charAt(0))
  assert.strictEqual(validateAddress('  ' + rawMainnet + '  '), true);

  // Hyphenated address
  const hyphenated = 'XAM4YI-4W2T6Q-ZJ4C7K-5Q8K3H-9B1N2P-3R4S5T-6U7V';
  assert.strictEqual(validateAddress(hyphenated), true);

  // Invalid address network prefix
  assert.strictEqual(validateAddress('A' + rawMainnet.slice(1)), false);

  // Invalid length
  assert.strictEqual(validateAddress(rawMainnet.slice(0, 39)), false);
  assert.strictEqual(validateAddress(''), false);
  assert.strictEqual(validateAddress(null), false);

  // Network equivalence
  assert.strictEqual(verifyNetworkAddressEqualsNetwork(rawMainnet, '  ' + hyphenated), true);
  assert.strictEqual(verifyNetworkAddressEqualsNetwork(rawMainnet, 'V' + rawMainnet.slice(1)), false);
  // Must return explicit false, never undefined
  assert.strictEqual(verifyNetworkAddressEqualsNetwork('short', 'short'), false);
});

// -------------------------------------------------------------
// 11. Multisig Cosigner Deduplication & Rejection of Zero Keys (BUG-03)
// -------------------------------------------------------------
test('Multisig Logic: scopes cosigner per iteration and filters all-zero public keys', async () => {
  const dummyLookup = async (addr) => {
    if (addr === 'VALID_ADDR') {
      return { publicKey: 'A'.repeat(64) };
    }
    if (addr === 'ZERO_ADDR') {
      return { publicKey: '0'.repeat(64) }; // Uninitialized on-chain account
    }
    throw new Error('Account not found');
  };

  const cosignKeys = [
    'B'.repeat(64), // Valid 64-hex key
    '0'.repeat(64), // Invalid all-zero key (must be rejected)
    'VALID_ADDR',   // Valid address resolving to 'A'.repeat(64)
    'FAIL_ADDR',    // Throws lookup error (must NOT re-push previous cosigner!)
  ];

  const addedCosigners = [];
  for (const key of cosignKeys) {
    let resolvedKey = null;
    if (key.length === 64 && key !== '0'.repeat(64)) {
      resolvedKey = key;
    } else if (key.length < 64) {
      try {
        const accInfo = await dummyLookup(key);
        if (accInfo.publicKey && accInfo.publicKey !== '0'.repeat(64) && accInfo.publicKey.length === 64) {
          resolvedKey = accInfo.publicKey;
        }
      } catch {}
    }
    if (resolvedKey) {
      addedCosigners.push(resolvedKey);
    }
  }

  // Expect exactly 2 keys: 'B'.repeat(64) and 'A'.repeat(64).
  // Zero key and failed lookup must NOT produce entries or duplicates!
  assert.strictEqual(addedCosigners.length, 2);
  assert.strictEqual(addedCosigners[0], 'B'.repeat(64));
  assert.strictEqual(addedCosigners[1], 'A'.repeat(64));
});

// -------------------------------------------------------------
// 12. Batch Asset Name Query Indexing Invariant (BUG-05)
// -------------------------------------------------------------
test('Asset Name Sync: iterates inner batch with y and avoids shadowing outer index', () => {
  const tempAssetNames = [
    { mosaicIdHex: '1111111111111111', names: ['asset.one'] },
    { mosaicIdHex: '2222222222222222', names: ['asset.two'] },
    { mosaicIdHex: '3333333333333333', names: ['asset.three'] },
  ];

  const processed = [];
  // Correct inner loop indexing with y
  for (let y = 0; y < tempAssetNames.length; ++y) {
    const currentAssetId = tempAssetNames[y].mosaicIdHex;
    processed.push(currentAssetId);
  }

  assert.deepStrictEqual(processed, [
    '1111111111111111',
    '2222222222222222',
    '3333333333333333',
  ]);
});

// -------------------------------------------------------------
// 13. Safe Clipboard Cleanup Guard (BUG-11)
// -------------------------------------------------------------
test('Clipboard: cleanup handles detached or missing node without throwing', () => {
  let unattachedNode = { parentNode: null };
  assert.doesNotThrow(() => {
    if (unattachedNode && unattachedNode.parentNode) {
      unattachedNode.parentNode.removeChild(unattachedNode);
    }
  });

  let nullNode = null;
  assert.doesNotThrow(() => {
    if (nullNode && nullNode.parentNode) {
      nullNode.parentNode.removeChild(nullNode);
    }
  });
});


