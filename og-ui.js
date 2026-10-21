/* =====================================================================
   OpenGrid – gemeinsame Komponenten, Seiten und Router der Varianten
   ---------------------------------------------------------------------
   Alle drei Varianten (variante-a/b/c.html) nutzen dieselben Bausteine
   und dieselben Daten. Eine Variante legt nur fest, wie Navigation,
   Startseite und Live-Ansicht angeordnet sind (cfg.layouts).

   Flutter-Entsprechung:
     Komponenten (timingTable, ticker, …) → eigene Widgets
     pages.*                               → Screens
     Router (Hash)                         → go_router mit ShellRoute
     Profil (localStorage)                 → shared_preferences + Backend
   ===================================================================== */
window.OG = (function () {
  'use strict';

  const D = window.OG_DATA;
  const L = window.OGLive;

  // Kategoriale Reihenfolge für Diagramme (validierte Palette, Dark Mode).
  // Die Farbe folgt dem Fahrer/Team, nicht dem Rang – siehe mountLineChart.
  const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
  const MAX_SERIES = SERIES.length;

  const TIP_DEADLINE = '2026-10-31T21:00:00';      // Quali-Start Mexiko (Beispiel)

  /* ==================================================================
     Hilfsfunktionen
     ================================================================== */
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function icon(name, cls) {
    return `<span class="material-symbols-outlined icon${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
  }

  const num = (n, digits) => Number(n).toLocaleString('de-DE', { minimumFractionDigits: digits || 0, maximumFractionDigits: digits || 0 });
  const fmtLap = (sec) => (sec ? L.fmtLap(sec) : '–');
  const fmtSector = (sec) => (sec ? sec.toFixed(3).replace('.', ',') : '–');
  const fmtTime = (date) => date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function fmtDate(iso, withYear) {
    return new Date(iso + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: withYear ? 'numeric' : undefined });
  }

  function fmtGap(sec, baseLap) {
    if (sec === 0) return 'Führung';
    if (sec > baseLap) return `+${Math.floor(sec / baseLap)} Rd.`;
    return '+' + sec.toFixed(3).replace('.', ',');
  }

  const driver = (id) => D.DRIVER[id];
  const teamOf = (driverId) => D.TEAM[D.DRIVER[driverId].team];
  const fullName = (id) => `${driver(id).first} ${driver(id).last}`;

  /** Fahrer mit Teamfarbe → Row([Container(color: team), Text(code), Text(name)]) */
  function driverLink(id, opts) {
    const d = driver(id);
    const options = opts || {};
    return `<a class="og-driver" href="#fahrer/${id}" style="--team:${teamOf(id).color}">
      <span class="og-driver__stripe" aria-hidden="true"></span>
      <span class="og-driver__code">${d.code}</span>
      ${options.short ? '' : `<span class="og-driver__name">${esc(d.first)} ${esc(d.last)}</span>`}
    </a>`;
  }

  function teamLink(id, opts) {
    const t = D.TEAM[id];
    return `<a class="og-team" href="#team/${id}" style="--team:${t.color}"><span class="og-driver__stripe" aria-hidden="true"></span>${(opts && opts.short) ? '' : esc(t.name)}</a>`;
  }

  function teamLogo(id, size) {
    const t = D.TEAM[id];
    if (t.logo === 'text') return `<span class="og-logo og-logo--text${size ? ' og-logo--' + size : ''}">${esc(t.name)}</span>`;
    return `<img class="og-logo${t.logo === 'silver' ? ' og-logo--silver' : ''}${size ? ' og-logo--' + size : ''}" src="assets/teams/${id}.svg" alt="${esc(t.name)}">`;
  }

  function tyre(compound, age) {
    const t = D.TYRE[compound];
    const title = `${t.name}${age !== undefined ? `, ${age} Runden alt` : ''}`;
    return `<span class="tyre-badge og-tyre" style="--tyre-color:${t.color}" title="${title}"><span aria-hidden="true">${t.letter}</span><span class="visually-hidden">${title}</span></span>`;
  }

  function countryTag(code) {
    return `<span class="og-cc" title="${esc(D.COUNTRIES[code] || code)}">${code}</span>`;
  }

  /** Karte → Card(child: Column([ListTile(title, trailing: action), body])) */
  function card(title, body, opts) {
    const o = opts || {};
    return `<section class="og-card${o.cls ? ' ' + o.cls : ''}"${o.attrs ? ' ' + o.attrs : ''}>
      ${title ? `<header class="og-card__head">
        ${o.icon ? icon(o.icon, 'og-card__icon') : ''}
        <h2 class="og-card__title">${title}</h2>
        ${o.action || ''}
      </header>` : ''}
      <div class="og-card__body">${body}</div>
    </section>`;
  }

  function stat(value, label, opts) {
    return `<div class="og-stat${opts && opts.accent ? ' og-stat--accent' : ''}"><span class="og-stat__value">${value}</span><span class="og-stat__label">${label}</span></div>`;
  }

  function chips(items, active, hrefFn) {
    return `<div class="og-chips" role="list">${items.map((it) => `<a role="listitem" class="og-filter${String(it.id) === String(active) ? ' is-active' : ''}" href="${hrefFn(it.id)}"${String(it.id) === String(active) ? ' aria-current="true"' : ''}>${esc(it.label)}</a>`).join('')}</div>`;
  }

  function note(text) {
    return `<p class="og-note">${icon('science', 'icon--small')}${text || 'Beispieldaten – alle Werte sind erfunden und nur zur Darstellung.'}</p>`;
  }

  function pageHead(title, sub, opts) {
    const o = opts || {};
    return `<header class="og-page__head">
      ${o.back ? `<a class="og-back" href="${o.back}">${icon('arrow_back', 'icon--small')}${esc(o.backLabel || 'Zurück')}</a>` : ''}
      <div class="og-page__titles">
        ${o.kicker ? `<span class="og-page__kicker">${o.kicker}</span>` : ''}
        <h1 class="og-page__title">${title}</h1>
        ${sub ? `<p class="og-page__sub">${sub}</p>` : ''}
      </div>
      ${o.aside || ''}
    </header>`;
  }

  /* ==================================================================
     Profil (US08, US10) – lokal gespeichert, im Mockup ohne Backend
     ================================================================== */
  const PROFILE_KEY = 'opengrid.profile';
  const profile = {
    get() {
      const defaults = { favTeam: 'ferrari', favDriver: 'lec', remindTip: true, notifyStart: true, notifyFavPit: false, tipsSaved: null };
      try {
        return Object.assign(defaults, JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}'));
      } catch (err) {
        return defaults;
      }
    },
    set(patch) {
      const next = Object.assign(profile.get(), patch);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      } catch (err) {
        // Speichern nicht möglich (z. B. privater Modus) – gilt dann nur bis zum Neuladen
      }
      return next;
    }
  };

  /* ==================================================================
     Live-Komponenten (US01–US06, US-NFR02, US-NFR03)
     ================================================================== */
  function flagChip(state) {
    if (state.finished) return `<span class="og-chip">${icon('sports_score', 'icon--small')}Zielflagge</span>`;
    const f = state.flag;
    if (f.kind === 'yellow') return `<span class="og-chip og-chip--warn">${icon('flag', 'icon--small')}Gelb · Sektor ${f.sector}</span>`;
    if (f.kind === 'sc') return `<span class="og-chip og-chip--warn">${icon('flag', 'icon--small')}Safety Car</span>`;
    return `<span class="og-chip og-chip--ok">${icon('flag', 'icon--small')}Grün</span>`;
  }

  function connChip(state) {
    if (!state.online) return `<span class="og-chip og-chip--error">${icon('cloud_off', 'icon--small')}Offline · Stand ${fmtTime(state.updatedAt)}</span>`;
    return `<span class="og-chip" title="Verzögerung der Live-Daten">${icon('bolt', 'icon--small')}${state.latencyMs} ms</span>`;
  }

  /** Statuszeile "auf einen Blick" (US-NFR03) */
  function liveStatus(state, opts) {
    const fav = profile.get().favDriver;
    const favCar = state.cars.find((c) => c.id === fav);
    const leader = state.cars[0];
    return `<span class="og-chip og-chip--live"><span class="live-dot" aria-hidden="true"></span>Live</span>
      <a class="og-status__gp" href="#live">${esc(state.track.gp)}</a>
      <span class="og-chip">${icon('replay', 'icon--small')}Runde ${state.lap}/${state.totalLaps}</span>
      ${flagChip(state)}
      ${opts && opts.short ? '' : `<span class="og-chip">${icon('emoji_events', 'icon--small')}P1 ${driver(leader.id).code}</span>`}
      ${favCar ? `<span class="og-chip og-chip--fav" style="--team:${teamOf(fav).color}">${icon('favorite', 'icon--small')}${driver(fav).code} P${favCar.pos}${favCar.status === 'pit' ? ' · Box' : ''}</span>` : ''}
      ${connChip(state)}`;
  }

  function sectorCell(s) {
    if (!s) return '<td class="og-sector">–</td>';
    const title = { purple: 'Schnellster Sektor aller Fahrer', green: 'Persönliche Bestzeit', yellow: 'Langsamer als die persönliche Bestzeit' }[s.mark];
    return `<td class="og-sector" data-mark="${s.mark}" title="${title}">${fmtSector(s.time)}</td>`;
  }

  /** Live-Tabelle (US02 Position, US03 Sektoren, US04 Reifen) → DataTable */
  function timingRows(state, opts) {
    const o = opts || {};
    const fav = profile.get().favDriver;
    return state.cars.map(function (c) {
      const delta = c.gridPos - c.pos;
      const statusTag = c.status === 'pit' ? '<span class="og-tag og-tag--pit">Box</span>' : (c.status === 'out' ? '<span class="og-tag og-tag--out">Aus</span>' : '');
      const fastest = state.fastest && state.fastest.driver === c.id;
      if (o.compact) {
        return `<tr class="${c.id === fav ? 'is-fav' : ''}">
          <td class="og-pos">${c.status === 'out' ? '–' : c.pos}</td>
          <td>${driverLink(c.id, { short: true })}</td>
          <td class="og-num">${c.status === 'out' ? 'Aus' : (o.interval ? (c.pos === 1 ? 'Intervall' : '+' + c.interval.toFixed(1).replace('.', ',')) : fmtGap(c.gap, state.track.baseLap).replace('Führung', 'Leader'))}</td>
          <td>${statusTag || tyre(c.tyre.compound, c.tyre.age)}</td>
        </tr>`;
      }
      return `<tr class="${c.id === fav ? 'is-fav' : ''}">
        <td class="og-pos">${c.status === 'out' ? '–' : c.pos}</td>
        <td class="og-delta-cell">${delta > 0 ? `<span class="og-delta og-delta--up" title="${delta} Plätze gewonnen">${icon('arrow_drop_up', 'icon--small')}${delta}</span>` : delta < 0 ? `<span class="og-delta og-delta--down" title="${-delta} Plätze verloren">${icon('arrow_drop_down', 'icon--small')}${-delta}</span>` : ''}</td>
        <td>${driverLink(c.id)} ${statusTag}</td>
        <td class="og-num">${c.status === 'out' ? '–' : fmtGap(c.gap, state.track.baseLap)}</td>
        <td class="og-num og-col-int">${c.pos === 1 || c.status === 'out' ? '–' : '+' + c.interval.toFixed(3).replace('.', ',')}</td>
        <td class="og-num${fastest ? ' og-fastest' : ''}"${fastest ? ' title="Schnellste Runde des Rennens"' : ''}>${fastest ? icon('timer', 'icon--small') : ''}${fmtLap(c.lastLap)}</td>
        ${sectorCell(c.sectors[0])}${sectorCell(c.sectors[1])}${sectorCell(c.sectors[2])}
        <td>${tyre(c.tyre.compound, c.tyre.age)} <span class="og-muted">${c.tyre.age}</span></td>
        <td class="og-num og-col-stops">${c.stops}</td>
      </tr>`;
    }).join('');
  }

  function timingTable(state, opts) {
    const o = opts || {};
    const head = o.compact
      ? '<tr><th scope="col">Pos</th><th scope="col">Fahrer</th><th scope="col" class="og-num">Abstand</th><th scope="col">Reifen</th></tr>'
      : `<tr><th scope="col">Pos</th><th scope="col"><span class="visually-hidden">Veränderung</span></th><th scope="col">Fahrer</th><th scope="col" class="og-num">Abstand</th><th scope="col" class="og-num og-col-int">Intervall</th><th scope="col" class="og-num">Letzte Runde</th><th scope="col">S1</th><th scope="col">S2</th><th scope="col">S3</th><th scope="col">Reifen</th><th scope="col" class="og-num og-col-stops">Stopps</th></tr>`;
    return `<div class="og-table og-timing${o.compact ? ' og-timing--compact' : ''}">
      <table>
        <caption class="visually-hidden">Live-Tabelle ${esc(state.track.gp)}, Runde ${state.lap} von ${state.totalLaps}</caption>
        <thead>${head}</thead>
        <tbody data-timing-body>${timingRows(state, o)}</tbody>
      </table>
    </div>
    ${o.compact ? '' : `<p class="og-legend">
      <span><span class="og-swatch" data-mark="purple"></span>Schnellster Sektor</span>
      <span><span class="og-swatch" data-mark="green"></span>Persönliche Bestzeit</span>
      <span><span class="og-swatch" data-mark="yellow"></span>Langsamer</span>
      <span>${icon('timer', 'icon--small')}Schnellste Runde</span>
    </p>`}`;
  }

  const TICK_ICON = { flag: 'flag', pit: 'tire_repair', overtake: 'swap_vert', fastest: 'timer', dnf: 'car_crash', weather: 'water_drop', info: 'info' };

  /** Live-Ticker (US05) → ListView mit ListTile je Meldung */
  function tickerItems(state, limit) {
    return state.events.slice(0, limit || 30).map((e) => `<li class="og-tick" data-kind="${e.kind}">
      <span class="og-tick__lap">R${e.lap}</span>
      ${icon(TICK_ICON[e.kind] || 'info', 'og-tick__icon')}
      <span class="og-tick__text">${esc(e.text)}</span>
      <time class="og-tick__time">${e.time.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</time>
    </li>`).join('');
  }

  /** Wetter an der Strecke (US06) */
  function weather(state) {
    const w = state.weather;
    const max = Math.max.apply(null, w.forecast.map((f) => f.rain));
    return `<div class="og-weather">
      <div class="og-stats og-stats--4">
        ${stat(w.air + ' °C', 'Luft')}${stat(w.trackTemp + ' °C', 'Strecke')}${stat(w.humidity + ' %', 'Luftfeuchte')}${stat(w.wind + ' km/h', 'Wind')}
      </div>
      <p class="og-weather__head">${icon('water_drop', 'icon--small')}Regenwahrscheinlichkeit, nächste 60 Minuten</p>
      <ol class="og-forecast" aria-label="Regenwahrscheinlichkeit in 10-Minuten-Schritten">
        ${w.forecast.map((f) => `<li><span class="og-forecast__value">${f.rain} %</span><span class="og-forecast__bar" style="height:${Math.max(4, (f.rain / Math.max(max, 1)) * 56)}px"></span><span class="og-forecast__label">${f.minutes === 0 ? 'jetzt' : '+' + f.minutes}</span></li>`).join('')}
      </ol>
    </div>`;
  }

  /* ------------------------------------------------------------------
     Livekarte (US01) → CustomPaint bzw. flutter_map mit Markern
     ------------------------------------------------------------------ */
  // Stilisierte Streckenführung (kein echter Kurs), Start/Ziel unten links
  const TRACK_PATH = 'M 170 470 L 540 470 C 610 470 650 445 690 405 L 810 285 C 850 245 885 200 858 152 C 830 104 768 112 726 142 L 610 228 C 568 258 528 250 506 210 L 474 142 C 452 100 404 88 362 108 L 206 186 C 156 212 118 248 116 300 L 108 405 C 104 448 128 470 170 470 Z';

  function mountTrackMap(el, opts) {
    const o = opts || {};
    el.innerHTML = `<div class="og-map">
      <svg viewBox="60 60 870 450" role="img" aria-label="Livekarte: Positionen der Fahrer auf der Strecke">
        <path class="og-map__edge" d="${TRACK_PATH}"/>
        <path class="og-map__track" d="${TRACK_PATH}"/>
        <path class="og-map__sector" d="${TRACK_PATH}" data-sector-overlay/>
        <line class="og-map__start" x1="170" y1="452" x2="170" y2="488"/>
        <text class="og-map__mark" x="170" y="512" text-anchor="middle">Start/Ziel</text>
        <g data-sector-labels></g>
        <g data-cars></g>
      </svg>
      <p class="og-map__pit" data-pit hidden></p>
      ${o.legend === false ? '' : '<p class="og-map__hint">Beschriftet: Top 3 und dein Lieblingsfahrer · Tippen öffnet das Fahrerprofil</p>'}
    </div>`;
    const svg = el.querySelector('svg');
    const path = svg.querySelector('.og-map__track');
    const len = path.getTotalLength();
    const overlay = svg.querySelector('[data-sector-overlay]');
    const carsGroup = svg.querySelector('[data-cars]');
    const pit = el.querySelector('[data-pit]');

    // Sektornummern an den Grenzen
    svg.querySelector('[data-sector-labels]').innerHTML = [0, 1, 2].map(function (s) {
      const p = path.getPointAtLength(len * (s + 0.5) / 3);
      return `<text class="og-map__sector-label" x="${p.x}" y="${p.y - 22}" text-anchor="middle">S${s + 1}</text>`;
    }).join('');

    const nodes = {};
    D.DRIVERS.forEach(function (d) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      g.setAttribute('href', `#fahrer/${d.id}`);
      g.setAttribute('class', 'og-map__car');
      g.innerHTML = `<title>${esc(fullName(d.id))}</title><circle r="${o.large ? 13 : 11}" fill="${teamOf(d.id).color}"/><text class="og-map__num" text-anchor="middle" dy="4">${d.num}</text><text class="og-map__label" text-anchor="middle" dy="-18">${d.code}</text>`;
      carsGroup.appendChild(g);
      nodes[d.id] = g;
    });

    return {
      update(state) {
        const fav = profile.get().favDriver;
        const f = state.flag;
        if (f.kind === 'yellow') {
          const segment = len / 3;
          overlay.setAttribute('stroke-dasharray', `0 ${segment * (f.sector - 1)} ${segment} ${len}`);
          overlay.dataset.kind = 'yellow';
        } else if (f.kind === 'sc') {
          overlay.setAttribute('stroke-dasharray', `${len} 0`);
          overlay.dataset.kind = 'sc';
        } else {
          overlay.dataset.kind = '';
        }
        const inPit = [];
        state.cars.slice().reverse().forEach(function (c) {      // Führende zuletzt = oben
          const node = nodes[c.id];
          if (c.status !== 'run') {
            node.style.display = 'none';
            if (c.status === 'pit') inPit.push(driver(c.id).code);
            return;
          }
          node.style.display = '';
          const p = path.getPointAtLength(((c.dist % 1) + 1) % 1 * len);
          node.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
          node.classList.toggle('is-labeled', c.pos <= 3 || c.id === fav || o.labels === 'all');
          node.classList.toggle('is-fav', c.id === fav);
          carsGroup.appendChild(node);
        });
        pit.hidden = inPit.length === 0;
        pit.innerHTML = `${icon('tire_repair', 'icon--small')}In der Box: ${inPit.join(', ')}`;
      }
    };
  }

  /**
   * Live-Bausteine in einem Container verbinden. Jeder Teil ist optional:
   * [data-live="status|map|timing|ticker|weather|fav|tower"].
   * Rückgabe über ctx.on(...) wird beim Seitenwechsel abgemeldet.
   */
  function mountLive(ctx, root, opts) {
    const o = opts || {};
    // outsideView: nur Elemente außerhalb des Seiteninhalts (App-Bar, Bauchbinde)
    const parts = (name) => Array.from(root.querySelectorAll(`[data-live="${name}"]`))
      .filter((el) => !o.outsideView || !el.closest('[data-view]'));
    const maps = parts('map').map((el) => mountTrackMap(el, { large: el.dataset.size === 'large', labels: el.dataset.labels, legend: el.dataset.legend !== 'off' }));
    parts('timing').forEach((el) => (el.innerHTML = timingTable(L.state, { compact: el.dataset.compact === 'true' })));
    parts('tower').forEach((el) => (el.innerHTML = timingTable(L.state, { compact: true, interval: el.dataset.interval === 'true' })));
    let lastEvent = null;
    let lastTable = 0;

    const unsubscribe = L.subscribe(function (state) {
      maps.forEach((m) => m.update(state));
      parts('status').forEach((el) => (el.innerHTML = liveStatus(state, { short: el.dataset.short === 'true' })));
      const now = Date.now();
      if (now - lastTable > 500 || !state.online) {
        lastTable = now;
        parts('timing').forEach((el) => (el.querySelector('[data-timing-body]').innerHTML = timingRows(state, { compact: el.dataset.compact === 'true' })));
        parts('tower').forEach((el) => (el.querySelector('[data-timing-body]').innerHTML = timingRows(state, { compact: true, interval: el.dataset.interval === 'true' })));
        parts('fav').forEach((el) => (el.innerHTML = favLive(state)));
      }
      if (state.events[0] !== lastEvent) {
        lastEvent = state.events[0];
        parts('ticker').forEach((el) => (el.innerHTML = `<ol class="og-ticker">${tickerItems(state, Number(el.dataset.limit) || 30)}</ol>`));
        parts('ticker-line').forEach((el) => (el.innerHTML = tickerLine(state)));
      }
      parts('weather').forEach(function (el) {
        if (!el.dataset.ready) {
          el.innerHTML = weather(state);
          el.dataset.ready = '1';
        }
      });
      if (o.onState) o.onState(state);
    });
    ctx.on(unsubscribe);
  }

  /** Lieblingsfahrer im Rennen (US-NFR03: "auf einen Blick") */
  function favLive(state) {
    const fav = profile.get().favDriver;
    const c = state.cars.find((x) => x.id === fav);
    if (!c) return '';
    const ahead = state.cars[c.pos - 2];
    return `<div class="og-fav" style="--team:${teamOf(fav).color}">
      <span class="og-fav__pos">P${c.status === 'out' ? '–' : c.pos}</span>
      <div class="og-fav__text">
        <strong>${esc(fullName(fav))}</strong>
        <span>${c.status === 'pit' ? 'gerade in der Box' : c.status === 'out' ? 'ausgefallen' : ahead ? `${fmtGap(c.interval, state.track.baseLap)} auf ${driver(ahead.id).code}` : 'führt das Rennen an'} · ${tyre(c.tyre.compound, c.tyre.age)} ${c.tyre.age} Rd. · ${c.stops} Stopp${c.stops === 1 ? '' : 's'}</span>
      </div>
      <a class="btn btn--text og-fav__link" href="#fahrer/${fav}">Profil</a>
    </div>`;
  }

  function tickerLine(state) {
    const e = state.events[0];
    return e ? `<span class="og-tick__lap">R${e.lap}</span>${icon(TICK_ICON[e.kind] || 'info', 'icon--small')}<span>${esc(e.text)}</span>` : '';
  }

  /* ==================================================================
     Diagramme
     ================================================================== */

  /**
   * Liniendiagramm mit Fadenkreuz-Tooltip, Legende, Direktbeschriftung
   * und Tabellenansicht. cfg: { series: [{id, label, color, values}],
   * x: [Beschriftungen], format(v), yTitle, xTitle }
   * → fl_chart LineChart mit LineTouchData
   */
  function mountLineChart(ctx, el, cfg) {
    el.innerHTML = `<div class="og-chart">
      <div class="og-chart__bar">
        <ul class="og-chart__legend">${cfg.series.map((s) => `<li><span class="og-chart__key" style="background:${s.color}"></span>${esc(s.label)}</li>`).join('')}</ul>
        <button class="btn btn--text og-chart__toggle" type="button" aria-pressed="false">${icon('table', 'icon--small')}Tabelle</button>
      </div>
      <div class="og-chart__plot"><svg class="og-chart__svg" role="img" aria-label="${esc(cfg.label || 'Diagramm')}"></svg><div class="og-chart__tip" hidden></div></div>
      <div class="og-table og-chart__table" hidden></div>
    </div>`;
    const svg = el.querySelector('svg');
    const tip = el.querySelector('.og-chart__tip');
    const plot = el.querySelector('.og-chart__plot');
    const tableWrap = el.querySelector('.og-chart__table');
    const toggle = el.querySelector('.og-chart__toggle');
    const fmt = cfg.format || ((v) => num(v));

    tableWrap.innerHTML = `<table><thead><tr><th scope="col">${esc(cfg.xTitle || '')}</th>${cfg.series.map((s) => `<th scope="col" class="og-num">${esc(s.label)}</th>`).join('')}</tr></thead>
      <tbody>${cfg.x.map((x, i) => `<tr><td>${esc(x)}</td>${cfg.series.map((s) => `<td class="og-num">${s.values[i] === null || s.values[i] === undefined ? '–' : fmt(s.values[i])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    toggle.addEventListener('click', function () {
      const showTable = tableWrap.hidden;
      tableWrap.hidden = !showTable;
      plot.hidden = showTable;
      toggle.setAttribute('aria-pressed', String(showTable));
    });

    function draw() {
      const W = Math.max(280, plot.clientWidth);
      const H = cfg.height || 280;
      const M = { top: 12, right: 64, bottom: 30, left: 48 };
      const values = cfg.series.flatMap((s) => s.values.filter((v) => v !== null && v !== undefined));
      let min = cfg.yMin !== undefined ? cfg.yMin : Math.min.apply(null, values);
      let max = Math.max.apply(null, values);
      if (min === max) max = min + 1;
      const pad = (max - min) * 0.06;
      if (cfg.yMin === undefined) min -= pad;
      max += pad;
      const n = cfg.x.length;
      const sx = (i) => M.left + (n === 1 ? 0 : (i / (n - 1)) * (W - M.left - M.right));
      const sy = (v) => M.top + (1 - (v - min) / (max - min)) * (H - M.top - M.bottom);
      const ticks = niceTicks(min, max, 4);
      const xStep = Math.ceil(n / Math.max(2, Math.floor((W - M.left - M.right) / 48)));

      const lines = cfg.series.map(function (s) {
        let d = '';
        let pen = false;
        s.values.forEach(function (v, i) {
          if (v === null || v === undefined) {
            pen = false;
            return;
          }
          d += `${pen ? 'L' : 'M'}${sx(i).toFixed(1)} ${sy(v).toFixed(1)} `;
          pen = true;
        });
        return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      }).join('');

      // Direktbeschriftung am Linienende, Überlappung auseinanderschieben
      const ends = cfg.series.map(function (s) {
        let i = s.values.length - 1;
        while (i >= 0 && (s.values[i] === null || s.values[i] === undefined)) i--;
        return { s, i, y: i >= 0 ? sy(s.values[i]) : 0 };
      }).filter((e) => e.i >= 0).sort((a, b) => a.y - b.y);
      for (let k = 1; k < ends.length; k++) {
        if (ends[k].y - ends[k - 1].y < 14) ends[k].y = ends[k - 1].y + 14;
      }
      const labels = ends.map((e) => `<circle cx="${sx(e.i)}" cy="${sy(e.s.values[e.i])}" r="4" fill="${e.s.color}" stroke="var(--color-surface)" stroke-width="2"/>
        <text class="og-chart__end" x="${sx(e.i) + 8}" y="${e.y + 4}">${esc(e.s.short || e.s.label)}</text>`).join('');

      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('height', H);
      svg.innerHTML = `
        ${ticks.map((t) => `<line class="og-chart__grid" x1="${M.left}" x2="${W - M.right}" y1="${sy(t)}" y2="${sy(t)}"/><text class="og-chart__axis" x="${M.left - 8}" y="${sy(t) + 4}" text-anchor="end">${fmt(t)}</text>`).join('')}
        ${cfg.x.map((x, i) => (i % xStep === 0 || i === n - 1) ? `<text class="og-chart__axis" x="${sx(i)}" y="${H - 8}" text-anchor="middle">${esc(x)}</text>` : '').join('')}
        ${lines}${labels}
        <line class="og-chart__cross" y1="${M.top}" y2="${H - M.bottom}" visibility="hidden"/>
        <rect class="og-chart__hit" x="${M.left}" y="${M.top}" width="${W - M.left - M.right}" height="${H - M.top - M.bottom}" fill="transparent"/>`;

      const cross = svg.querySelector('.og-chart__cross');
      const hit = svg.querySelector('.og-chart__hit');
      function show(i) {
        cross.setAttribute('x1', sx(i));
        cross.setAttribute('x2', sx(i));
        cross.setAttribute('visibility', 'visible');
        const rows = cfg.series.map((s) => ({ s, v: s.values[i] })).filter((r) => r.v !== null && r.v !== undefined)
          .sort((a, b) => (cfg.ascending ? a.v - b.v : b.v - a.v));
        tip.textContent = '';
        const head = document.createElement('div');
        head.className = 'og-chart__tip-head';
        head.textContent = (cfg.xTitle ? cfg.xTitle + ' ' : '') + cfg.x[i];
        tip.appendChild(head);
        rows.forEach(function (r) {
          const row = document.createElement('div');
          row.className = 'og-chart__tip-row';
          const key = document.createElement('span');
          key.className = 'og-chart__key';
          key.style.background = r.s.color;
          const value = document.createElement('strong');
          value.textContent = fmt(r.v);
          const label = document.createElement('span');
          label.textContent = r.s.short || r.s.label;
          row.append(key, value, label);
          tip.appendChild(row);
        });
        tip.hidden = false;
        const left = sx(i) / W * plot.clientWidth;
        tip.style.left = Math.min(left + 12, plot.clientWidth - tip.offsetWidth - 4) + 'px';
      }
      function hide() {
        cross.setAttribute('visibility', 'hidden');
        tip.hidden = true;
      }
      hit.addEventListener('pointermove', function (event) {
        const rect = svg.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * W;
        const i = Math.round((x - M.left) / (W - M.left - M.right) * (n - 1));
        show(Math.max(0, Math.min(n - 1, i)));
      });
      hit.addEventListener('pointerleave', hide);
    }

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(plot);
    ctx.on(() => observer.disconnect());
  }

  function niceTicks(min, max, count) {
    const span = max - min;
    const step0 = Math.pow(10, Math.floor(Math.log10(span / count)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * step0).find((s) => span / s <= count) || step0 * 10;
    const ticks = [];
    for (let t = Math.ceil(min / step) * step; t <= max; t += step) ticks.push(Math.round(t * 1000) / 1000);
    return ticks;
  }

  /** Waagerechte Balken für eine Reihe → LinearProgressIndicator je Zeile */
  function bars(items, opts) {
    const o = opts || {};
    const max = o.max || Math.max.apply(null, items.map((i) => i.value)) || 1;
    return `<ul class="og-bars">${items.map((it) => `<li class="og-bar${it.mine ? ' is-mine' : ''}">
      <span class="og-bar__label">${it.label}</span>
      <span class="og-bar__track"><span class="og-bar__fill" style="width:${(it.value / max) * 100}%"></span></span>
      <span class="og-bar__value">${o.format ? o.format(it.value) : num(it.value)}${it.mine ? ` ${icon('check_circle', 'icon--small')}<span class="visually-hidden">dein Tipp</span>` : ''}</span>
    </li>`).join('')}</ul>`;
  }

  /** Farbe je Reihe stabil halten: neue Auswahl bekommt den ersten freien Platz */
  function seriesColors(ids, previous) {
    const map = {};
    const used = new Set();
    ids.forEach(function (id) {
      if (previous && previous[id] && !used.has(previous[id])) {
        map[id] = previous[id];
        used.add(map[id]);
      }
    });
    ids.forEach(function (id) {
      if (!map[id]) {
        map[id] = SERIES.find((c) => !used.has(c));
        used.add(map[id]);
      }
    });
    return map;
  }

  /* ==================================================================
     Startseiten-Bausteine (von den Varianten frei angeordnet)
     ================================================================== */
  function hero() {
    return `<div class="hero">
      <img class="hero__logo" src="logo-mark.svg" alt="">
      <h1 class="hero__title">
        <span class="hero__kicker">Willkommen bei</span>
        <span class="hero__brand">Open<span class="brand__accent">Grid</span></span>
      </h1>
      <span class="hero__stripe" aria-hidden="true"></span>
    </div>`;
  }

  function countdown(iso) {
    return `<span class="og-countdown" data-countdown="${iso}" aria-live="off">–</span>`;
  }

  function tipCard() {
    const t = D.TRACK[D.TIP_TRACK];
    const p = profile.get();
    return card(`Tippspiel · ${esc(t.gp)}`, `
      <p class="og-muted">Tippabgabe schließt mit dem Qualifying am ${fmtDate('2026-10-31')} um 21:00 Uhr.</p>
      <div class="og-countdown-row">${icon('hourglass_top')}${countdown(TIP_DEADLINE)}</div>
      <p class="og-muted">${p.tipsSaved ? `${icon('check_circle', 'icon--small og-ok')} Dein Tipp ist gespeichert (${esc(p.tipsSaved)}).` : `${icon('pending', 'icon--small')} Du hast noch nicht getippt.`}</p>
      <div class="og-card__actions"><a class="btn btn--filled" href="#tippspiel">${p.tipsSaved ? 'Tipp ändern' : 'Jetzt tippen'}</a></div>`, { icon: 'emoji_events' });
  }

  function favoritesCard() {
    const p = profile.get();
    const ds = D.standings(D.CURRENT_YEAR, 'drivers').find((s) => s.id === p.favDriver);
    const ts = D.standings(D.CURRENT_YEAR, 'teams').find((s) => s.id === p.favTeam);
    return card('Deine Favoriten', `
      <a class="og-fav-row" href="#fahrer/${p.favDriver}" style="--team:${teamOf(p.favDriver).color}">
        <span class="og-fav-row__num">${driver(p.favDriver).num}</span>
        <span class="og-fav-row__text"><strong>${esc(fullName(p.favDriver))}</strong><span>WM-Platz ${ds.pos} · ${ds.points} Punkte</span></span>
        ${icon('chevron_right')}
      </a>
      <a class="og-fav-row" href="#team/${p.favTeam}" style="--team:${D.TEAM[p.favTeam].color}">
        <span class="og-fav-row__logo">${teamLogo(p.favTeam, 'sm')}</span>
        <span class="og-fav-row__text"><strong>${esc(D.TEAM[p.favTeam].name)}</strong><span>Konstrukteurs-WM Platz ${ts.pos} · ${ts.points} Punkte</span></span>
        ${icon('chevron_right')}
      </a>
      <a class="link og-small" href="#profil">Favoriten ändern</a>`, { icon: 'favorite' });
  }

  function standingsCard(kind, n) {
    const list = D.standings(D.CURRENT_YEAR, kind).slice(0, n || 5);
    const rows = list.map((s) => `<tr><td class="og-pos">${s.pos}</td><td>${kind === 'teams' ? teamLink(s.id) : driverLink(s.id)}</td><td class="og-num">${s.points}</td></tr>`).join('');
    return card(kind === 'teams' ? 'Konstrukteurs-WM' : 'Fahrer-WM', `
      <div class="og-table og-table--plain"><table><thead><tr><th scope="col">Pos</th><th scope="col">${kind === 'teams' ? 'Team' : 'Fahrer'}</th><th scope="col" class="og-num">Punkte</th></tr></thead><tbody>${rows}</tbody></table></div>
      <a class="link og-small" href="#historie/verlauf/${D.CURRENT_YEAR}/${kind}">Saisonverlauf ansehen</a>`, { icon: 'leaderboard' });
  }

  function lastRaceCard() {
    const r = D.race(D.CURRENT_YEAR, D.COMPLETED_ROUNDS);
    const score = D.scoreTips(r, D.MY_TIPS[r.track]).reduce((s, x) => s + x.points, 0);
    return card(`Letztes Rennen · ${esc(r.gp)}`, `
      <ol class="og-podium">${r.results.slice(0, 3).map((x) => `<li>${driverLink(x.driver)}<span class="og-muted">${x.time}</span></li>`).join('')}</ol>
      <p class="og-muted">Du hast <strong class="og-strong">${score} Punkte</strong> im Tippspiel geholt.</p>
      <div class="og-card__actions"><a class="btn btn--text" href="#tippspiel/auswertung">Punkte ansehen</a><a class="btn btn--text" href="#rennen/${D.CURRENT_YEAR}/${r.round}">Ergebnis</a></div>`, { icon: 'sports_score' });
  }

  function liveNowCard() {
    return card('Jetzt live', `
      <div class="og-status" data-live="status" data-short="true"></div>
      <div data-live="fav"></div>
      <div class="og-card__actions"><a class="btn btn--filled" href="#live">${icon('sensors', 'icon--small')}Zum Live-Rennen</a></div>`, { icon: 'sensors', cls: 'og-card--live' });
  }

  /* ==================================================================
     Seiten: Historische Daten (US11–US18)
     ================================================================== */
  const HISTORY_TABS = [
    { id: 'saisons', label: 'Saisons' },
    { id: 'verlauf', label: 'WM-Verlauf' },
    { id: 'fahrer', label: 'Fahrer' },
    { id: 'teams', label: 'Teams' },
    { id: 'strecken', label: 'Strecken' },
    { id: 'rundenzeiten', label: 'Rundenzeiten' },
    { id: 'laender', label: 'Länder' }
  ];
  const YEAR_CHIPS = D.YEARS.slice().reverse().map((y) => ({ id: y, label: String(y) }));

  function historyHub(ctx, tab, rest) {
    const sub = rest ? rest.split('/') : [];
    ctx.view.innerHTML = `<div class="og-page">
      ${pageHead('Historische Daten', 'Rennen, Fahrer, Teams und Strecken der Saisons 2023–2026')}
      <nav class="og-subnav" aria-label="Bereiche der Historie">${HISTORY_TABS.map((t) => `<a href="#historie/${t.id}" class="og-subnav__item${t.id === tab ? ' is-active' : ''}"${t.id === tab ? ' aria-current="page"' : ''}>${t.label}</a>`).join('')}</nav>
      <div data-sub></div>
      ${note('Beispieldaten – Ergebnisse sind erfunden; die Historie nutzt vereinfacht das Fahrerfeld von 2026.')}
    </div>`;
    const el = ctx.view.querySelector('[data-sub]');
    ({ saisons: seasonsTab, verlauf: progressTab, fahrer: driversTab, teams: teamsTab, strecken: tracksTab, rundenzeiten: lapsTab, laender: countriesTab }[tab] || seasonsTab)(ctx, el, sub);
  }

  /** US12: Rennergebnisse aller Rennen eines Jahres */
  function seasonsTab(ctx, el, sub) {
    const year = Number(sub[0]) || D.CURRENT_YEAR;
    const rows = D.season(year).map(function (r) {
      const t = D.TRACK[r.track];
      const live = year === D.CURRENT_YEAR && r.track === D.LIVE_TRACK;
      return `<tr>
        <td class="og-num">${r.round}</td>
        <td>${fmtDate(r.date)}</td>
        <td>${r.done ? `<a class="link" href="#rennen/${year}/${r.round}">${esc(t.gp)}</a>` : esc(t.gp)} ${countryTag(t.country)}</td>
        <td>${r.done ? driverLink(r.results[0].driver) : live ? '<a class="og-chip og-chip--live" href="#live"><span class="live-dot" aria-hidden="true"></span>Live</a>' : '<span class="og-muted">geplant</span>'}</td>
        <td>${r.done ? driverLink(r.pole, { short: true }) : '–'}</td>
      </tr>`;
    }).join('');
    el.innerHTML = `${chips(YEAR_CHIPS, year, (y) => `#historie/saisons/${y}`)}
      ${card(`Rennkalender ${year}`, `<div class="og-table"><table>
        <thead><tr><th scope="col" class="og-num">Rd.</th><th scope="col">Datum</th><th scope="col">Grand Prix</th><th scope="col">Sieger</th><th scope="col">Pole</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`, { icon: 'calendar_month' })}`;
  }

  function racePage(ctx, year, round) {
    const r = D.race(year, round);
    if (!r || !r.done) return notFound(ctx);
    const t = D.TRACK[r.track];
    const rows = r.results.map((x) => `<tr>
      <td class="og-pos">${x.status === 'Ziel' ? x.pos : '–'}</td>
      <td>${driverLink(x.driver)}</td>
      <td>${teamLink(x.team)}</td>
      <td class="og-num">${x.grid}</td>
      <td class="og-num">${x.status === 'Ziel' ? deltaText(x.grid - x.pos) : '–'}</td>
      <td class="og-num">${x.laps}</td>
      <td class="og-num">${x.time}</td>
      <td class="og-num"><strong>${x.points || ''}</strong></td>
    </tr>`).join('');
    ctx.view.innerHTML = `<div class="og-page">
      ${pageHead(esc(r.gp) + ' ' + year, `${esc(t.circuit)}, ${esc(t.city)} · Runde ${round} · ${fmtDate(r.date, true)}`, { back: `#historie/saisons/${year}`, backLabel: `Saison ${year}` })}
      <div class="og-stats">
        ${stat(driverLink(r.results[0].driver, { short: true }), 'Sieger', { accent: true })}
        ${stat(driverLink(r.pole, { short: true }), 'Pole-Position')}
        ${stat(driverLink(r.fastest, { short: true }), 'Schnellste Runde · ' + fmtLap(r.fastestTime))}
        ${stat(r.results.filter((x) => x.status !== 'Ziel').length, 'Ausfälle')}
      </div>
      ${card('Ergebnis', `<div class="og-table"><table>
        <thead><tr><th scope="col">Pos</th><th scope="col">Fahrer</th><th scope="col">Team</th><th scope="col" class="og-num">Start</th><th scope="col" class="og-num">+/−</th><th scope="col" class="og-num">Runden</th><th scope="col" class="og-num">Zeit</th><th scope="col" class="og-num">Punkte</th></tr></thead>
        <tbody>${rows}</tbody></table></div>`, { icon: 'sports_score' })}
      <div class="og-card__actions og-card__actions--start">
        <a class="btn btn--tonal" href="#historie/rundenzeiten/${year}/${round}/race">${icon('timer', 'icon--small')}Rundenzeiten</a>
        <a class="btn btn--tonal" href="#strecke/${t.id}">${icon('route', 'icon--small')}Strecke</a>
      </div>
      ${note()}
    </div>`;
  }

  function deltaText(delta) {
    if (delta > 0) return `<span class="og-delta og-delta--up">${icon('arrow_drop_up', 'icon--small')}${delta}</span>`;
    if (delta < 0) return `<span class="og-delta og-delta--down">${icon('arrow_drop_down', 'icon--small')}${-delta}</span>`;
    return '<span class="og-muted">0</span>';
  }

  /** US13: Punkteverlauf aller Fahrer bzw. Teams nach jedem Rennen */
  function progressTab(ctx, el, sub) {
    const year = Number(sub[0]) || D.CURRENT_YEAR;
    const kind = sub[1] === 'teams' ? 'teams' : 'drivers';
    const prog = D.standingsProgress(year);
    const ranking = D.standings(year, kind);
    let selected = ranking.slice(0, MAX_SERIES).map((s) => s.id);
    let colors = seriesColors(selected);

    el.innerHTML = `<div class="og-row">
        ${chips(YEAR_CHIPS, year, (y) => `#historie/verlauf/${y}/${kind}`)}
        ${chips([{ id: 'drivers', label: 'Fahrer' }, { id: 'teams', label: 'Teams' }], kind, (k) => `#historie/verlauf/${year}/${k}`)}
      </div>
      ${card(`Punkteverlauf ${year}`, `<p class="og-muted">Bis zu ${MAX_SERIES} ${kind === 'teams' ? 'Teams' : 'Fahrer'} vergleichen – antippen zum Ein- und Ausblenden.</p>
        <div class="og-pick" data-pick></div><div data-chart></div>`, { icon: 'show_chart' })}`;

    const pick = el.querySelector('[data-pick]');
    function render() {
      pick.innerHTML = ranking.map(function (s) {
        const on = selected.includes(s.id);
        const label = kind === 'teams' ? D.TEAM[s.id].name : driver(s.id).code;
        return `<button type="button" class="og-pick__item${on ? ' is-on' : ''}" data-id="${s.id}" aria-pressed="${on}"${!on && selected.length >= MAX_SERIES ? ' disabled' : ''}>
          <span class="og-chart__key" style="background:${on ? colors[s.id] : 'transparent'}"></span>${esc(label)}<span class="og-muted">${s.points}</span></button>`;
      }).join('');
      mountLineChart(ctx, el.querySelector('[data-chart]'), {
        label: `Kumulierte WM-Punkte ${year}`,
        xTitle: 'Runde',
        x: prog.rounds.map(String),
        yMin: 0,
        series: selected.map((id) => ({
          id,
          label: kind === 'teams' ? D.TEAM[id].name : fullName(id),
          short: kind === 'teams' ? D.TEAM[id].name : driver(id).code,
          color: colors[id],
          values: (kind === 'teams' ? prog.teams : prog.drivers)[id]
        })),
        format: (v) => num(v)
      });
    }
    pick.addEventListener('click', function (event) {
      const button = event.target.closest('[data-id]');
      if (!button) return;
      const id = button.dataset.id;
      selected = selected.includes(id) ? selected.filter((x) => x !== id) : selected.concat(id);
      if (!selected.length) selected = [id];
      colors = seriesColors(selected, colors);
      render();
    });
    render();
  }

  function driversTab(ctx, el) {
    el.innerHTML = `<ul class="og-grid og-grid--drivers">${D.DRIVERS.map((d) => `<li>
      <a class="og-person" href="#fahrer/${d.id}" style="--team:${teamOf(d.id).color}">
        <span class="og-person__num">${d.num}</span>
        <span class="og-person__name"><span>${esc(d.first)}</span><strong>${esc(d.last)}</strong></span>
        <span class="og-person__meta">${countryTag(d.country)} ${esc(teamOf(d.id).name)}</span>
      </a></li>`).join('')}</ul>`;
  }

  /** US11: Fahrerprofil mit aggregierten Kennzahlen */
  function driverPage(ctx, id) {
    const d = driver(id);
    if (!d) return notFound(ctx);
    const s = D.driverStats(id);
    const t = teamOf(id);
    const recent = D.season(D.CURRENT_YEAR).filter((r) => r.done).slice(-5).reverse();
    const isFav = profile.get().favDriver === id;
    ctx.view.innerHTML = `<div class="og-page">
      <header class="og-profile-head" style="--team:${t.color}">
        <a class="og-back" href="#historie/fahrer">${icon('arrow_back', 'icon--small')}Alle Fahrer</a>
        <span class="og-profile-head__num" aria-hidden="true">${d.num}</span>
        <div class="og-profile-head__text">
          <span class="og-page__kicker">${countryTag(d.country)} ${esc(D.COUNTRIES[d.country])} · Debüt ${d.debut}</span>
          <h1 class="og-page__title"><span class="og-light">${esc(d.first)}</span> ${esc(d.last)}</h1>
          <p class="og-page__sub">${teamLink(d.team)} · #${d.num}</p>
        </div>
        <button class="btn ${isFav ? 'btn--tonal' : 'btn--outlined'}" type="button" data-fav-driver aria-pressed="${isFav}">${icon(isFav ? 'favorite' : 'favorite_border', 'icon--small')}${isFav ? 'Lieblingsfahrer' : 'Als Favorit'}</button>
      </header>
      <div class="og-stats">
        ${stat(s.races, 'Rennen')}${stat(s.wins, 'Siege', { accent: true })}${stat(s.podiums, 'Podien')}${stat(s.poles, 'Pole-Positions')}${stat(num(s.points), 'Punkte')}${stat(s.dnfs, 'Ausfälle')}
      </div>
      <div class="og-grid og-grid--2">
        ${card('Punkte je Saison', bars(s.seasons.map((x) => ({ label: String(x.year), value: x.points })), { format: (v) => num(v) + ' Pkt.' }) +
          `<p class="og-muted og-small">WM-Platz: ${s.seasons.map((x) => `${x.year}: ${x.rank}.`).join(' · ')}</p>`, { icon: 'bar_chart' })}
        ${card('Karriere-Teams', `<ol class="og-timeline">${d.career.map((name) => `<li>${esc(name)}</li>`).join('')}</ol>`, { icon: 'groups' })}
      </div>
      ${card('Letzte Rennen ' + D.CURRENT_YEAR, `<div class="og-table"><table><thead><tr><th scope="col">Grand Prix</th><th scope="col" class="og-num">Start</th><th scope="col" class="og-num">Ziel</th><th scope="col" class="og-num">Punkte</th></tr></thead><tbody>
        ${recent.map(function (r) {
          const x = r.results.find((y) => y.driver === id);
          return `<tr><td><a class="link" href="#rennen/${r.year}/${r.round}">${esc(r.gp)}</a></td><td class="og-num">${x.grid}</td><td class="og-num">${x.status === 'Ziel' ? x.pos : 'DNF'}</td><td class="og-num">${x.points}</td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="og-card__actions og-card__actions--start"><a class="btn btn--tonal" href="#historie/rundenzeiten/${D.CURRENT_YEAR}/${recent[0].round}/race/${id}">${icon('timer', 'icon--small')}Rundenzeiten vergleichen</a></div>`, { icon: 'history' })}
      ${note('Kennzahlen im Datensatz 2023–2026 (Beispieldaten).')}
    </div>`;
    ctx.view.querySelector('[data-fav-driver]').addEventListener('click', function () {
      profile.set({ favDriver: id, favTeam: d.team });
      driverPage(ctx, id);
    });
  }

  function teamsTab(ctx, el) {
    el.innerHTML = `<ul class="team-grid og-grid--teams">${D.TEAMS.map((t) => `<li><a class="team-tile og-team-tile" href="#team/${t.id}" style="--team-color:${t.color}">
      ${teamLogo(t.id)}<span class="team-tile__name">${esc(t.name)}</span></a></li>`).join('')}</ul>`;
  }

  /** US14 Team-Statistik je Jahr + US15 Fahrzeug */
  function teamPage(ctx, id, yearParam) {
    const t = D.TEAM[id];
    if (!t) return notFound(ctx);
    const year = Number(yearParam) || D.CURRENT_YEAR;
    const s = D.teamStats(id, year);
    ctx.view.innerHTML = `<div class="og-page">
      <header class="og-profile-head og-profile-head--team" style="--team:${t.color}">
        <a class="og-back" href="#historie/teams">${icon('arrow_back', 'icon--small')}Alle Teams</a>
        <span class="og-profile-head__logo">${teamLogo(id, 'lg')}</span>
        <div class="og-profile-head__text">
          <span class="og-page__kicker">${countryTag(t.country)} ${esc(t.base)} · in der F1 seit ${t.entry}</span>
          <h1 class="og-page__title">${esc(t.name)}</h1>
          <p class="og-page__sub">Teamchef: ${esc(t.principal)}</p>
        </div>
      </header>
      ${chips(YEAR_CHIPS, year, (y) => `#team/${id}/${y}`)}
      <div class="og-stats">
        ${stat(s.rank + '.', 'WM-Platz ' + year, { accent: true })}${stat(num(s.points), 'Punkte')}${stat(s.wins, 'Siege')}${stat(s.podiums, 'Podien')}${stat(s.poles, 'Pole-Positions')}${stat(s.avgPos ? num(s.avgPos, 1) : '–', 'Ø Platzierung')}
      </div>
      <div class="og-grid og-grid--2">
        ${card('Fahrer ' + year, s.drivers.map((d) => `<a class="og-fav-row" href="#fahrer/${d.id}" style="--team:${t.color}"><span class="og-fav-row__num">${d.num}</span><span class="og-fav-row__text"><strong>${esc(d.first)} ${esc(d.last)}</strong><span>${countryTag(d.country)} ${esc(D.COUNTRIES[d.country])}</span></span>${icon('chevron_right')}</a>`).join(''), { icon: 'sports_motorsports' })}
        ${card('Fahrzeug', `<dl class="og-facts">
          <div><dt>Chassis</dt><dd>${esc(t.chassis)}</dd></div>
          <div><dt>Motor</dt><dd>${esc(t.engine)}</dd></div>
          <div><dt>Reifen</dt><dd>Pirelli</dd></div>
          <div><dt>Basis</dt><dd>${esc(t.base)}, ${esc(D.COUNTRIES[t.country])}</dd></div>
          <div><dt>Teamchef</dt><dd>${esc(t.principal)}</dd></div>
        </dl>`, { icon: 'build' })}
      </div>
      ${card('Motorhersteller im Feld', bars(Object.entries(D.TEAMS.reduce((acc, x) => ((acc[x.engine] = (acc[x.engine] || 0) + 1), acc), {}))
        .sort((a, b) => b[1] - a[1]).map(([engine, count]) => ({ label: esc(engine), value: count, mine: engine === t.engine })), { format: (v) => `${v} Team${v === 1 ? '' : 's'}` }), { icon: 'settings' })}
      ${note()}
    </div>`;
  }

  function tracksTab(ctx, el) {
    el.innerHTML = `<ul class="og-grid og-grid--tracks">${D.TRACKS.map((t) => `<li><a class="og-track" href="#strecke/${t.id}">
      <span class="og-track__flag">${countryTag(t.country)}</span>
      <span class="og-track__name"><strong>${esc(t.gp)}</strong><span>${esc(t.circuit)}</span></span>
      <span class="og-track__meta">${num(t.km, 3)} km · ${t.laps} Runden</span></a></li>`).join('')}</ul>`;
  }

  /** US17: historische Streckendaten */
  function trackPage(ctx, id) {
    const t = D.TRACK[id];
    if (!t) return notFound(ctx);
    const h = D.trackHistory(id);
    ctx.view.innerHTML = `<div class="og-page">
      ${pageHead(esc(t.circuit), `${esc(t.gp)} · ${esc(t.city)}, ${esc(D.COUNTRIES[t.country])}`, { back: '#historie/strecken', backLabel: 'Alle Strecken', kicker: countryTag(t.country) })}
      <div class="og-stats">
        ${stat(num(t.km, 3) + ' km', 'Streckenlänge')}${stat(t.laps, 'Runden')}${stat(num(t.km * t.laps, 1) + ' km', 'Renndistanz')}
        ${stat(fmtLap(h.record.time), `Rundenrekord · ${driver(h.record.driver).code} ${h.record.year}`, { accent: true })}
      </div>
      ${card('Sieger', `<div class="og-table"><table><thead><tr><th scope="col">Jahr</th><th scope="col">Sieger</th><th scope="col">Team</th><th scope="col"></th></tr></thead><tbody>
        ${h.winners.slice().reverse().map((w) => `<tr><td>${w.year}</td><td>${w.winner ? driverLink(w.winner) : (w.race ? '<span class="og-muted">noch nicht gefahren</span>' : '<span class="og-muted">nicht im Kalender</span>')}</td>
          <td>${w.winner ? teamLink(driver(w.winner).team) : ''}</td>
          <td>${w.winner ? `<a class="link" href="#rennen/${w.year}/${w.race.round}">Ergebnis</a>` : ''}</td></tr>`).join('')}
      </tbody></table></div>`, { icon: 'emoji_events' })}
      ${note()}
    </div>`;
  }

  /** US18: Rundenzeiten aller Fahrer, Qualifying und Rennen */
  function lapsTab(ctx, el, sub) {
    const year = Number(sub[0]) || D.CURRENT_YEAR;
    const done = D.season(year).filter((r) => r.done);
    const round = Number(sub[1]) || done[done.length - 1].round;
    const session = sub[2] === 'quali' ? 'quali' : 'race';
    const r = D.race(year, round);
    let selected = sub[3] ? sub[3].split(',').filter((id) => D.DRIVER[id]).slice(0, MAX_SERIES) : r.results.slice(0, 3).map((x) => x.driver);
    if (sub[3] && selected.length === 1 && !r.results.slice(0, 2).some((x) => x.driver === selected[0])) selected.push(r.results[0].driver);
    let colors = seriesColors(selected);
    const go = (y, rd, s, ids) => `#historie/rundenzeiten/${y}/${rd}/${s}/${ids.join(',')}`;

    el.innerHTML = `<div class="og-form-row">
        <label class="select-field"><span class="select-field__label">Jahr</span><select data-year>${D.YEARS.map((y) => `<option${y === year ? ' selected' : ''}>${y}</option>`).join('')}</select></label>
        <label class="select-field"><span class="select-field__label">Rennen</span><select data-round>${done.map((x) => `<option value="${x.round}"${x.round === round ? ' selected' : ''}>${x.round}. ${esc(x.gp)}</option>`).join('')}</select></label>
        ${chips([{ id: 'race', label: 'Rennen' }, { id: 'quali', label: 'Qualifying' }], session, (s) => go(year, round, s, selected))}
      </div>
      ${card(`Rundenzeiten · ${esc(r.gp)} ${year}`, `<p class="og-muted">Bis zu ${MAX_SERIES} Fahrer vergleichen.${session === 'race' ? ' Runden mit Boxenstopp und Startrunde sind im Diagramm ausgeblendet (in der Tabelle enthalten).' : ''}</p>
        <div class="og-pick" data-pick></div><div data-chart></div>`, { icon: 'timer' })}`;

    el.querySelector('[data-year]').addEventListener('change', function (e) {
      const y = Number(e.target.value);
      location.hash = go(y, D.roundsDone(y), session, selected);
    });
    el.querySelector('[data-round]').addEventListener('change', (e) => (location.hash = go(year, e.target.value, session, selected)));

    const pick = el.querySelector('[data-pick]');
    function render() {
      pick.innerHTML = r.results.map(function (x) {
        const on = selected.includes(x.driver);
        return `<button type="button" class="og-pick__item${on ? ' is-on' : ''}" data-id="${x.driver}" aria-pressed="${on}"${!on && selected.length >= MAX_SERIES ? ' disabled' : ''}>
          <span class="og-chart__key" style="background:${on ? colors[x.driver] : 'transparent'}"></span>${driver(x.driver).code}</button>`;
      }).join('');
      const all = selected.map((id) => ({ id, laps: D.lapTimes(year, round, session, id) }));
      const length = Math.max.apply(null, all.map((a) => a.laps.length));
      const clean = all.map(function (a) {
        const valid = a.laps.filter((v) => v !== null).slice().sort((p, q) => p - q);
        const median = valid[Math.floor(valid.length / 2)];
        return a.laps.map((v, i) => (v === null || (session === 'race' && (i === 0 || v > median + 6)) ? null : v));
      });
      mountLineChart(ctx, el.querySelector('[data-chart]'), {
        label: 'Rundenzeiten in Sekunden',
        xTitle: session === 'quali' ? 'Versuch' : 'Runde',
        x: Array.from({ length }, (_, i) => String(i + 1)),
        ascending: true,
        series: all.map((a, i) => ({ id: a.id, label: fullName(a.id), short: driver(a.id).code, color: colors[a.id], values: clean[i] })),
        format: (v) => fmtLap(v)
      });
    }
    pick.addEventListener('click', function (event) {
      const button = event.target.closest('[data-id]');
      if (!button) return;
      const id = button.dataset.id;
      selected = selected.includes(id) ? selected.filter((x) => x !== id) : selected.concat(id);
      if (!selected.length) selected = [id];
      colors = seriesColors(selected, colors);
      history.replaceState(null, '', go(year, round, session, selected));
      render();
    });
    render();
  }

  /** US16: Länder mit Strecken und Fahrern */
  function countriesTab(ctx, el) {
    const codes = Array.from(new Set(D.TRACKS.map((t) => t.country).concat(D.DRIVERS.map((d) => d.country))))
      .sort((a, b) => D.COUNTRIES[a].localeCompare(D.COUNTRIES[b], 'de'));
    el.innerHTML = card('Länder', `<div class="og-table"><table>
      <thead><tr><th scope="col">Land</th><th scope="col">Strecken</th><th scope="col">Fahrer</th></tr></thead>
      <tbody>${codes.map(function (code) {
        const tracks = D.TRACKS.filter((t) => t.country === code);
        const drivers = D.DRIVERS.filter((d) => d.country === code);
        return `<tr><td>${countryTag(code)} ${esc(D.COUNTRIES[code])}</td>
          <td>${tracks.map((t) => `<a class="link" href="#strecke/${t.id}">${esc(t.circuit)}</a>`).join(', ') || '<span class="og-muted">–</span>'}</td>
          <td class="og-wrap">${drivers.map((d) => driverLink(d.id, { short: true })).join(' ') || '<span class="og-muted">–</span>'}</td></tr>`;
      }).join('')}</tbody></table></div>`, { icon: 'public' });
  }

  /* ==================================================================
     Seite: Tippspiel (US07, US19–US22, US-NFR06)
     ================================================================== */
  const TIP_TABS = [
    { id: 'tipp', label: 'Tipp abgeben' },
    { id: 'rangliste', label: 'Rangliste' },
    { id: 'auswertung', label: 'Auswertung' }
  ];
  const TIPS_KEY = 'opengrid.tips.' + D.TIP_TRACK;

  function loadTips() {
    try {
      return JSON.parse(localStorage.getItem(TIPS_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function tipValueLabel(cat, value, isResult) {
    if (value === null || value === undefined || value === '') return `<span class="og-muted">${isResult ? 'keiner' : 'kein Tipp'}</span>`;
    if (cat.type === 'driver') return driverLink(value, { short: true });
    if (cat.type === 'tyre') return `${tyre(value)} ${D.TYRE[value].name}`;
    return esc(value);
  }

  function tippPage(ctx, tab) {
    tab = TIP_TABS.some((t) => t.id === tab) ? tab : 'tipp';
    ctx.view.innerHTML = `<div class="og-page">
      ${pageHead('Tippspiel', 'Tippe auf das Rennwochenende und vergleiche dich mit der Community.', {
        aside: `<div class="og-rankbox"><span class="og-rankbox__value">${num(D.ME.rank)}.</span><span class="og-rankbox__label">von ${num(D.leaderboard('global').total)} · ${D.ME.points} Pkt.</span></div>`
      })}
      <nav class="og-subnav" aria-label="Bereiche des Tippspiels">${TIP_TABS.map((t) => `<a href="#tippspiel/${t.id}" class="og-subnav__item${t.id === tab ? ' is-active' : ''}"${t.id === tab ? ' aria-current="page"' : ''}>${t.label}</a>`).join('')}</nav>
      <div data-sub></div>
      ${note()}
    </div>`;
    const el = ctx.view.querySelector('[data-sub]');
    ({ tipp: tipForm, rangliste: boardTab, auswertung: breakdownTab })[tab](ctx, el);
  }

  function tipForm(ctx, el) {
    const t = D.TRACK[D.TIP_TRACK];
    const tips = loadTips();
    const p = profile.get();
    const groups = [
      { id: 'basis', label: 'Ergebnis' },
      { id: 'extra', label: 'Erweiterte Tipps' },
      { id: 'strategie', label: 'Strategie' }
    ];
    const driverOptions = (value) => `<option value="">– wählen –</option>` + D.DRIVERS.map((d) => `<option value="${d.id}"${value === d.id ? ' selected' : ''}>${d.code} · ${esc(d.first)} ${esc(d.last)}</option>`).join('');

    function field(cat) {
      const v = tips[cat.id];
      const trend = D.communityTrends(D.TIP_TRACK, cat.id)[0];
      const trendLabel = trend.option === null ? '' : cat.type === 'driver' ? driver(trend.option).code : cat.type === 'tyre' ? D.TYRE[trend.option].name : trend.option;
      let input;
      if (cat.type === 'driver') {
        input = `<select id="tip-${cat.id}" name="${cat.id}">${driverOptions(v)}</select>`;
      } else if (cat.type === 'tyre') {
        input = `<div class="og-segmented" role="radiogroup" aria-labelledby="tip-${cat.id}-label">${['soft', 'medium', 'hard'].map((id) => `<label><input type="radio" name="${cat.id}" value="${id}"${v === id ? ' checked' : ''}>${tyre(id)}<span>${D.TYRE[id].name}</span></label>`).join('')}</div>`;
      } else {
        input = `<div class="og-stepper"><button type="button" class="icon-btn" data-step="-1" aria-label="${esc(cat.label)} verringern">${icon('remove')}</button>
          <input id="tip-${cat.id}" name="${cat.id}" type="number" inputmode="numeric" min="${cat.min}" max="${cat.max}" value="${v !== undefined ? esc(v) : ''}" placeholder="–">
          <button type="button" class="icon-btn" data-step="1" aria-label="${esc(cat.label)} erhöhen">${icon('add')}</button></div>`;
      }
      return `<div class="og-field">
        <label class="og-field__label" id="tip-${cat.id}-label" for="tip-${cat.id}">${esc(cat.label)}<span class="og-field__points">${cat.points} Pkt.</span></label>
        ${input}
        <span class="og-field__hint">${icon('groups', 'icon--small')}Community: ${trend.share} % ${esc(trendLabel)}</span>
      </div>`;
    }

    const live = D.MY_TIPS[D.LIVE_TRACK];
    el.innerHTML = `<div class="og-grid og-grid--tip">
      <form class="og-card og-tipform" data-tip-form novalidate>
        <header class="og-card__head">${icon('edit_note', 'og-card__icon')}<h2 class="og-card__title">Dein Tipp · ${esc(t.gp)}</h2></header>
        <div class="og-card__body">
          <div class="og-deadline">
            ${icon('hourglass_top')}
            <div><strong>Tippschluss in ${countdown(TIP_DEADLINE)}</strong><span class="og-muted">Qualifying-Start, ${fmtDate('2026-10-31')} 21:00 Uhr</span></div>
            <label class="og-switch"><input type="checkbox" data-remind${p.remindTip ? ' checked' : ''}><span class="og-switch__track" aria-hidden="true"></span>Erinnerung 1 h vorher</label>
          </div>
          ${groups.map((g) => `<fieldset class="og-fieldset"><legend>${g.label}</legend><div class="og-fields">${D.TIP_CATEGORIES.filter((c) => c.group === g.id).map(field).join('')}</div></fieldset>`).join('')}
          <div class="og-card__actions">
            <p class="og-save-state" data-save-state aria-live="polite">${p.tipsSaved ? `${icon('check_circle', 'icon--small og-ok')}Gespeichert ${esc(p.tipsSaved)}` : ''}</p>
            <button class="btn btn--filled" type="submit">${icon('send', 'icon--small')}Tipp speichern</button>
          </div>
        </div>
      </form>
      <div class="og-stack">
        ${card(`Live-Wertung · ${esc(D.TRACK[D.LIVE_TRACK].gp)}`, `<p class="og-muted">Vorläufige Punkte deines Tipps nach aktuellem Rennstand.</p>
          <div class="og-live-score" data-live-score></div>`, { icon: 'sensors', cls: 'og-card--live' })}
        ${card('Community-Tendenzen', ['p1', 'pole', 'fastest'].map(function (catId) {
          const cat = D.TIP_CATEGORIES.find((c) => c.id === catId);
          return `<h3 class="og-subhead">${esc(cat.label)}</h3>` + bars(D.communityTrends(D.TIP_TRACK, catId).map((x) => ({
            label: x.option === null ? 'Andere' : driver(x.option).code,
            value: x.share,
            mine: x.option !== null && tips[catId] === x.option
          })), { max: 100, format: (v) => v + ' %' });
        }).join(''), { icon: 'groups' })}
      </div>
    </div>`;

    const form = el.querySelector('[data-tip-form]');
    form.addEventListener('click', function (event) {
      const step = event.target.closest('[data-step]');
      if (!step) return;
      const input = step.parentElement.querySelector('input');
      const next = (Number(input.value) || 0) + Number(step.dataset.step);
      input.value = Math.max(Number(input.min), Math.min(Number(input.max), next));
    });
    el.querySelector('[data-remind]').addEventListener('change', (e) => profile.set({ remindTip: e.target.checked }));
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      const data = {};
      new FormData(form).forEach((value, key) => (data[key] = value));
      const stateEl = el.querySelector('[data-save-state]');
      const button = form.querySelector('[type="submit"]');
      button.disabled = true;
      stateEl.innerHTML = `${icon('progress_activity', 'icon--small og-spin')}Wird gespeichert …`;
      // US-NFR06: Tipp wird sofort lokal gesichert und dann gesendet
      setTimeout(function () {
        try {
          localStorage.setItem(TIPS_KEY, JSON.stringify(data));
        } catch (err) {
          // kein lokaler Speicher – Tipp gilt nur bis zum Neuladen
        }
        const time = fmtTime(new Date()).slice(0, 5);
        const offline = !L.state.online;
        profile.set({ tipsSaved: `heute ${time}` });
        stateEl.innerHTML = offline
          ? `${icon('cloud_off', 'icon--small')}Offline gespeichert ${time} – wird gesendet, sobald du wieder online bist`
          : `${icon('check_circle', 'icon--small og-ok')}Gespeichert heute ${time}`;
        button.disabled = false;
      }, 700);
    });

    const scoreEl = el.querySelector('[data-live-score]');
    mountLive(ctx, el, {
      onState(state) {
        const order = state.cars.filter((c) => c.status !== 'out').map((c) => c.id);
        const lines = [
          { label: 'Sieger', tip: live.p1, ok: order[0] === live.p1, pts: 10 },
          { label: 'Platz 2', tip: live.p2, ok: order[1] === live.p2, pts: 6 },
          { label: 'Platz 3', tip: live.p3, ok: order[2] === live.p3, pts: 4 },
          { label: 'Schnellste Runde', tip: live.fastest, ok: state.fastest && state.fastest.driver === live.fastest, pts: 4 }
        ];
        const sum = lines.reduce((s, x) => s + (x.ok ? x.pts : 0), 0);
        const html = `<p class="og-live-score__sum"><strong>${sum}</strong> Pkt. vorläufig</p><ul class="og-checks">${lines.map((x) => `<li class="${x.ok ? 'is-ok' : ''}">${icon(x.ok ? 'check_circle' : 'radio_button_unchecked', 'icon--small')}${x.label}: ${driver(x.tip).code}</li>`).join('')}</ul>`;
        if (scoreEl.dataset.html !== html) {
          scoreEl.innerHTML = html;
          scoreEl.dataset.html = html;
        }
      }
    });
  }

  function boardTab(ctx, el, scopeParam) {
    let scope = scopeParam || 'global';
    function render() {
      const board = D.leaderboard(scope);
      el.innerHTML = `<div class="og-row">
          <div class="og-chips" role="tablist">
            <button type="button" role="tab" class="og-filter${scope === 'global' ? ' is-active' : ''}" aria-selected="${scope === 'global'}" data-scope="global">Global</button>
            <button type="button" role="tab" class="og-filter${scope === 'gruppe' ? ' is-active' : ''}" aria-selected="${scope === 'gruppe'}" data-scope="gruppe">Gruppe TINF24IT1</button>
          </div>
          <span class="og-muted">${num(board.total)} Teilnehmende</span>
        </div>
        ${card(scope === 'gruppe' ? 'Private Gruppe' : 'Globales Leaderboard', `<ol class="og-board">${board.rows.map((row, i) => `${i > 0 && row.rank - board.rows[i - 1].rank > 1 ? '<li class="og-board__gap" aria-hidden="true">⋯</li>' : ''}<li class="og-board__row${row.me ? ' is-me' : ''}">
          <span class="og-board__rank">${row.rank <= 3 ? `<span class="og-medal og-medal--${row.rank}">${row.rank}</span>` : num(row.rank)}</span>
          <span class="og-board__name">${esc(row.name)}${row.me ? ' <span class="og-tag">Du</span>' : ''}</span>
          <span class="og-board__trend">${row.trend > 0 ? deltaText(row.trend) : row.trend < 0 ? deltaText(row.trend) : ''}</span>
          <span class="og-board__points">${num(row.points)}</span>
        </li>`).join('')}</ol>`, { icon: 'leaderboard' })}`;
      el.querySelectorAll('[data-scope]').forEach((b) => b.addEventListener('click', function () {
        scope = b.dataset.scope;
        render();
      }));
    }
    render();
  }

  function breakdownTab(ctx, el) {
    const r = D.race(D.CURRENT_YEAR, D.COMPLETED_ROUNDS);
    const scored = D.scoreTips(r, D.MY_TIPS[r.track]);
    const total = scored.reduce((s, x) => s + x.points, 0);
    const max = scored.reduce((s, x) => s + x.cat.points, 0);
    el.innerHTML = `<div class="og-stats">
        ${stat(total, 'Punkte ' + esc(r.gp), { accent: true })}${stat(max, 'maximal möglich')}${stat(scored.filter((x) => x.points === x.cat.points).length + '/' + scored.length, 'Volltreffer')}${stat('+37', 'Plätze im Leaderboard')}
      </div>
      ${card(`Aufschlüsselung · ${esc(r.gp)}`, `<div class="og-table"><table>
        <thead><tr><th scope="col">Kategorie</th><th scope="col">Dein Tipp</th><th scope="col">Ergebnis</th><th scope="col" class="og-num">Punkte</th></tr></thead>
        <tbody>${scored.map((x) => `<tr class="${x.points === x.cat.points ? 'is-hit' : x.points > 0 ? 'is-partial' : ''}">
          <td>${esc(x.cat.label)}</td><td>${tipValueLabel(x.cat, x.tip)}</td><td>${tipValueLabel(x.cat, x.actual, true)}</td>
          <td class="og-num"><strong>${x.points}</strong><span class="og-muted"> / ${x.cat.points}</span>${x.points === x.cat.points ? ' ' + icon('check_circle', 'icon--small og-ok') : x.points > 0 ? ' ' + icon('adjust', 'icon--small') : ''}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><th scope="row" colspan="3">Summe</th><td class="og-num"><strong>${total}</strong><span class="og-muted"> / ${max}</span></td></tr></tfoot>
      </table></div>
      <p class="og-muted og-small">${icon('check_circle', 'icon--small og-ok')} Volltreffer · ${icon('adjust', 'icon--small')} Teilpunkte (Podium in falscher Reihenfolge oder Zahl um 1 daneben)</p>`, { icon: 'receipt_long' })}`;
  }

  /* ==================================================================
     Seite: Profil (US08, US10, US-NFR04)
     ================================================================== */
  function profilePage(ctx) {
    const p = profile.get();
    ctx.view.innerHTML = `<div class="og-page">
      ${pageHead('Profil', 'Deine Daten, Favoriten und Benachrichtigungen')}
      <div class="og-grid og-grid--2">
        ${card('Konto', `<div class="og-account">
            <span class="avatar og-account__avatar">${icon('person')}</span>
            <div><strong>${esc(D.ME.name)}</strong><span class="og-muted">${esc(D.ME.email)}</span><span class="og-muted">Tippspiel-Name: ${esc(D.ME.handle)}</span></div>
          </div>
          <ul class="og-checks og-checks--plain">
            <li>${icon('lock', 'icon--small')}Passwort verschlüsselt übertragen (TLS) und gehasht gespeichert</li>
            <li>${icon('verified_user', 'icon--small')}Zwei-Faktor-Anmeldung aktiv</li>
          </ul>
          <div class="og-card__actions og-card__actions--start">
            <button class="btn btn--outlined" type="button">${icon('key', 'icon--small')}Passwort ändern</button>
            <a class="btn btn--text" href="desktop-login.html">${icon('logout', 'icon--small')}Abmelden</a>
          </div>`, { icon: 'account_circle' })}
        ${card('Favoriten', `<p class="og-muted">Werden auf der Startseite, in der Live-Tabelle und auf der Karte hervorgehoben.</p>
          <div class="og-fields">
            <div class="og-field"><label class="og-field__label" for="fav-driver">Lieblingsfahrer</label>
              <select id="fav-driver" data-fav="favDriver">${D.DRIVERS.map((d) => `<option value="${d.id}"${p.favDriver === d.id ? ' selected' : ''}>${d.code} · ${esc(d.first)} ${esc(d.last)}</option>`).join('')}</select></div>
            <div class="og-field"><label class="og-field__label" for="fav-team">Lieblingsteam</label>
              <select id="fav-team" data-fav="favTeam">${D.TEAMS.map((t) => `<option value="${t.id}"${p.favTeam === t.id ? ' selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
          </div>
          <div data-fav-preview></div>`, { icon: 'favorite' })}
      </div>
      ${card('Benachrichtigungen', `<div class="og-switches">
        <label class="og-switch"><input type="checkbox" data-pref="remindTip"${p.remindTip ? ' checked' : ''}><span class="og-switch__track" aria-hidden="true"></span>Erinnerung vor Tippschluss</label>
        <label class="og-switch"><input type="checkbox" data-pref="notifyStart"${p.notifyStart ? ' checked' : ''}><span class="og-switch__track" aria-hidden="true"></span>Rennstart</label>
        <label class="og-switch"><input type="checkbox" data-pref="notifyFavPit"${p.notifyFavPit ? ' checked' : ''}><span class="og-switch__track" aria-hidden="true"></span>Lieblingsfahrer in der Box</label>
      </div>`, { icon: 'notifications' })}
    </div>`;
    const preview = ctx.view.querySelector('[data-fav-preview]');
    function renderPreview() {
      const q = profile.get();
      preview.innerHTML = `<div class="og-fav-preview">${driverLink(q.favDriver)} ${teamLink(q.favTeam)}</div>`;
    }
    ctx.view.querySelectorAll('[data-fav]').forEach((s) => s.addEventListener('change', function () {
      profile.set({ [s.dataset.fav]: s.value });
      renderPreview();
    }));
    ctx.view.querySelectorAll('[data-pref]').forEach((s) => s.addEventListener('change', () => profile.set({ [s.dataset.pref]: s.checked })));
    renderPreview();
  }

  function notFound(ctx) {
    ctx.view.innerHTML = `<div class="og-page og-empty">${icon('search_off', 'icon--large')}<h1 class="og-page__title">Nicht gefunden</h1><a class="btn btn--tonal" href="#home">Zur Startseite</a></div>`;
  }

  /* ==================================================================
     Router + App-Rahmen
     ================================================================== */
  let cfg;
  let current = { cleanups: [] };

  const ROUTES = [
    { re: /^(home)?$/, section: 'home', run: (ctx) => cfg.layouts.home(ctx), title: 'Start' },
    { re: /^live$/, section: 'live', run: (ctx) => cfg.layouts.live(ctx), title: 'Live' },
    { re: /^historie(?:\/([a-z]+))?(?:\/(.+))?$/, section: 'historie', run: (ctx, m) => historyHub(ctx, m[1] || 'saisons', m[2]), title: 'Historische Daten' },
    { re: /^rennen\/(\d{4})\/(\d+)$/, section: 'historie', run: (ctx, m) => racePage(ctx, Number(m[1]), Number(m[2])), title: 'Rennergebnis' },
    { re: /^fahrer\/([a-z]+)$/, section: 'historie', run: (ctx, m) => driverPage(ctx, m[1]), title: 'Fahrer' },
    { re: /^team\/([a-z-]+)(?:\/(\d{4}))?$/, section: 'historie', run: (ctx, m) => teamPage(ctx, m[1], m[2]), title: 'Team' },
    { re: /^strecke\/([a-z]+)$/, section: 'historie', run: (ctx, m) => trackPage(ctx, m[1]), title: 'Strecke' },
    { re: /^tippspiel(?:\/([a-z]+))?$/, section: 'tippspiel', run: (ctx, m) => tippPage(ctx, m[1]), title: 'Tippspiel' },
    { re: /^profil$/, section: 'profil', run: (ctx) => profilePage(ctx), title: 'Profil' }
  ];

  function route() {
    current.cleanups.forEach((fn) => fn());
    const hash = decodeURIComponent(location.hash.slice(1));
    const view = document.querySelector('[data-view]');
    const ctx = { view, cleanups: [], on(fn) { this.cleanups.push(fn); } };
    current = ctx;
    let match = null;
    const r = ROUTES.find((x) => (match = hash.match(x.re)));
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      const active = r && el.dataset.nav === r.section;
      el.classList.toggle('is-active', active);
      if (active) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-nav-title]').forEach((el) => (el.textContent = r ? r.title : ''));
    view.innerHTML = '';
    if (r) r.run(ctx, match);
    else notFound(ctx);
    document.title = `OpenGrid – ${r ? r.title : 'Nicht gefunden'} (${cfg.name})`;
    tickCountdowns();
    if (cfg.onRoute) cfg.onRoute(r ? r.section : null);
    (document.querySelector('[data-scroll]') || document.scrollingElement).scrollTop = 0;
  }

  function tickCountdowns() {
    document.querySelectorAll('[data-countdown]').forEach(function (el) {
      const ms = new Date(el.dataset.countdown) - Date.now();
      if (ms <= 0) {
        el.textContent = 'geschlossen';
        return;
      }
      const d = Math.floor(ms / 864e5);
      const h = Math.floor((ms % 864e5) / 36e5);
      const m = Math.floor((ms % 36e5) / 6e4);
      const s = Math.floor((ms % 6e4) / 1e3);
      el.textContent = `${d} T ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    });
  }

  /** Offline-Hinweis (US-NFR05) über dem Inhalt */
  function mountOfflineBanner() {
    const view = document.querySelector('[data-view]');
    const banner = document.createElement('p');
    banner.className = 'og-offline';
    banner.setAttribute('role', 'status');
    banner.hidden = true;
    view.parentNode.insertBefore(banner, view);
    L.subscribe(function (state) {
      banner.hidden = state.online;
      if (!state.online) banner.innerHTML = `${icon('cloud_off')}<span><strong>Keine Verbindung.</strong> Du siehst den zuletzt gespeicherten Stand von ${fmtTime(state.updatedAt)}. Wir verbinden automatisch neu.</span>`;
    });
  }

  /** Global sichtbare Live-Elemente außerhalb der Seite (App-Bar, Bauchbinde) */
  function mountGlobalLive() {
    const frame = { on() {} };
    mountLive(frame, document.body, { outsideView: true });
  }

  /** Mockup-Steuerung (nicht Teil der App): Verbindung, Flaggen, Neustart */
  function mountMockControls() {
    if (new URLSearchParams(location.search).has('embed')) {
      document.documentElement.classList.add('is-embed');
      return;
    }
    const box = document.createElement('div');
    box.className = 'og-mock';
    box.innerHTML = `<details>
      <summary>${icon('science', 'icon--small')}Mockup</summary>
      <div class="og-mock__body">
        <label class="og-switch"><input type="checkbox" data-mock-online checked><span class="og-switch__track" aria-hidden="true"></span>Verbindung</label>
        <button class="btn btn--text" type="button" data-mock="yellow">Gelbe Flagge</button>
        <button class="btn btn--text" type="button" data-mock="sc">Safety Car</button>
        <button class="btn btn--text" type="button" data-mock="restart">Rennen neu starten</button>
        <a class="btn btn--text" href="varianten.html">Alle Varianten</a>
        <a class="btn btn--text" href="index.html">Übersicht</a>
      </div>
    </details>`;
    document.body.appendChild(box);
    box.querySelector('[data-mock-online]').addEventListener('change', (e) => L.setOnline(e.target.checked));
    box.querySelector('[data-mock="yellow"]').addEventListener('click', () => L.triggerYellow());
    box.querySelector('[data-mock="sc"]').addEventListener('click', () => L.triggerSafetyCar());
    box.querySelector('[data-mock="restart"]').addEventListener('click', () => L.restart());
  }

  function start(config) {
    cfg = config;
    mountOfflineBanner();
    mountGlobalLive();
    mountMockControls();
    window.addEventListener('hashchange', route);
    setInterval(tickCountdowns, 1000);
    route();
  }

  return {
    start,
    profile,
    ui: {
      esc, icon, card, stat, chips, note, pageHead, driverLink, teamLink, teamLogo, tyre, countryTag,
      hero, countdown, tipCard, favoritesCard, standingsCard, lastRaceCard, liveNowCard,
      timingTable, weather, mountLive, mountTrackMap, mountLineChart, bars, fmtLap, fmtGap
    }
  };
})();
