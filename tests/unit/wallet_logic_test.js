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
