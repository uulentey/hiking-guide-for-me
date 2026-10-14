/* Exercises storage.rules with Firebase's official local rules runtime.
   Usage: node tests/storage-rules.cjs /path/to/cloud-storage-rules-runtime.jar
   Admin document responses are local fixtures; no live project is contacted. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const jar = process.argv[2];
if (!jar || !fs.existsSync(jar)) throw new Error('Pass the path to the official Storage rules runtime JAR.');
const child = spawn('java', ['-Djava.security.manager=disallow', '-Duser.language=en', '-jar', jar, 'serve']);
const waiting = new Map();
const memberships = new Map([['admin', true], ['regular', false]]);
let nextId = 0;
let diagnostics = '';
child.stderr.on('data', chunk => { diagnostics += chunk; });
const send = (body, id) => child.stdin.write(JSON.stringify({ ...body, id }) + '\n');
const startup = new Promise((resolve, reject) => {
  waiting.set(-1, { resolve, reject });
  child.on('error', reject);
});
createInterface({ input: child.stdout }).on('line', line => {
  let response;
  try { response = JSON.parse(line); } catch (_) { return; }
  const id = response.id ?? response.server_request_id;
  if (response.action === 'fetch_firestore_document') {
    const uid = response.context.path.split('/').at(-1);
    send(memberships.has(uid) ? {
      status: 'ok', result: { name: `projects/demo-walky-admin${response.context.path}`, fields: { enabled: { booleanValue: memberships.get(uid) } } }, errors: [], warnings: []
    } : { status: 'not_found', errors: [], warnings: [] }, response.server_request_id);
    return;
  }
  const pending = waiting.get(id);
  if (pending) { waiting.delete(id); pending.resolve(response); }
});
child.on('exit', code => {
  for (const pending of waiting.values()) pending.reject(new Error(`Rules runtime exited (${code}): ${diagnostics}`));
  waiting.clear();
});
function request(body) {
  const id = nextId++;
  return new Promise((resolve, reject) => { waiting.set(id, { resolve, reject }); send(body, id); });
}
function expression(value) {
  if (value === null) return { null_value: null };
  if (typeof value === 'boolean') return { bool_value: value };
  if (typeof value === 'string') return { string_value: value };
  if (typeof value === 'number') return { int_value: value };
  return { map_value: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, expression(item)])) } };
}
async function verify({ uid = 'admin', owner = 'admin', method = 'create', size = 1024, type = 'image/jpeg', filename = 'test.jpg', permit = true }) {
  const objectPath = `/b/demo-walky-admin.appspot.com/o/route-images/${owner}/${filename}`;
  const metadata = { name: `route-images/${owner}/${filename}`, bucket: 'demo-walky-admin.appspot.com', size, contentType: type };
  const result = await request({ action: 'verify', context: {
    rulesetName: 'walky', service: 'firebase.storage', path: objectPath, method,
    variables: {
      resource: expression(method === 'create' ? null : metadata),
      request: { map_value: { fields: {
        path: { path_value: { segments: objectPath.split('/').filter(Boolean).map(simple => ({ simple })) } },
        time: { timestamp_value: new Date().toISOString() },
        resource: expression(['delete', 'get', 'list'].includes(method) ? null : metadata),
        auth: expression(uid ? { uid, token: { user_id: uid, sub: uid } } : null)
      } } }
    }
  } });
  assert.equal(result.result?.permit, permit, `${method} by ${uid || 'guest'}, ${type}, ${size}: ${JSON.stringify(result)}`);
}

(async () => {
  const timeout = setTimeout(() => { child.kill(); }, 30000);
  try {
    await startup;
    const loaded = await request({ action: 'load_ruleset', context: { rulesetName: 'walky', source: { files: [{ name: 'storage.rules', content: fs.readFileSync(path.join(__dirname, '../storage.rules'), 'utf8') }] } } });
    assert.deepEqual(loaded.errors, []);
    await verify({});
    await verify({ filename: 'test.png', type: 'image/png', size: 5 * 1024 * 1024 });
    await verify({ filename: 'test.webp', type: 'image/webp' });
    await verify({ uid: null, permit: false });
    await verify({ uid: 'regular', owner: 'regular', permit: false });
    await verify({ uid: 'unknown', owner: 'unknown', permit: false });
    await verify({ owner: 'someone-else', permit: false });
    await verify({ size: 0, permit: false });
    await verify({ size: 5 * 1024 * 1024 + 1, permit: false });
    await verify({ type: 'image/svg+xml', filename: 'test.svg', permit: false });
    await verify({ filename: 'test.html', permit: false });
    await verify({ method: 'update', permit: false });
    await verify({ method: 'get', uid: null });
    await verify({ method: 'list', permit: false });
    await verify({ method: 'delete' });
    await verify({ method: 'delete', uid: 'regular', permit: false });
    memberships.set('admin', false);
    await verify({ permit: false });
    console.log('Storage rules checks passed: admin membership, supported formats, size limits, owner folder, public images, overwrite prevention and revocation.');
  } finally { clearTimeout(timeout); child.kill('SIGINT'); }
})().catch(error => { console.error(error); process.exitCode = 1; child.kill('SIGINT'); });
