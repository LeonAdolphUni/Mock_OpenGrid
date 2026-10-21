/* =====================================================================
   OpenGrid – Reiter "Historische Daten"
   ---------------------------------------------------------------------
   Pro Eintrag in HISTORY_ENDPOINTS eine Karte mit Formular (aus params),
   Ergebnis-Kennzahlen, Tabelle der ersten 20 Datensätze, rohem JSON und
   Download. Datenzugriff ausschließlich über window.OpenGridApi.

   Flutter-Entsprechung:
     Karte      → Card mit Form + TextFormField je Parameter
     Ergebnis   → FutureBuilder auf die Repository-Methode
     Tabelle    → DataTable (in SingleChildScrollView, horizontal)
     Download   → share_plus / file_saver
   ===================================================================== */
(function () {
  'use strict';

  const api = window.OpenGridApi;
  const list = document.querySelector('[data-history-list]');
  if (!api || !list) return;

  const TABLE_ROWS = 20;
  const MAX_JSON_CHARS = 200000;

  api.config.HISTORY_ENDPOINTS.forEach(createCard);

  /* ------------------------------------------------------------------
     Karte mit Formular
     ------------------------------------------------------------------ */
  function createCard(endpoint, index) {
    const id = `history-${index}`;
    const el = document.createElement('article');
    el.className = 'card endpoint-card';
    el.setAttribute('aria-labelledby', `${id}-title`);
    el.innerHTML = `
      <header class="endpoint-card__head">
        <span class="material-symbols-outlined icon endpoint-card__icon" aria-hidden="true">history</span>
        <h2 class="title-medium endpoint-card__title" id="${id}-title"></h2>
        <span class="type-chip">GET</span>
      </header>
      <code class="endpoint-card__url" data-base-url></code>
      <form class="history-form" novalidate>
        <div class="history-form__fields"></div>
        <div class="endpoint-card__actions">
          <button class="btn btn--tonal" type="submit" data-submit>
            <span class="material-symbols-outlined icon icon--small" aria-hidden="true">send</span>Anfrage senden
          </button>
        </div>
      </form>
      <section class="history-result" aria-live="polite" aria-label="Ergebnis" hidden>
        <dl class="metrics metrics--result">
          <div class="metrics__wide"><dt>Aufgerufene URL</dt><dd><code data-result="url"></code></dd></div>
          <div><dt>HTTP-Status</dt><dd data-result="status"></dd></div>
          <div><dt>Antwortzeit</dt><dd data-result="duration"></dd></div>
          <div><dt>Größe</dt><dd data-result="size"></dd></div>
          <div><dt>Datensätze</dt><dd data-result="count"></dd></div>
        </dl>
        <p class="endpoint-card__status body-medium" data-result="error" hidden></p>
        <div class="data-table" data-table hidden></div>
        <details class="json-block">
          <summary>Rohes JSON</summary>
          <pre tabindex="0"><code data-result="json"></code></pre>
        </details>
        <div class="endpoint-card__actions">
          <button class="btn btn--outlined" type="button" data-download>
            <span class="material-symbols-outlined icon icon--small" aria-hidden="true">download</span>JSON herunterladen
          </button>
        </div>
      </section>`;

    el.querySelector('.endpoint-card__title').textContent = endpoint.name;
    el.querySelector('[data-base-url]').textContent = api.buildUrl(endpoint.path);
    const fields = el.querySelector('.history-form__fields');
    endpoint.params.forEach((param, i) => fields.appendChild(createField(param, `${id}-p${i}`)));
    list.appendChild(el);

    const form = el.querySelector('form');
    const submit = el.querySelector('[data-submit]');
    let lastResult = null;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const query = Object.fromEntries(endpoint.params.map((p) => [p.key, form.elements[p.key].value.trim()]));
      const url = api.buildUrl(endpoint.path, query);
      submit.disabled = true;
      submit.lastChild.textContent = 'Wird geladen …';
      lastResult = await api.request(endpoint.name, url, api.mock.history);
      submit.disabled = false;
      submit.lastChild.textContent = 'Anfrage senden';
      showResult(el, lastResult);
    });

    el.querySelector('[data-download]').addEventListener('click', () => {
      if (lastResult) download(endpoint, lastResult);
    });
  }

  /** Ein Formularfeld (Outlined Text Field) aus der params-Definition */
  function createField(param, id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'text-field';
    const input = document.createElement('input');
    input.className = 'text-field__input';
    input.id = id;
    input.name = param.key;
    input.type = ['text', 'date', 'number'].includes(param.type) ? param.type : 'text';
    input.value = param.default ?? '';
    input.placeholder = ' ';
    const label = document.createElement('label');
    label.className = 'text-field__label';
    label.htmlFor = id;
    label.textContent = param.label;
    wrapper.append(input, label);
    return wrapper;
  }

  /* ------------------------------------------------------------------
     Ergebnis anzeigen
     ------------------------------------------------------------------ */
  function showResult(el, result) {
    const box = el.querySelector('.history-result');
    const set = (key, value) => (box.querySelector(`[data-result="${key}"]`).textContent = value);
    const isList = Array.isArray(result.data);

    box.hidden = false;
    set('url', result.url);
    set('status', result.status ? `${result.status} ${result.statusText}`.trim() : '–');
    set('duration', `${result.durationMs} ms`);
    set('size', `${(result.sizeBytes / 1024).toFixed(1)} KB`);
    set('count', isList ? String(result.data.length) : '– (kein Array)');

    const error = box.querySelector('[data-result="error"]');
    error.hidden = !result.error;
    error.textContent = result.error ? `Fehler: ${result.error.message}` : '';

    const pretty = result.data !== null ? JSON.stringify(result.data, null, 2) : result.rawText;
    set('json', pretty.length > MAX_JSON_CHARS
      ? pretty.slice(0, MAX_JSON_CHARS) + `\n… (gekürzt, ${pretty.length} Zeichen gesamt)`
      : pretty || '(leere Antwort)');

    renderTable(box.querySelector('[data-table]'), result.data);
  }

  /** Einfache Tabelle der ersten 20 Einträge, Spalten = Keys des ersten Objekts */
  function renderTable(container, data) {
    const rows = Array.isArray(data) ? data.filter((row) => row && typeof row === 'object') : [];
    container.hidden = rows.length === 0;
    container.textContent = '';
    if (!rows.length) return;

    const columns = Object.keys(rows[0]);
    const table = document.createElement('table');
    const caption = table.createCaption();
    caption.textContent = `Erste ${Math.min(TABLE_ROWS, data.length)} von ${data.length} Einträgen`;

    const headRow = table.createTHead().insertRow();
    columns.forEach((key) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = key;
      headRow.appendChild(th);
    });

    const body = table.createTBody();
    rows.slice(0, TABLE_ROWS).forEach((row) => {
      const tr = body.insertRow();
      columns.forEach((key) => {
        const value = row[key];
        tr.insertCell().textContent = value !== null && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '');
      });
    });
    container.appendChild(table);
  }

  /** Antwort als .json-Datei speichern (bei ungültigem JSON der Rohtext) */
  function download(endpoint, result) {
    const text = result.data !== null ? JSON.stringify(result.data, null, 2) : result.rawText;
    const blob = new Blob([text], { type: 'application/json' });
    const link = document.createElement('a');
    const slug = endpoint.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'antwort';
    link.href = URL.createObjectURL(blob);
    link.download = `${slug}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }
})();
