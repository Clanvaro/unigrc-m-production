import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);
const baseArg = args.find(a => a.startsWith('--base='));
const BASE = baseArg ? baseArg.split('=')[1] : process.env.BASE_URL;

const results = [];
const log = (status, msg) => {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  results.push({ status, msg });
  console.log(`${icon} ${status}: ${msg}`);
};
const readJSON = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function hasFile(...parts) { return fs.existsSync(path.join(process.cwd(), ...parts)); }
function hasText(file, needle) {
  if (!hasFile(file)) return false;
  const txt = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
  return txt.includes(needle);
}

function checkPkg() {
  if (!hasFile('package.json')) return log('FAIL', 'Falta package.json');
  const pkg = readJSON('package.json');
  const badVersions = [];
  const checkDeps = (deps = {}) => { for (const [k, v] of Object.entries(deps)) if (/[\^~]/.test(v)) badVersions.push(`${k}@${v}`); };
  checkDeps(pkg.dependencies); checkDeps(pkg.devDependencies);
  if (badVersions.length) log('FAIL', `Hay dependencias con ^ o ~: ${badVersions.join(', ')}`); else log('PASS', 'Dependencias fijas (sin ^ ni ~)');
  if (pkg.engines?.node && pkg.engines?.npm) log('PASS', `Engines definidos (node=${pkg.engines.node}, npm=${pkg.engines.npm})`); else log('FAIL', 'Faltan engines en package.json (node/npm)');
  if (pkg.packageManager) log('PASS', `packageManager definido (${pkg.packageManager})`); else log('WARN', 'Sin packageManager en package.json');
  const needed = ['typecheck','test','test:e2e','lint','build','start','doctor'];
  const missing = needed.filter(s => !pkg.scripts?.[s]);
  if (missing.length) log('FAIL', `Faltan scripts: ${missing.join(', ')}`); else log('PASS', 'Scripts mínimos presentes');
  if (pkg['lint-staged']) log('PASS','lint-staged configurado'); else log('WARN','Sin lint-staged en package.json');
  const devs = Object.keys(pkg.devDependencies || {});
  if (devs.includes('vitest')) log('PASS','Vitest instalado'); else log('WARN','Vitest no detectado');
  if (devs.includes('@playwright/test')) log('PASS','Playwright instalado'); else log('WARN','Playwright no detectado');
  return pkg;
}

function checkLockfile() { hasFile('package-lock.json') ? log('PASS','package-lock.json presente/commiteado') : log('FAIL','Falta package-lock.json'); }
function checkNpmrc() {
  if (!hasFile('.npmrc')) return log('FAIL','.npmrc ausente');
  const txt = fs.readFileSync('.npmrc','utf8');
  /save-exact\s*=\s*true/.test(txt) ? log('PASS','.npmrc: save-exact=true') : log('FAIL','Falta save-exact=true en .npmrc');
  /engine-strict\s*=\s*true/.test(txt) ? log('PASS','.npmrc: engine-strict=true') : log('FAIL','Falta engine-strict=true en .npmrc');
}
function checkReplitNix() {
  if (!hasFile('replit.nix')) return log('WARN','No se encontró replit.nix');
  hasText('replit.nix','nodejs_20') ? log('PASS','replit.nix fija nodejs_20') : log('WARN','replit.nix no fija nodejs_20');
}
function checkHusky() {
  if (!hasFile('.husky','pre-commit')) return log('FAIL','Falta .husky/pre-commit');
  const pre = fs.readFileSync(path.join('.husky','pre-commit'),'utf8');
  const needs = ['lint-staged','typecheck','test'];
  const missing = needs.filter(n => !pre.includes(n));
  missing.length ? log('FAIL',`.husky/pre-commit no ejecuta: ${missing.join(', ')}`) : log('PASS','.husky/pre-commit correcto');
}
function checkCI() {
  const wf = '.github/workflows/ci.yml';
  if (!hasFile(...wf.split('/'))) return log('FAIL','Falta .github/workflows/ci.yml');
  const yml = fs.readFileSync(wf,'utf8');
  const needs = ['npm ci','typecheck','lint','test','test:e2e'];
  const missing = needs.filter(n => !yml.includes(n));
  missing.length ? log('FAIL',`CI no contiene: ${missing.join(', ')}`) : log('PASS','CI correcto');
}
function checkPlaywrightConfig() {
  ['playwright.config.ts','playwright.config.js'].some(f => hasFile(f)) ? log('PASS','playwright.config presente') : log('WARN','No se encontró playwright.config');
}
function httpGet(url) {
  return new Promise(resolve => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, res => {
      let data=''; res.on('data', c => data+=c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(7000, () => { req.destroy(); resolve(null); });
  });
}
async function checkEndpoints() {
  if (!BASE) return log('WARN','Sin --base=<URL> ni BASE_URL para /health y /version');
  const health = await httpGet(`${BASE.replace(/\/$/,'')}/health`);
  if (health && health.status===200 && /ok/i.test(health.body)) log('PASS',`/health OK: ${health.body.slice(0,80)}`);
  else log('FAIL',`/health no respondió OK (${health ? health.status : 'sin respuesta'})`);
  const version = await httpGet(`${BASE.replace(/\/$/,'')}/version`);
  if (version && version.status===200 && /commit/i.test(version.body)) log('PASS',`/version OK: ${version.body.slice(0,80)}`);
  else log('WARN',`/version no cumple (esperado {commit,builtAt})`);
}
(async function main(){
  console.log('\n=== Doctor: Anti-Regression Audit ===\n');
  checkLockfile(); checkNpmrc(); checkReplitNix(); checkHusky(); checkCI(); checkPlaywrightConfig();
  checkPkg(); await checkEndpoints();
  const counts = { PASS:0, WARN:0, FAIL:0 };
  for (const r of results) counts[r.status]++;
  console.log('\n=== Resumen ===');
  console.log(`PASS: ${counts.PASS}`); console.log(`WARN: ${counts.WARN}`); console.log(`FAIL: ${counts.FAIL}\n`);
  process.exit(counts.FAIL ? 1 : 0);
})();
