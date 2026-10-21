/* =====================================================================
   OpenGrid – zentrale Endpunkt-Konfiguration
   ---------------------------------------------------------------------
   Hier (und NUR hier) stehen Adressen von Endpunkten. api.js, live.js
   und history.js lesen ausschließlich aus window.OPENGRID_CONFIG.
   Flutter: entspricht einer AppConfig-Klasse bzw. --dart-define-Werten.
   ===================================================================== */
window.OPENGRID_CONFIG = {

  /* Basis-Adresse aller Endpunkte. Pfade unten werden daran angehängt.
     Ein Pfad, der selbst mit http(s):// oder ws(s):// beginnt, wird
     unverändert verwendet (z. B. für einen anderen Server).
     Hinweis: Das Mockup läuft auf localhost:8080 – ein anderer Server
     muss CORS für diese Herkunft erlauben, sonst blockiert der Browser. */
  BASE_URL: 'http://localhost:3000',

  /* Live-Endpunkte (Reiter "Live")
     name        Anzeigename der Karte
     path        Pfad relativ zu BASE_URL (oder vollständige URL)
     type        "poll"      → wiederholter GET-Request (fetch)
                 "sse"       → Server-Sent Events (EventSource)
                 "websocket" → WebSocket (http(s) wird automatisch zu ws(s))
     intervalMs  nur bei "poll": Abfrageintervall in Millisekunden
     expectedIntervalMs  optional bei "sse"/"websocket": erwarteter Abstand
                 zwischen Nachrichten – danach gilt der Stream als verzögert
                 (Standard: STREAM_EXPECTED_INTERVAL_MS) */
  LIVE_ENDPOINTS: [
    { name: '[Live-Endpunkt 1]', path: '/api/live/example-poll', type: 'poll', intervalMs: 2000 },
    { name: '[Live-Endpunkt 2]', path: '/api/live/example-stream', type: 'sse' },
    { name: '[Live-Endpunkt 3]', path: '/api/live/example-socket', type: 'websocket' }
  ],

  /* Historische Endpunkte (Reiter "Historische Daten")
     name    Anzeigename der Karte
     path    Pfad relativ zu BASE_URL (oder vollständige URL)
     params  Formularfelder, werden als Query-Parameter angehängt
             key      Name des Query-Parameters
             label    Beschriftung im Formular
             type     "text" | "date" | "number"
             default  Vorbelegung (leer = kein Wert) */
  HISTORY_ENDPOINTS: [
    {
      name: '[Historie-Endpunkt 1]',
      path: '/api/history/example-a',
      params: [
        { key: 'from', label: 'Von', type: 'date', default: '2026-10-01' },
        { key: 'to', label: 'Bis', type: 'date', default: '2026-10-21' },
        { key: 'limit', label: 'Anzahl', type: 'number', default: '50' }
      ]
    },
    {
      name: '[Historie-Endpunkt 2]',
      path: '/api/history/example-b',
      params: [
        { key: 'id', label: 'Kennung', type: 'text', default: '' },
        { key: 'limit', label: 'Anzahl', type: 'number', default: '20' }
      ]
    }
  ],

  /* Zeitlimit pro Request in Millisekunden (AbortController) */
  REQUEST_TIMEOUT_MS: 8000,

  /* Erwarteter Nachrichtenabstand für Streams ohne expectedIntervalMs */
  STREAM_EXPECTED_INTERVAL_MS: 5000,

  /* true  → keine echten Requests, lokale Beispielantworten (Label "Beispieldaten")
     false → echte Requests an die Endpunkte oben */
  USE_MOCK_DATA: true
};
