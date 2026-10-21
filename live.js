/* =====================================================================
   OpenGrid – Reiter "Live"
   ---------------------------------------------------------------------
   Pro Eintrag in LIVE_ENDPOINTS eine Karte mit Status, Messwerten und
   letzter Antwort. Datenzugriff ausschließlich über window.OpenGridApi.

   Flutter-Entsprechung:
     Karte           → Card mit Column (ListTile, Wrap, ExpansionTile)
     Kartenzustand   → eigener State bzw. ChangeNotifier pro Endpunkt
     Polling         → Timer.periodic / StreamBuilder
     Sekunden-Ticker → Timer.periodic(Duration(seconds: 1)) für "verzögert"
   ===================================================================== */
(function () {
  'use strict';

  const api = window.OpenGridApi;
  const list = document.querySelector('[data-live-list]');
  if (!api || !list) return;

  const INTERVAL_OPTIONS = [1000, 2000, 5000, 10000];
  const MAX_JSON_CHARS = 100000;          // sehr große Antworten gekürzt anzeigen

  // Statuswerte → Text (Statuspunkt-Farbe kommt aus CSS: [data-state])
  const STATE_TEXT = {
    idle: 'Inaktiv',
    connecting: 'Verbinde …',
    ok: 'Daten kommen an',
    delayed: 'Verzögert',
    error: 'Fehler'
  };

  const cards = api.config.LIVE_ENDPOINTS.map(createCard);
  initToggleAll();
  setInterval(tick, 1000);

  /* ------------------------------------------------------------------
     Karte aufbauen
     ------------------------------------------------------------------ */
  function createCard(endpoint, index) {
    const url = endpoint.type === 'websocket'
      ? api.toWebSocketUrl(api.buildUrl(endpoint.path))
      : api.buildUrl(endpoint.path);
    const id = `live-${index}`;
    const isPoll = endpoint.type === 'poll';

    const el = document.createElement('article');
    el.className = 'card endpoint-card';
    el.setAttribute('aria-labelledby', `${id}-title`);
    el.innerHTML = `
      <header class="endpoint-card__head">
        <span class="status-dot" data-state="idle" aria-hidden="true"></span>
        <h2 class="title-medium endpoint-card__title" id="${id}-title"></h2>
        <span class="type-chip"></span>
      </header>
      <code class="endpoint-card__url"></code>
      <p class="endpoint-card__status body-medium" aria-live="polite" data-status>Inaktiv</p>
      <dl class="metrics">
        <div><dt>HTTP-Status</dt><dd data-metric="status">–</dd></div>
        <div><dt data-metric-label="duration">${isPoll ? 'Antwortzeit' : 'Abstand'}</dt><dd data-metric="duration">–</dd></div>
        <div><dt>Letzte Antwort</dt><dd data-metric="last">–</dd></div>
        <div><dt>Nachrichten</dt><dd data-metric="count">0</dd></div>
      </dl>
      <details class="json-block">
        <summary>Letzte Antwort</summary>
        <pre tabindex="0"><code data-json>Noch keine Daten</code></pre>
      </details>
      <div class="endpoint-card__actions">
        ${isPoll ? `
        <label class="select-field">
          <span class="select-field__label">Intervall</span>
          <select data-interval></select>
        </label>` : ''}
        <button class="btn btn--outlined" type="button" data-reconnect hidden>
          <span class="material-symbols-outlined icon icon--small" aria-hidden="true">refresh</span>Neu verbinden
        </button>
        <button class="btn btn--tonal" type="button" data-toggle>
          <span class="material-symbols-outlined icon icon--small" aria-hidden="true" data-toggle-icon>play_arrow</span>
          <span data-toggle-label>Start</span>
        </button>
      </div>`;

    // Texte aus der Konfiguration nur per textContent setzen (kein HTML)
    el.querySelector('.endpoint-card__title').textContent = endpoint.name;
    el.querySelector('.type-chip').textContent = endpoint.type;
    el.querySelector('.endpoint-card__url').textContent = url;
    list.appendChild(el);

    const card = {
      endpoint, url, el, isPoll,
      running: false,
      state: 'idle',
      count: 0,
      lastAt: null,
      prevAt: null,
      connection: null,            // Poller oder Stream
      statusEl: el.querySelector('[data-status]'),
      dot: el.querySelector('.status-dot'),
      jsonEl: el.querySelector('[data-json]'),
      reconnectBtn: el.querySelector('[data-reconnect]'),
      toggleBtn: el.querySelector('[data-toggle]')
    };

    if (isPoll) setupInterval(card);
    card.toggleBtn.addEventListener('click', () => (card.running ? stop(card) : start(card)));
    card.reconnectBtn.addEventListener('click', () => {
      stop(card);
      start(card);
    });
    return card;
  }

  /** Auswahlfeld für das Polling-Intervall (1 s, 2 s, 5 s, 10 s) */
  function setupInterval(card) {
    const select = card.el.querySelector('[data-interval]');
    const options = INTERVAL_OPTIONS.includes(card.endpoint.intervalMs)
      ? INTERVAL_OPTIONS
      : [...INTERVAL_OPTIONS, card.endpoint.intervalMs].sort((a, b) => a - b);
    options.forEach((ms) => select.add(new Option(`${ms / 1000} s`, String(ms))));
    select.value = String(card.endpoint.intervalMs);
    card.intervalMs = card.endpoint.intervalMs;
    select.addEventListener('change', () => {
      card.intervalMs = Number(select.value);
      if (card.connection) card.connection.setIntervalMs(card.intervalMs);
    });
  }

  /* ------------------------------------------------------------------
     Start / Stopp
     ------------------------------------------------------------------ */
  function start(card) {
    card.running = true;
    card.prevAt = null;
    setState(card, 'connecting');
    updateToggle(card);
    card.reconnectBtn.hidden = true;

    if (card.isPoll) {
      card.connection = api.createPoller(card.endpoint.name, card.url, card.intervalMs,
        (result) => onPollResult(card, result), api.mock.live(card.endpoint.name));
      card.connection.start();
    } else {
      card.connection = api.openStream(card.endpoint, card.url, {
        onOpen: () => setState(card, 'connecting', 'Verbunden – warte auf Nachrichten'),
        onMessage: (message) => onStreamMessage(card, message),
        onError: (text) => onStreamProblem(card, text, false),
        onClose: (text) => onStreamProblem(card, text, true)
      }, api.mock.live(card.endpoint.name));
    }
    updateToggleAll();
  }

  function stop(card) {
    card.running = false;
    if (card.connection) {
      card.isPoll ? card.connection.stop() : card.connection.close();
      card.connection = null;
    }
    setState(card, 'idle');
    updateToggle(card);
    updateToggleAll();
  }

  function updateToggle(card) {
    card.el.querySelector('[data-toggle-label]').textContent = card.running ? 'Stopp' : 'Start';
    card.el.querySelector('[data-toggle-icon]').textContent = card.running ? 'stop' : 'play_arrow';
  }

  /* ------------------------------------------------------------------
     Ergebnisse
     ------------------------------------------------------------------ */
  function onPollResult(card, result) {
    setMetric(card, 'status', result.status ?? '–');
    setMetric(card, 'duration', `${result.durationMs} ms`);
    if (result.ok) {
      received(card, result.data, result.rawText);
      setState(card, 'ok');
    } else {
      // Bei ungültigem JSON den Rohtext zeigen, bei HTTP-Fehlern den Antworttext
      if (result.rawText) showJson(card, null, result.rawText);
      setState(card, 'error', result.error.message);
    }
  }

  function onStreamMessage(card, message) {
    const now = message.receivedAt.getTime();
    setMetric(card, 'status', '–');
    setMetric(card, 'duration', card.lastAt ? `${now - card.lastAt} ms` : '–');
    received(card, message.data, message.rawText);
    if (message.error) setState(card, 'error', message.error.message);
    else setState(card, 'ok');
  }

  function onStreamProblem(card, text, closed) {
    setState(card, 'error', text);
    card.reconnectBtn.hidden = false;
    if (closed) {
      card.running = false;
      card.connection = null;
      updateToggle(card);
      updateToggleAll();
    }
  }

  function received(card, data, rawText) {
    card.count += 1;
    card.lastAt = Date.now();
    setMetric(card, 'count', String(card.count));
    showJson(card, data, rawText);
    tickCard(card);
  }

  function showJson(card, data, rawText) {
    const text = data !== null && data !== undefined ? JSON.stringify(data, null, 2) : rawText;
    card.jsonEl.textContent = text.length > MAX_JSON_CHARS
      ? text.slice(0, MAX_JSON_CHARS) + `\n… (gekürzt, ${text.length} Zeichen gesamt)`
      : text;
  }

  /* ------------------------------------------------------------------
     Status: Statuspunkt + Text. aria-live meldet nur Änderungen.
     ------------------------------------------------------------------ */
  function setState(card, state, detail) {
    card.state = state;
    card.dot.dataset.state = state;
    const text = detail ? `${STATE_TEXT[state]}: ${detail}` : STATE_TEXT[state];
    if (card.statusEl.textContent !== text) card.statusEl.textContent = text;
  }

  function setMetric(card, key, value) {
    card.el.querySelector(`[data-metric="${key}"]`).textContent = value;
  }

  /** Jede Sekunde: "verzögert" prüfen und relative Zeit aktualisieren */
  function tick() {
    cards.forEach(tickCard);
  }

  function tickCard(card) {
    if (card.lastAt) {
      const ago = Math.round((Date.now() - card.lastAt) / 1000);
      setMetric(card, 'last', `${new Date(card.lastAt).toLocaleTimeString('de-DE')} (vor ${ago} s)`);
    }
    if (!card.running || !card.lastAt || card.state === 'error') return;
    const expected = card.isPoll
      ? card.intervalMs
      : card.endpoint.expectedIntervalMs || api.config.STREAM_EXPECTED_INTERVAL_MS;
    const silentMs = Date.now() - card.lastAt;
    if (silentMs > 2 * expected) {
      setState(card, 'delayed', `seit ${Math.round(silentMs / 1000)} s nichts empfangen`);
    } else if (card.state === 'delayed') {
      setState(card, 'ok');
    }
  }

  /* ------------------------------------------------------------------
     "Alle starten" / "Alle stoppen"
     ------------------------------------------------------------------ */
  function initToggleAll() {
    const button = document.querySelector('[data-live-toggle-all]');
    if (!button) return;
    button.addEventListener('click', () => {
      const allRunning = cards.every((card) => card.running);
      cards.forEach((card) => (allRunning ? card.running && stop(card) : !card.running && start(card)));
    });
    updateToggleAll();
  }

  function updateToggleAll() {
    const button = document.querySelector('[data-live-toggle-all]');
    if (!button || !cards) return;
    const allRunning = cards.length > 0 && cards.every((card) => card.running);
    button.querySelector('[data-label]').textContent = allRunning ? 'Alle stoppen' : 'Alle starten';
    button.querySelector('[data-icon]').textContent = allRunning ? 'stop' : 'play_arrow';
  }
})();
