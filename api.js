/* =====================================================================
   OpenGrid – Datenzugriff (Requests, Polling, SSE, WebSocket, Log)
   ---------------------------------------------------------------------
   Einzige Stelle, die mit dem Netzwerk spricht. live.js und history.js
   rufen nur die Funktionen von window.OpenGridApi auf.

   Flutter-Entsprechung:
     request()      → Repository-Methode mit http.get(...).timeout(...)
     createPoller() → Timer.periodic bzw. Stream.periodic + StreamBuilder
     openStream()   → SSE-Client / WebSocketChannel als Stream
     log            → ChangeNotifier / Riverpod-Provider mit Liste
   ===================================================================== */
window.OpenGridApi = (function () {
  'use strict';

  const CONFIG = window.OPENGRID_CONFIG;
  const LOG_LIMIT = 50;

  // Meldungen für die vier Fehlerarten (werden in der Oberfläche angezeigt)
  const MESSAGES = {
    network: 'Server nicht erreichbar oder CORS blockiert – siehe Browser-Konsole',
    timeout: (ms) => `Zeitüberschreitung: keine Antwort nach ${ms} ms`,
    http: (status, text) => `HTTP-Fehler ${status}${text ? ' ' + text : ''}`,
    json: 'Ungültiges JSON – Rohtext siehe unten'
  };

  /* ------------------------------------------------------------------
     URLs
     ------------------------------------------------------------------ */

  /** Pfad + optionale Query-Parameter → vollständige URL. Leere Werte entfallen. */
  function buildUrl(path, query) {
    const absolute = /^(https?|wss?):\/\//i.test(path);
    const url = new URL(absolute ? path : CONFIG.BASE_URL.replace(/\/$/, '') + path);
    Object.entries(query || {}).forEach(function ([key, value]) {
      if (value !== '' && value !== null && value !== undefined) url.searchParams.set(key, value);
    });
    return url.toString();
  }

  /** http(s):// → ws(s)://, für WebSocket-Endpunkte */
  function toWebSocketUrl(url) {
    return url.replace(/^http(s?):\/\//i, 'ws$1://');
  }

  function byteSize(text) {
    return new TextEncoder().encode(text || '').length;
  }

  /* ------------------------------------------------------------------
     Request-Log (letzte 50 Einträge, neueste zuerst)
     Eintrag: { time, endpoint, status, durationMs, error, mock }
     ------------------------------------------------------------------ */
  const log = {
    entries: [],
    listeners: [],
    add(entry) {
      this.entries.unshift(Object.assign({ time: new Date(), mock: CONFIG.USE_MOCK_DATA }, entry));
      this.entries.length = Math.min(this.entries.length, LOG_LIMIT);
      this.listeners.forEach((fn) => fn(this.entries));
    },
    clear() {
      this.entries = [];
      this.listeners.forEach((fn) => fn(this.entries));
    },
    subscribe(fn) {
      this.listeners.push(fn);
      fn(this.entries);
    }
  };

  /* ------------------------------------------------------------------
     Einzelner GET-Request mit Timeout und Fehlerunterscheidung
     Ergebnis (immer ein Objekt, nie eine Exception):
       { ok, url, status, statusText, durationMs, sizeBytes,
         data, rawText, error: { kind, message } | null, mock }
     mockFactory(url) liefert im Beispieldaten-Modus die Antwortdaten.
     ------------------------------------------------------------------ */
  async function request(name, url, mockFactory) {
    const started = performance.now();
    const result = {
      ok: false, url, status: null, statusText: '', durationMs: 0,
      sizeBytes: 0, data: null, rawText: '', error: null, mock: CONFIG.USE_MOCK_DATA
    };

    if (CONFIG.USE_MOCK_DATA) {
      await wait(60 + Math.random() * 340);                // simulierte Latenz
      result.data = mockFactory ? mockFactory(url) : {};
      result.rawText = JSON.stringify(result.data);
      result.status = 200;
      result.statusText = 'OK';
      result.ok = true;
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
        result.status = response.status;
        result.statusText = response.statusText;
        result.rawText = await response.text();             // Body zählt noch zum Timeout
        if (!response.ok) {
          result.error = { kind: 'http', message: MESSAGES.http(response.status, response.statusText) };
        } else {
          try {
            result.data = JSON.parse(result.rawText);
            result.ok = true;
          } catch (parseError) {
            result.error = { kind: 'json', message: MESSAGES.json };
          }
        }
      } catch (err) {
        // AbortError = unser Timeout; TypeError = Netzwerk/CORS (Details nur in der Konsole)
        result.error = err.name === 'AbortError'
          ? { kind: 'timeout', message: MESSAGES.timeout(CONFIG.REQUEST_TIMEOUT_MS) }
          : { kind: 'network', message: MESSAGES.network };
        if (err.name !== 'AbortError') console.error('[OpenGrid] Request fehlgeschlagen:', url, err);
      } finally {
        clearTimeout(timer);
      }
    }

    result.durationMs = Math.round(performance.now() - started);
    result.sizeBytes = byteSize(result.rawText);
    log.add({
      endpoint: name,
      status: result.status ?? '–',
      durationMs: result.durationMs,
      error: result.error ? result.error.message : ''
    });
    return result;
  }

  /* ------------------------------------------------------------------
     Polling: wiederholt request(), der nächste startet erst, wenn der
     vorige fertig ist (keine Überlappung bei langsamen Servern).
     → Flutter: Timer / Stream.periodic + asyncMap
     ------------------------------------------------------------------ */
  function createPoller(name, url, intervalMs, onResult, mockFactory) {
    let interval = intervalMs;
    let timer = null;
    let running = false;

    async function tick() {
      if (!running) return;
      const result = await request(name, url, mockFactory);
      if (!running) return;                                  // während des Requests gestoppt
      onResult(result);
      timer = setTimeout(tick, interval);
    }

    return {
      start() {
        if (running) return;
        running = true;
        tick();
      },
      stop() {
        running = false;
        clearTimeout(timer);
      },
      setIntervalMs(ms) {
        interval = ms;
      },
      get running() {
        return running;
      }
    };
  }

  /* ------------------------------------------------------------------
     Streams (SSE / WebSocket)
     handlers: onOpen(), onMessage(message), onError(text), onClose(text)
     message:  { data, rawText, sizeBytes, error, receivedAt }
     Rückgabe: { close() }
     ------------------------------------------------------------------ */
  function parseMessage(text) {
    const message = { data: null, rawText: text, sizeBytes: byteSize(text), error: null, receivedAt: new Date() };
    try {
      message.data = JSON.parse(text);
    } catch (err) {
      message.error = { kind: 'json', message: MESSAGES.json };
    }
    return message;
  }

  function openStream(endpoint, url, handlers, mockFactory) {
    if (CONFIG.USE_MOCK_DATA) return openMockStream(endpoint, url, handlers, mockFactory);
    return endpoint.type === 'sse' ? openSse(endpoint, url, handlers) : openWebSocket(endpoint, url, handlers);
  }

  /** Server-Sent Events. Hinweis: EventSource liefert keinen HTTP-Status
      und reicht nur Ereignisse vom Typ "message" an onmessage weiter. */
  function openSse(endpoint, url, handlers) {
    const source = new EventSource(url);
    source.onopen = function () {
      log.add({ endpoint: endpoint.name, status: 'offen', durationMs: null, error: '' });
      handlers.onOpen();
    };
    source.onmessage = function (event) {
      handlers.onMessage(parseMessage(event.data));
    };
    source.onerror = function () {
      if (source.readyState === EventSource.CLOSED) {
        const text = 'Verbindung geschlossen – ' + MESSAGES.network;
        log.add({ endpoint: endpoint.name, status: 'geschlossen', durationMs: null, error: text });
        handlers.onClose(text);
      } else {
        const text = 'Verbindung unterbrochen – der Browser versucht automatisch neu zu verbinden';
        log.add({ endpoint: endpoint.name, status: 'unterbrochen', durationMs: null, error: text });
        handlers.onError(text);
      }
    };
    return {
      close() {
        source.close();
      }
    };
  }

  /** WebSocket. Fehlerdetails gibt der Browser aus Sicherheitsgründen
      nicht an JavaScript weiter – nur in der Konsole sichtbar. */
  function openWebSocket(endpoint, url, handlers) {
    const socket = new WebSocket(toWebSocketUrl(url));
    let closedByUser = false;
    socket.onopen = function () {
      log.add({ endpoint: endpoint.name, status: 'offen', durationMs: null, error: '' });
      handlers.onOpen();
    };
    socket.onmessage = function (event) {
      const text = typeof event.data === 'string' ? event.data : '[Binärdaten – nicht als Text darstellbar]';
      handlers.onMessage(parseMessage(text));
    };
    socket.onerror = function () {
      const text = 'WebSocket-Fehler – ' + MESSAGES.network;
      log.add({ endpoint: endpoint.name, status: 'Fehler', durationMs: null, error: text });
      handlers.onError(text);
    };
    socket.onclose = function (event) {
      if (closedByUser) return;
      const text = `Verbindung getrennt (Code ${event.code}${event.reason ? ': ' + event.reason : ''})`;
      log.add({ endpoint: endpoint.name, status: 'geschlossen', durationMs: null, error: text });
      handlers.onClose(text);
    };
    return {
      close() {
        closedByUser = true;
        socket.close();
      }
    };
  }

  /** Beispieldaten-Stream: sendet in unregelmäßigen Abständen Nachrichten */
  function openMockStream(endpoint, url, handlers, mockFactory) {
    let timer = null;
    let open = true;
    const expected = endpoint.expectedIntervalMs || CONFIG.STREAM_EXPECTED_INTERVAL_MS;

    function next() {
      timer = setTimeout(function () {
        if (!open) return;
        handlers.onMessage(parseMessage(JSON.stringify(mockFactory ? mockFactory(url) : {})));
        next();
      }, expected * (0.15 + Math.random() * 0.35));
    }

    timer = setTimeout(function () {
      log.add({ endpoint: endpoint.name, status: 'offen', durationMs: null, error: '' });
      handlers.onOpen();
      next();
    }, 250);

    return {
      close() {
        open = false;
        clearTimeout(timer);
      }
    };
  }

  /* ------------------------------------------------------------------
     Beispieldaten (nur bei USE_MOCK_DATA). Bewusst neutrale Platzhalter.
     ------------------------------------------------------------------ */
  const sequences = {};

  const mock = {
    /** Eine Live-Nachricht */
    live(name) {
      return function () {
        sequences[name] = (sequences[name] || 0) + 1;
        return {
          timestamp: new Date().toISOString(),
          sequence: sequences[name],
          source: name,
          values: { a: round(Math.random() * 100), b: round(Math.random() * 10) },
          note: '[Beispieldaten]'
        };
      };
    },
    /** Eine historische Liste; liest limit/from aus der URL */
    history(url) {
      const query = new URL(url).searchParams;
      const limit = Math.min(Math.max(parseInt(query.get('limit'), 10) || 20, 0), 500);
      const start = Date.parse(query.get('from') || '') || Date.now() - limit * 3600e3;
      return Array.from({ length: limit }, function (_, i) {
        return {
          id: i + 1,
          timestamp: new Date(start + i * 3600e3).toISOString(),
          label: `[Eintrag ${i + 1}]`,
          value_a: round(Math.random() * 100),
          value_b: round(Math.random() * 10)
        };
      });
    }
  };

  function round(value) {
    return Math.round(value * 100) / 100;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  return { config: CONFIG, buildUrl, toWebSocketUrl, request, createPoller, openStream, log, mock };
})();
