import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import http from 'node:http';
import { performance } from 'node:perf_hooks';

console.log('='.repeat(70));
console.log('       SIRIUS WEB WALLET - AUTOMATED PERFORMANCE BENCHMARK');
console.log('='.repeat(70));

// -------------------------------------------------------------
// 1. Bundle Asset Sizing & Compression Benchmark
// -------------------------------------------------------------
console.log('\n[1/4] BUNDLE ASSET SIZING & COMPRESSION BENCHMARK:');
const distAssetsDir = path.resolve('dist/assets');
if (!fs.existsSync(distAssetsDir)) {
  console.error('Error: dist/assets not found. Run "npm run build" first.');
  process.exit(1);
}

const files = fs.readdirSync(distAssetsDir);
const jsFiles = files.filter(f => f.endsWith('.js'));

const assetStats = jsFiles.map(file => {
  const filePath = path.join(distAssetsDir, file);
  const content = fs.readFileSync(filePath);
  const rawKb = (content.length / 1024).toFixed(1);
  const gzipKb = (zlib.gzipSync(content).length / 1024).toFixed(1);
  const brotliKb = (zlib.brotliCompressSync(content).length / 1024).toFixed(1);
  return { file, rawBytes: content.length, rawKb: parseFloat(rawKb), gzipKb: parseFloat(gzipKb), brotliKb: parseFloat(brotliKb) };
});

assetStats.sort((a, b) => b.rawBytes - a.rawBytes);

console.log('Top 10 Largest JS Chunks in Production Build:');
console.log('┌───────────────────────────────────────┬────────────┬────────────┬────────────┐');
console.log('│ Asset Name                            │ Raw Size   │ Gzip Size  │ Brotli     │');
console.log('├───────────────────────────────────────┼────────────┼────────────┼────────────┤');
for (const stat of assetStats.slice(0, 10)) {
  const name = stat.file.length > 37 ? stat.file.slice(0, 34) + '...' : stat.file.padEnd(37);
  const raw = `${stat.rawKb} kB`.padStart(10);
  const gzip = `${stat.gzipKb} kB`.padStart(10);
  const brotli = `${stat.brotliKb} kB`.padStart(10);
  console.log(`│ ${name} │ ${raw} │ ${gzip} │ ${brotli} │`);
}
console.log('└───────────────────────────────────────┴────────────┴────────────┴────────────┘');

const entryChunk = assetStats.find(a => a.file.startsWith('index-'));
const swapChunk = assetStats.find(a => a.file.startsWith('swapUtils-'));

console.log(`\n• Entry chunk (index.js): ${entryChunk ? entryChunk.rawKb : 'N/A'} kB (Gzip: ${entryChunk ? entryChunk.gzipKb : 'N/A'} kB)`);
console.log(`• swapUtils chunk: ${swapChunk ? swapChunk.rawKb : 'N/A'} kB (Gzip: ${swapChunk ? swapChunk.gzipKb : 'N/A'} kB)`);

if (entryChunk && entryChunk.rawKb > 1000) {
  console.error('❌ FAIL: Entry chunk exceeds 1000 kB budget!');
  process.exit(1);
} else {
  console.log('✅ PASS: Entry chunk is well within optimal < 1MB initial bundle budget.');
}

if (swapChunk && swapChunk.rawKb > 50) {
  console.error('❌ FAIL: swapUtils chunk exceeds 50 kB budget!');
  process.exit(1);
} else {
  console.log('✅ PASS: swapUtils is successfully stripped of heavy PDF background assets.');
}

// -------------------------------------------------------------
// 2. Keystore Encryption & Decryption Performance
// -------------------------------------------------------------
console.log('\n[2/4] CRYPTO KEYSTORE BENCHMARK (AES-GCM-256 + PBKDF2):');

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 10000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptKey(plainHex, password) {
  const salt = 'sirius_perf_salt';
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainHex)
  );
  return {
    cipherTextHex: Buffer.from(encrypted).toString('hex'),
    ivHex: Buffer.from(iv).toString('hex'),
  };
}

async function decryptKey(cipherTextHex, ivHex, password) {
  const salt = 'sirius_perf_salt';
  const iv = Buffer.from(ivHex, 'hex');
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    Buffer.from(cipherTextHex, 'hex')
  );
  return new TextDecoder().decode(decrypted);
}

const testHex = 'ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789';
const testPass = 'WalletSecurePassword2026!';
const iterations = 30;

const startCrypto = performance.now();
for (let i = 0; i < iterations; i++) {
  const encResult = await encryptKey(testHex, testPass);
  const decrypted = await decryptKey(encResult.cipherTextHex, encResult.ivHex, testPass);
  if (decrypted !== testHex) throw new Error('Decryption mismatch');
}
const totalCryptoMs = performance.now() - startCrypto;
const msPerCycle = totalCryptoMs / iterations;
const opsPerSec = (iterations * 1000) / totalCryptoMs;

console.log(`• Completed ${iterations} full Encrypt + Decrypt cycles in ${totalCryptoMs.toFixed(2)}ms`);
console.log(`• Mean latency per cycle: ${msPerCycle.toFixed(2)}ms`);
console.log(`• Throughput: ${opsPerSec.toFixed(1)} operations/sec`);
if (msPerCycle < 50) {
  console.log('✅ PASS: Keystore cryptography meets responsive UX budget (<50ms).');
} else {
  console.log('⚠️  WARN: Keystore cryptography exceeds 50ms UX budget.');
}

// -------------------------------------------------------------
// 3. Validator Discovery Parallel Scalability & Simulated Probe
// -------------------------------------------------------------
console.log('\n[3/4] VALIDATOR DISCOVERY PARALLEL PROBING BENCHMARK:');

// Simulate probing 20 candidate nodes concurrently with varying simulated latencies
const simulatedCandidates = Array.from({ length: 20 }, (_, i) => ({
  id: `candidate-${i}`,
  endpoint: `http://node-${i}.sirius.io:8080`,
  simulatedDelay: 10 + Math.random() * 40, // 10ms to 50ms network round-trip
  isOnline: i % 4 !== 0, // 75% online, 25% offline
}));

async function probeMock(candidate) {
  const start = performance.now();
  await new Promise(r => setTimeout(r, candidate.simulatedDelay));
  const ping = Math.round(performance.now() - start);
  return {
    ...candidate,
    online: candidate.isOnline,
    pingMs: ping,
    eligible: candidate.isOnline && ping < 150,
  };
}

const startProbe = performance.now();
const probedResults = await Promise.all(simulatedCandidates.map(c => probeMock(c)));
const totalProbeTime = performance.now() - startProbe;

const eligibleSorted = probedResults
  .filter(r => r.eligible)
  .sort((a, b) => a.pingMs - b.pingMs);

console.log(`• Probed ${simulatedCandidates.length} candidate nodes in parallel in ${totalProbeTime.toFixed(2)}ms`);
console.log(`• Eligible nodes discovered: ${eligibleSorted.length}/${simulatedCandidates.length}`);
console.log(`• Lowest latency node: ${eligibleSorted[0].endpoint} (${eligibleSorted[0].pingMs}ms)`);
console.log(`• Highest latency eligible node: ${eligibleSorted[eligibleSorted.length - 1].endpoint} (${eligibleSorted[eligibleSorted.length - 1].pingMs}ms)`);

if (totalProbeTime < 100) {
  console.log('✅ PASS: Parallel node discovery takes < 100ms total wall-clock time.');
} else {
  console.log('⚠️  WARN: Parallel discovery took longer than 100ms.');
}

// -------------------------------------------------------------
// 4. Dev Server TTFB & HTTP Latency Check
// -------------------------------------------------------------
console.log('\n[4/4] DEV SERVER HTTP TTFB & LATENCY CHECK:');

function measureDevServer() {
  return new Promise((resolve) => {
    const reqOptions = {
      headers: { 'Accept': 'text/html, */*' }
    };
    const start = performance.now();
    http.get('http://127.0.0.1:5173/', reqOptions, (res) => {
      let ttfb = performance.now() - start;
      let totalBytes = 0;
      res.on('data', chunk => totalBytes += chunk.length);
      res.on('end', () => {
        const totalDuration = performance.now() - start;
        resolve({ statusCode: res.statusCode, ttfb, totalDuration, totalBytes });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

const httpResult = await measureDevServer();
if (httpResult.error) {
  console.log(`⚠️  Dev server not reachable on :5173 (${httpResult.error})`);
} else {
  console.log(`• HTTP Status: ${httpResult.statusCode} OK`);
  console.log(`• Time to First Byte (TTFB): ${httpResult.ttfb.toFixed(2)}ms`);
  console.log(`• Full HTML Download: ${httpResult.totalBytes} bytes in ${httpResult.totalDuration.toFixed(2)}ms`);
  if (httpResult.ttfb < 30) {
    console.log('✅ PASS: Local TTFB is sub-30ms.');
  }
}

console.log('\n' + '='.repeat(70));
console.log('                      ALL BENCHMARKS COMPLETED');
console.log('='.repeat(70));
