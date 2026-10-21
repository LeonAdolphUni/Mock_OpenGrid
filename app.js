/* =====================================================================
   OpenGrid – minimales Vanilla-JS für das Mockup
   ---------------------------------------------------------------------
   Darstellungslogik: Reiter, Menüs, Dialog, Request-Log-Anzeige.
   Daten und Requests liegen in api.js, live.js und history.js.
   Jede Funktion entspricht einem kleinen Stück State in Flutter.
   ===================================================================== */
(function () {
  'use strict';

  /**
   * Reiter "Live" / "Historische Daten": Desktop-Tabs, Reiter-Menü
   * (schmale Fenster) und mobile Navigation Bar teilen sich eine Auswahl.
   * Der aktive Reiter steht im URL-Hash (#live / #history) und bleibt so
   * beim Neuladen erhalten.
   * Flutter: TabBar + TabBarView bzw. NavigationBar mit selectedIndex.
   */
  function initTabs() {
    const items = document.querySelectorAll('[data-tab]');
    const panels = document.querySelectorAll('[data-tab-panel]');
    if (!items.length) return;

    const titles = document.querySelectorAll('[data-tab-title]');
    const names = Array.from(panels, (panel) => panel.dataset.tabPanel);

    function select(name) {
      if (!names.includes(name)) name = names[0];
      items.forEach(function (el) {
        const active = el.dataset.tab === name;
        el.classList.toggle('is-active', active);
        if (el.getAttribute('role') === 'menuitemradio') {
          el.setAttribute('aria-checked', String(active));
        } else if (active) {
          el.setAttribute('aria-current', 'page');
        } else {
          el.removeAttribute('aria-current');
        }
        if (active && el.dataset.tabLabel) {
          titles.forEach((title) => (title.textContent = el.dataset.tabLabel));
        }
      });
      panels.forEach((panel) => (panel.hidden = panel.dataset.tabPanel !== name));
    }

    items.forEach(function (el) {
      el.addEventListener('click', function () {
        location.hash = el.dataset.tab;       // löst hashchange → select aus
      });
    });
    window.addEventListener('hashchange', () => select(location.hash.slice(1)));
    select(location.hash.slice(1));
  }

  /**
   * Willkommensdialog nach dem Login – einmal pro Sitzung (sessionStorage).
   * Schließen per Button, Escape oder Klick auf den Hintergrund; der Fokus
   * bleibt im Dialog (Fokusfalle) und kehrt danach zurück.
   * Flutter: showDialog(context: ..., builder: (_) => AlertDialog(...))
   */
  function initWelcomeDialog() {
    const scrim = document.querySelector('[data-welcome-dialog]');
    if (!scrim) return;
    const KEY = 'opengrid.welcomeShown';

    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === '1';
    } catch (err) {
      // z. B. privater Modus oder blockierter Speicher: Dialog trotzdem zeigen
    }
    if (seen) return;

    const dialog = scrim.querySelector('[role="dialog"]');
    const previous = document.activeElement;
    const focusables = () => Array.from(dialog.querySelectorAll('button, [href], input, select, textarea'));

    function close() {
      scrim.hidden = true;
      document.removeEventListener('keydown', onKey);
      try {
        sessionStorage.setItem(KEY, '1');
      } catch (err) {
        // Speichern nicht möglich – dann erscheint der Dialog beim nächsten Laden erneut
      }
      if (previous && previous.focus) previous.focus();
    }

    function onKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        const list = focusables();
        const first = list[0];
        const last = list[list.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    scrim.hidden = false;
    document.addEventListener('keydown', onKey);
    scrim.addEventListener('click', (event) => event.target === scrim && close());
    dialog.querySelectorAll('[data-dialog-close]').forEach((btn) => btn.addEventListener('click', close));
    (focusables()[0] || dialog).focus();
  }

  /**
   * Request-Log: letzte 50 Requests als Tabelle, "Log leeren".
   * Flutter: ExpansionTile mit ListView, Daten aus einem Provider.
   */
  function initRequestLog() {
    const root = document.querySelector('[data-request-log]');
    if (!root || !window.OpenGridApi) return;
    const body = root.querySelector('tbody');
    const empty = root.querySelector('[data-log-empty]');
    const count = root.querySelector('[data-log-count]');

    root.querySelector('[data-log-clear]').addEventListener('click', () => window.OpenGridApi.log.clear());

    window.OpenGridApi.log.subscribe(function (entries) {
      count.textContent = String(entries.length);
      empty.hidden = entries.length > 0;
      body.textContent = '';
      entries.forEach(function (entry) {
        const row = body.insertRow();
        if (entry.error) row.className = 'is-error';
        [
          entry.time.toLocaleTimeString('de-DE'),
          entry.endpoint + (entry.mock ? ' (Beispiel)' : ''),
          String(entry.status),
          entry.durationMs === null ? '–' : `${entry.durationMs} ms`,
          entry.error || '–'
        ].forEach((text) => (row.insertCell().textContent = text));
      });
    });
  }

  /** Label "Beispieldaten" anzeigen, solange USE_MOCK_DATA aktiv ist */
  function initMockBanner() {
    const config = window.OPENGRID_CONFIG;
    document.querySelectorAll('[data-mock-banner]').forEach(function (el) {
      el.hidden = !(config && config.USE_MOCK_DATA);
    });
  }

  /**
   * Menüs (Profil, Reiter): öffnen per Klick, schließen bei Klick
   * außerhalb, Escape oder Auswahl. Pfeiltasten bewegen den Fokus.
   * Flutter: MenuAnchor übernimmt das alles automatisch.
   */
  function initMenus() {
    const triggers = document.querySelectorAll('[data-menu-trigger]');

    function menuOf(trigger) {
      return document.getElementById(trigger.getAttribute('aria-controls'));
    }

    function menuItems(menu) {
      return Array.prototype.slice.call(menu.querySelectorAll('[role^="menuitem"]'));
    }

    function close(trigger, returnFocus) {
      menuOf(trigger).hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) trigger.focus();
    }

    function closeAll() {
      triggers.forEach(function (trigger) {
        if (trigger.getAttribute('aria-expanded') === 'true') close(trigger, false);
      });
    }

    triggers.forEach(function (trigger) {
      const menu = menuOf(trigger);

      trigger.addEventListener('click', function () {
        const isOpen = trigger.getAttribute('aria-expanded') === 'true';
        closeAll();
        if (isOpen) return;

        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        const first = menuItems(menu)[0];
        if (first) first.focus();
      });

      // Auswahl eines Eintrags schließt das Menü
      menu.addEventListener('click', function (event) {
        if (event.target.closest('[role^="menuitem"]')) close(trigger, true);
      });

      menu.addEventListener('keydown', function (event) {
        const list = menuItems(menu);
        const index = list.indexOf(document.activeElement);

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          list[(index + 1) % list.length].focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          list[(index - 1 + list.length) % list.length].focus();
        } else if (event.key === 'Escape') {
          close(trigger, true);
        } else if (event.key === 'Tab') {
          close(trigger, false);
        }
      });
    });

    document.addEventListener('click', function (event) {
      if (!event.target.closest('.menu-anchor')) closeAll();
    });
  }

  /**
   * Filter-Chips: genau ein Chip pro Gruppe ausgewählt.
   * Flutter: FilterChip(selected: index == selectedFilter, onSelected: ...)
   */
  function initChips() {
    document.querySelectorAll('[data-chip-group]').forEach(function (group) {
      const chips = group.querySelectorAll('.filter-chip');
      chips.forEach(function (chip) {
        chip.addEventListener('click', function () {
          chips.forEach(function (other) {
            other.setAttribute('aria-pressed', String(other === chip));
          });
        });
      });
    });
  }

  /**
   * Passwort anzeigen / verbergen.
   * Flutter: TextField(obscureText: _obscure) + IconButton im suffixIcon.
   */
  function initPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach(function (button) {
      const input = document.getElementById(button.getAttribute('aria-controls'));
      const icon = button.querySelector('.material-symbols-outlined');

      button.addEventListener('click', function () {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        button.setAttribute('aria-pressed', String(show));
        icon.textContent = show ? 'visibility_off' : 'visibility';
      });
    });
  }

  initTabs();
  initMenus();
  initChips();
  initPasswordToggles();
  initMockBanner();
  initRequestLog();
  initWelcomeDialog();
})();
