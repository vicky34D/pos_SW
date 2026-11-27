// ===================================================================
// The Anthropic API key used for bill scanning.
// Stored only in server/ai.env (git-ignored, file mode 600). The main admin
// can set or remove it from Settings; it is never sent back to the browser,
// only its last 4 characters. Read fresh on every use, so a change takes
// effect at once without a restart.
// ===================================================================
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const KEY_FILE = process.env.AI_ENV_PATH || path.join(__dirname, 'ai.env');
const VAR = 'ANTHROPIC_API_KEY';
const KEY_PATTERN = /^sk-ant-[A-Za-z0-9_-]{20,}$/;

function readFileVars() {
  try { return dotenv.parse(fs.readFileSync(KEY_FILE)); } catch { return {}; }
}

// The key in ai.env wins; fall back to the process environment.
function getKey() {
  return (readFileVars()[VAR] || process.env[VAR] || '').trim() || null;
}

function status() {
  const key = getKey();
  return {
    configured: !!key,
    last4: key ? key.slice(-4) : null,
    source: readFileVars()[VAR] ? 'settings' : (key ? 'server' : null),
  };
}

// Rewrite ai.env with the key changed (or removed), keeping any other lines.
// Written to a temp file first, then renamed, so it is never half-written.
function writeKey(key) {
  let lines = [];
  try { lines = fs.readFileSync(KEY_FILE, 'utf8').split('\n'); } catch { /* new file */ }
  lines = lines.filter(l => l.trim() && !new RegExp(`^\\s*(export\\s+)?${VAR}\\s*=`).test(l));
  if (key) lines.push(`${VAR}=${key}`);
  const tmp = `${KEY_FILE}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, lines.length ? lines.join('\n') + '\n' : '', { mode: 0o600 });
  fs.renameSync(tmp, KEY_FILE);
  fs.chmodSync(KEY_FILE, 0o600);
}

module.exports = { getKey, status, writeKey, KEY_PATTERN };
