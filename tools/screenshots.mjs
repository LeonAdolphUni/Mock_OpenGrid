/*
OpenGrid – Screenshots aller Ansichten der Varianten
====================================================
Steuert ein unsichtbares Chrome über das DevTools-Protokoll (ohne
zusätzliche Pakete, Node ≥ 22) und speichert jede Ansicht als PNG:

  screenshots/variante-a/desktop/01-home.png
  screenshots/variante-a/mobil/01-home.png
  …
  screenshots/gemeinsam/…            Login und Varianten-Vergleich

Vorher den Mockup-Server starten:  python -m http.server 8080
Aufruf:                            node tools/screenshots.mjs
Optional andere Adresse/Browser:   BASE_URL=… CHROME=… node tools/screenshots.mjs
Nur einzelne Bilder neu erzeugen:  ONLY=19-menue node tools/screenshots.mjs
*/
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const MAX_HEIGHT = 7000;
const ONLY = process.env.ONLY || '';

const DEVICES = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  mobil: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
};

// Name, Hash-Route, optional Skript vor dem Foto, optional { viewport: true } = nur Bildschirmhöhe
const VIEWS = [
  ['01-home', 'home'],
  ['02-live', 'live'],
  ['03-historie-saisons', 'historie/saisons'],
  ['04-rennergebnis', 'rennen/2026/18'],
  ['05-wm-verlauf', 'historie/verlauf'],
  ['06-fahrer', 'historie/fahrer'],
  ['07-fahrerprofil', 'fahrer/lec'],
  ['08-teams', 'historie/teams'],
  ['09-teamprofil', 'team/ferrari'],
  ['10-strecken', 'historie/strecken'],
  ['11-streckenprofil', 'strecke/usa'],
  ['12-rundenzeiten', 'historie/rundenzeiten'],
  ['13-laender', 'historie/laender'],
  ['14-tippspiel', 'tippspiel/tipp'],
  ['15-rangliste', 'tippspiel/rangliste'],
  ['16-tipp-auswertung', 'tippspiel/auswertung'],
  ['17-profil', 'profil'],
  ['18-live-offline', 'live', 'OGLive.setOnline(false)']
];

const EXTRA = {
  'variante-b': {
    mobil: [
      ['19-live-tabelle', 'live', "document.querySelector('.vb-segment [data-show=\"table\"]').click()"],
      ['20-live-ticker', 'live', "document.querySelector('.vb-segment [data-show=\"ticker\"]').click()"]
    ]
  },
  'variante-c': {
    desktop: [['19-menue', 'home', "document.querySelector('[data-drawer-open]').click()", { viewport: true }]],
    mobil: [['19-menue', 'home', "document.querySelector('[data-drawer-open]').click()", { viewport: true }]]
  }
};

const SHARED = [
  ['login-desktop', 'desktop-login.html', 'desktop'],
  ['login-mobil', 'mobile-login.html', 'desktop'],
  ['varianten-vergleich', 'varianten.html', 'desktop']
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------
   Chrome starten und mit einem Tab verbinden
   ------------------------------------------------------------------ */
const profile = join(tmpdir(), 'opengrid-screenshots-profile');
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', 'about:blank'
], { stdio: 'ignore' });

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
      return target.webSocketDebuggerUrl;
    } catch (err) {
      await sleep(200);
    }
  }
  throw new Error('Chrome ist nicht erreichbar');
}

const ws = new WebSocket(await connect());
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let nextId = 0;
const pending = new Map();
ws.addEventListener('message', function (event) {
  const msg = JSON.parse(event.data);
  if (!msg.id || !pending.has(msg.id)) return;
  const { resolve, reject } = pending.get(msg.id);
  pending.delete(msg.id);
  if (msg.error) reject(new Error(msg.error.message));
  else resolve(msg.result);
});
function send(method, params = {}) {
  return new Promise(function (resolve, reject) {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  return result.result.value;
}

await send('Page.enable');
await send('Runtime.enable');

/* ------------------------------------------------------------------
   Eine Seite fotografieren (ganze Höhe)
   ------------------------------------------------------------------ */
async function shoot(url, device, file, script, waitMs, opts) {
  const d = DEVICES[device];
  await send('Emulation.setDeviceMetricsOverride', d);
  await send('Page.navigate', { url });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('document.readyState') === 'complete') break;
    await sleep(100);
  }
  await evaluate('document.fonts.ready.then(() => true)');
  await sleep(waitMs);
  if (script) {
    await evaluate(script);
    await sleep(800);
  }
  if (!(opts && opts.viewport)) {
    const height = Math.min(MAX_HEIGHT, await evaluate('Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)'));
    await send('Emulation.setDeviceMetricsOverride', Object.assign({}, d, { height: Math.max(d.height, height) }));
    await sleep(400);
  }
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(shot.data, 'base64'));
  console.log('✓', file.slice(ROOT.length + 1));
}

if (!ONLY) rmSync(OUT, { recursive: true, force: true });
let count = 0;
try {
  for (const variant of ['variante-a', 'variante-b', 'variante-c']) {
    for (const device of Object.keys(DEVICES)) {
      const views = VIEWS.concat((EXTRA[variant] && EXTRA[variant][device]) || []);
      for (const [name, route, script, opts] of views) {
        if (ONLY && !name.includes(ONLY)) continue;
        // eigener Query-Wert je Foto → frisch geladene Seite, gleicher Startzustand
        const url = `${BASE_URL}/${variant}.html?embed&shot=${name}#${route}`;
        const wait = route === 'live' || route === 'home' ? 3000 : 1200;
        await shoot(url, device, join(OUT, variant, device, name + '.png'), script, wait, opts);
        count++;
      }
    }
  }
  for (const [name, page, device] of SHARED) {
    if (ONLY && !name.includes(ONLY)) continue;
    await shoot(`${BASE_URL}/${page}`, device, join(OUT, 'gemeinsam', name + '.png'), null, page === 'varianten.html' ? 5000 : 800);
    count++;
  }
  console.log(`${count} Screenshots in screenshots/`);
} finally {
  ws.close();
  chrome.kill();
}
