/* =====================================================================
   OpenGrid – Beispieldaten + Live-Simulation (Varianten-Mockups)
   ---------------------------------------------------------------------
   Alles hier ist erfunden bzw. vereinfacht und in der Oberfläche als
   "Beispieldaten" gekennzeichnet. Ergebnisse und Rundenzeiten werden
   per Zufallsgenerator mit festem Startwert erzeugt – sie sind bei jedem
   Laden gleich, aber nicht echt. Historie 2023–2026 nutzt vereinfacht
   das Fahrerfeld von 2026.
   Später kommen die Daten aus unserem Backend (Jolpica / OpenF1).

   Flutter-Entsprechung:
     OG_DATA  → Repository-Klassen + Modelle (Driver, Team, Track, Race …)
     OGLive   → Stream<LiveState> aus einem WebSocket-Repository
   ===================================================================== */
window.OG_DATA = (function () {
  'use strict';

  /* ------------------------------------------------------------------
     Zufall mit festem Startwert (gleiche Daten bei jedem Laden)
     ------------------------------------------------------------------ */
  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedOf(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function rngFor() {
    return mulberry32(seedOf(Array.prototype.join.call(arguments, '|')));
  }

  /** Normalverteilte Zufallszahl (Box-Muller) */
  function gauss(rand) {
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /* ------------------------------------------------------------------
     Stammdaten
     ------------------------------------------------------------------ */
  const COUNTRIES = {
    AE: 'Vereinigte Arabische Emirate', AR: 'Argentinien', AT: 'Österreich', AU: 'Australien',
    AZ: 'Aserbaidschan', BE: 'Belgien', BH: 'Bahrain', BR: 'Brasilien', CA: 'Kanada',
    CH: 'Schweiz', CN: 'China', DE: 'Deutschland', ES: 'Spanien', FI: 'Finnland',
    FR: 'Frankreich', GB: 'Großbritannien', HU: 'Ungarn', IT: 'Italien', JP: 'Japan',
    MC: 'Monaco', MX: 'Mexiko', NL: 'Niederlande', NZ: 'Neuseeland', QA: 'Katar',
    SA: 'Saudi-Arabien', SG: 'Singapur', TH: 'Thailand', US: 'USA'
  };

  // logo: "white" | "silver" | "text" (wie tools/build_icons.py)
  const TEAMS = [
    { id: 'mclaren', name: 'McLaren', color: '#FF8000', logo: 'white', principal: 'Andrea Stella', engine: 'Mercedes', chassis: 'MCL40', base: 'Woking', country: 'GB', entry: 1966 },
    { id: 'ferrari', name: 'Ferrari', color: '#E8002D', logo: 'white', principal: 'Frédéric Vasseur', engine: 'Ferrari', chassis: 'SF-26', base: 'Maranello', country: 'IT', entry: 1950 },
    { id: 'mercedes', name: 'Mercedes', color: '#00D7B6', logo: 'white', principal: 'Toto Wolff', engine: 'Mercedes', chassis: 'W17', base: 'Brackley', country: 'GB', entry: 2010 },
    { id: 'red-bull', name: 'Red Bull Racing', color: '#3671C6', logo: 'white', principal: 'Laurent Mekies', engine: 'Red Bull Ford', chassis: 'RB22', base: 'Milton Keynes', country: 'GB', entry: 2005 },
    { id: 'aston-martin', name: 'Aston Martin', color: '#229971', logo: 'white', principal: 'Adrian Newey', engine: 'Honda', chassis: 'AMR26', base: 'Silverstone', country: 'GB', entry: 2021 },
    { id: 'alpine', name: 'Alpine', color: '#0093CC', logo: 'white', principal: 'Flavio Briatore', engine: 'Mercedes', chassis: 'A526', base: 'Enstone', country: 'GB', entry: 2021 },
    { id: 'williams', name: 'Williams', color: '#64C4FF', logo: 'white', principal: 'James Vowles', engine: 'Mercedes', chassis: 'FW48', base: 'Grove', country: 'GB', entry: 1977 },
    { id: 'racing-bulls', name: 'Racing Bulls', color: '#6692FF', logo: 'text', principal: 'Alan Permane', engine: 'Red Bull Ford', chassis: 'VCARB 03', base: 'Faenza', country: 'IT', entry: 2006 },
    { id: 'haas', name: 'Haas', color: '#E6002B', logo: 'white', principal: 'Ayao Komatsu', engine: 'Ferrari', chassis: 'VF-26', base: 'Kannapolis', country: 'US', entry: 2016 },
    { id: 'audi', name: 'Audi', color: '#A9ACB1', logo: 'white', principal: 'Jonathan Wheatley', engine: 'Audi', chassis: 'R26', base: 'Hinwil', country: 'CH', entry: 2026 },
    { id: 'cadillac', name: 'Cadillac', color: '#EDEDED', logo: 'silver', principal: 'Graeme Lowdon', engine: 'Ferrari', chassis: 'MAC-26', base: 'Silverstone', country: 'US', entry: 2026 }
  ];

  // pace: Rückstand pro Runde in Sekunden auf das schnellste Auto (Simulation)
  const DRIVERS = [
    { id: 'nor', code: 'NOR', first: 'Lando', last: 'Norris', num: 4, team: 'mclaren', country: 'GB', debut: 2019, pace: 0.00, career: ['McLaren'] },
    { id: 'pia', code: 'PIA', first: 'Oscar', last: 'Piastri', num: 81, team: 'mclaren', country: 'AU', debut: 2023, pace: 0.06, career: ['McLaren'] },
    { id: 'lec', code: 'LEC', first: 'Charles', last: 'Leclerc', num: 16, team: 'ferrari', country: 'MC', debut: 2018, pace: 0.16, career: ['Sauber', 'Ferrari'] },
    { id: 'ham', code: 'HAM', first: 'Lewis', last: 'Hamilton', num: 44, team: 'ferrari', country: 'GB', debut: 2007, pace: 0.26, career: ['McLaren', 'Mercedes', 'Ferrari'] },
    { id: 'rus', code: 'RUS', first: 'George', last: 'Russell', num: 63, team: 'mercedes', country: 'GB', debut: 2019, pace: 0.10, career: ['Williams', 'Mercedes'] },
    { id: 'ant', code: 'ANT', first: 'Kimi', last: 'Antonelli', num: 12, team: 'mercedes', country: 'IT', debut: 2025, pace: 0.30, career: ['Mercedes'] },
    { id: 'ver', code: 'VER', first: 'Max', last: 'Verstappen', num: 3, team: 'red-bull', country: 'NL', debut: 2015, pace: 0.07, career: ['Toro Rosso', 'Red Bull Racing'] },
    { id: 'had', code: 'HAD', first: 'Isack', last: 'Hadjar', num: 6, team: 'red-bull', country: 'FR', debut: 2025, pace: 0.58, career: ['Racing Bulls', 'Red Bull Racing'] },
    { id: 'alo', code: 'ALO', first: 'Fernando', last: 'Alonso', num: 14, team: 'aston-martin', country: 'ES', debut: 2001, pace: 0.68, career: ['Minardi', 'Renault', 'McLaren', 'Ferrari', 'Alpine', 'Aston Martin'] },
    { id: 'str', code: 'STR', first: 'Lance', last: 'Stroll', num: 18, team: 'aston-martin', country: 'CA', debut: 2017, pace: 1.08, career: ['Williams', 'Racing Point', 'Aston Martin'] },
    { id: 'gas', code: 'GAS', first: 'Pierre', last: 'Gasly', num: 10, team: 'alpine', country: 'FR', debut: 2017, pace: 0.80, career: ['Toro Rosso', 'Red Bull Racing', 'AlphaTauri', 'Alpine'] },
    { id: 'col', code: 'COL', first: 'Franco', last: 'Colapinto', num: 43, team: 'alpine', country: 'AR', debut: 2024, pace: 1.04, career: ['Williams', 'Alpine'] },
    { id: 'alb', code: 'ALB', first: 'Alexander', last: 'Albon', num: 23, team: 'williams', country: 'TH', debut: 2019, pace: 0.74, career: ['Toro Rosso', 'Red Bull Racing', 'Williams'] },
    { id: 'sai', code: 'SAI', first: 'Carlos', last: 'Sainz', num: 55, team: 'williams', country: 'ES', debut: 2015, pace: 0.62, career: ['Toro Rosso', 'Renault', 'McLaren', 'Ferrari', 'Williams'] },
    { id: 'law', code: 'LAW', first: 'Liam', last: 'Lawson', num: 30, team: 'racing-bulls', country: 'NZ', debut: 2023, pace: 0.86, career: ['AlphaTauri', 'Red Bull Racing', 'Racing Bulls'] },
    { id: 'lin', code: 'LIN', first: 'Arvid', last: 'Lindblad', num: 41, team: 'racing-bulls', country: 'GB', debut: 2026, pace: 0.98, career: ['Racing Bulls'] },
    { id: 'oco', code: 'OCO', first: 'Esteban', last: 'Ocon', num: 31, team: 'haas', country: 'FR', debut: 2016, pace: 0.94, career: ['Manor', 'Force India', 'Alpine', 'Haas'] },
    { id: 'bea', code: 'BEA', first: 'Oliver', last: 'Bearman', num: 87, team: 'haas', country: 'GB', debut: 2024, pace: 0.82, career: ['Ferrari', 'Haas'] },
    { id: 'hul', code: 'HUL', first: 'Nico', last: 'Hülkenberg', num: 27, team: 'audi', country: 'DE', debut: 2010, pace: 0.90, career: ['Williams', 'Force India', 'Sauber', 'Renault', 'Haas', 'Audi'] },
    { id: 'bor', code: 'BOR', first: 'Gabriel', last: 'Bortoleto', num: 5, team: 'audi', country: 'BR', debut: 2025, pace: 0.96, career: ['Sauber', 'Audi'] },
    { id: 'per', code: 'PER', first: 'Sergio', last: 'Pérez', num: 11, team: 'cadillac', country: 'MX', debut: 2011, pace: 1.18, career: ['Sauber', 'Force India', 'Red Bull Racing', 'Cadillac'] },
    { id: 'bot', code: 'BOT', first: 'Valtteri', last: 'Bottas', num: 77, team: 'cadillac', country: 'FI', debut: 2013, pace: 1.24, career: ['Williams', 'Mercedes', 'Alfa Romeo', 'Cadillac'] }
  ];

  // speed: grobe Durchschnittsgeschwindigkeit (km/h) → Basis-Rundenzeit
  const TRACKS = [
    { id: 'australia', gp: 'GP von Australien', circuit: 'Albert Park', city: 'Melbourne', country: 'AU', km: 5.278, laps: 58, speed: 225, date: '03-08' },
    { id: 'china', gp: 'GP von China', circuit: 'Shanghai International Circuit', city: 'Shanghai', country: 'CN', km: 5.451, laps: 56, speed: 205, date: '03-15' },
    { id: 'japan', gp: 'GP von Japan', circuit: 'Suzuka', city: 'Suzuka', country: 'JP', km: 5.807, laps: 53, speed: 230, date: '03-29' },
    { id: 'bahrain', gp: 'GP von Bahrain', circuit: 'Bahrain International Circuit', city: 'Sakhir', country: 'BH', km: 5.412, laps: 57, speed: 210, date: '04-12' },
    { id: 'saudi', gp: 'GP von Saudi-Arabien', circuit: 'Jeddah Corniche Circuit', city: 'Dschidda', country: 'SA', km: 6.174, laps: 50, speed: 250, date: '04-19' },
    { id: 'miami', gp: 'GP von Miami', circuit: 'Miami International Autodrome', city: 'Miami', country: 'US', km: 5.412, laps: 57, speed: 220, date: '05-03' },
    { id: 'canada', gp: 'GP von Kanada', circuit: 'Circuit Gilles Villeneuve', city: 'Montréal', country: 'CA', km: 4.361, laps: 70, speed: 215, date: '05-24' },
    { id: 'monaco', gp: 'GP von Monaco', circuit: 'Circuit de Monaco', city: 'Monte Carlo', country: 'MC', km: 3.337, laps: 78, speed: 160, date: '06-07' },
    { id: 'barcelona', gp: 'GP von Barcelona', circuit: 'Circuit de Barcelona-Catalunya', city: 'Barcelona', country: 'ES', km: 4.657, laps: 66, speed: 215, date: '06-14' },
    { id: 'austria', gp: 'GP von Österreich', circuit: 'Red Bull Ring', city: 'Spielberg', country: 'AT', km: 4.318, laps: 71, speed: 240, date: '06-28' },
    { id: 'britain', gp: 'GP von Großbritannien', circuit: 'Silverstone', city: 'Silverstone', country: 'GB', km: 5.891, laps: 52, speed: 245, date: '07-05' },
    { id: 'belgium', gp: 'GP von Belgien', circuit: 'Spa-Francorchamps', city: 'Stavelot', country: 'BE', km: 7.004, laps: 44, speed: 235, date: '07-19' },
    { id: 'hungary', gp: 'GP von Ungarn', circuit: 'Hungaroring', city: 'Budapest', country: 'HU', km: 4.381, laps: 70, speed: 200, date: '07-26' },
    { id: 'netherlands', gp: 'GP der Niederlande', circuit: 'Zandvoort', city: 'Zandvoort', country: 'NL', km: 4.259, laps: 72, speed: 220, date: '08-23' },
    { id: 'italy', gp: 'GP von Italien', circuit: 'Monza', city: 'Monza', country: 'IT', km: 5.793, laps: 53, speed: 260, date: '09-06' },
    { id: 'madrid', gp: 'GP von Spanien', circuit: 'Madring', city: 'Madrid', country: 'ES', km: 5.470, laps: 57, speed: 215, date: '09-13', since: 2026 },
    { id: 'azerbaijan', gp: 'GP von Aserbaidschan', circuit: 'Baku City Circuit', city: 'Baku', country: 'AZ', km: 6.003, laps: 51, speed: 215, date: '09-26' },
    { id: 'singapore', gp: 'GP von Singapur', circuit: 'Marina Bay', city: 'Singapur', country: 'SG', km: 4.940, laps: 62, speed: 185, date: '10-11' },
    { id: 'usa', gp: 'GP der USA', circuit: 'Circuit of the Americas', city: 'Austin', country: 'US', km: 5.513, laps: 56, speed: 205, date: '10-25' },
    { id: 'mexico', gp: 'GP von Mexiko', circuit: 'Autódromo Hermanos Rodríguez', city: 'Mexiko-Stadt', country: 'MX', km: 4.304, laps: 71, speed: 200, date: '11-01' },
    { id: 'brazil', gp: 'GP von São Paulo', circuit: 'Interlagos', city: 'São Paulo', country: 'BR', km: 4.309, laps: 71, speed: 215, date: '11-08' },
    { id: 'lasvegas', gp: 'GP von Las Vegas', circuit: 'Las Vegas Strip Circuit', city: 'Las Vegas', country: 'US', km: 6.201, laps: 50, speed: 240, date: '11-21' },
    { id: 'qatar', gp: 'GP von Katar', circuit: 'Lusail', city: 'Lusail', country: 'QA', km: 5.419, laps: 57, speed: 225, date: '11-29' },
    { id: 'abudhabi', gp: 'GP von Abu Dhabi', circuit: 'Yas Marina', city: 'Abu Dhabi', country: 'AE', km: 5.281, laps: 58, speed: 210, date: '12-06' }
  ];
  TRACKS.forEach(function (t) {
    t.baseLap = (t.km / t.speed) * 3600;           // Sekunden
  });

  const YEARS = [2023, 2024, 2025, 2026];
  const CURRENT_YEAR = 2026;
  const COMPLETED_ROUNDS = 18;                     // bis einschl. Singapur gewertet
  const LIVE_TRACK = 'usa';                        // läuft gerade (Simulation)
  const TIP_TRACK = 'mexico';                      // nächstes Tipp-Rennen
  const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));
  const TEAM = byId(TEAMS);
  const DRIVER = byId(DRIVERS);
  const TRACK = byId(TRACKS);

  /* ------------------------------------------------------------------
     Kalender + Ergebnisse
     ------------------------------------------------------------------ */
  function calendar(year) {
    return TRACKS
      .filter((t) => !t.since || year >= t.since)
      .map((t, i) => ({ year, round: i + 1, track: t.id, date: `${year}-${t.date}` }));
  }

  function roundsDone(year) {
    return year === CURRENT_YEAR ? COMPLETED_ROUNDS : calendar(year).length;
  }

  /** Saisonform eines Fahrers (kleine Schwankung von Jahr zu Jahr) */
  function form(year, driverId) {
    return gauss(rngFor('form', year, driverId)) * 0.12;
  }

  const raceCache = {};

  /** Ergebnis eines Rennens: Startaufstellung, Zieleinlauf, Punkte */
  function race(year, round) {
    const key = year + '-' + round;
    if (raceCache[key]) return raceCache[key];
    const entry = calendar(year)[round - 1];
    if (!entry) return null;
    const track = TRACK[entry.track];
    const done = round <= roundsDone(year);
    const result = Object.assign({}, entry, { gp: track.gp, done, grid: null, results: null });
    if (!done) return (raceCache[key] = result);

    const rand = rngFor('race', year, round);
    const quali = DRIVERS.map((d) => ({ d, score: d.pace + form(year, d.id) + gauss(rand) * 0.22 }))
      .sort((a, b) => a.score - b.score);
    const gridPos = {};
    quali.forEach((q, i) => (gridPos[q.d.id] = i + 1));

    const runners = DRIVERS.map(function (d) {
      return {
        d,
        score: d.pace + form(year, d.id) + gauss(rand) * 0.4 + gridPos[d.id] * 0.015,
        dnf: rand() < 0.045,
        dnfLap: Math.max(1, Math.floor(rand() * track.laps))
      };
    });
    const finishers = runners.filter((r) => !r.dnf).sort((a, b) => a.score - b.score);
    const dnfs = runners.filter((r) => r.dnf).sort((a, b) => b.dnfLap - a.dnfLap);
    const leader = finishers[0];
    const raceTime = track.laps * track.baseLap * 1.04;
    const fastest = finishers[Math.floor(rand() * Math.min(8, finishers.length))].d.id;

    result.pole = quali[0].d.id;
    result.fastest = fastest;
    result.fastestTime = track.baseLap * 0.995 + rand() * 0.6;
    result.grid = quali.map((q) => q.d.id);
    result.results = finishers.concat(dnfs).map(function (r, i) {
      const gap = r.dnf ? null : (r.score - leader.score) * track.laps * 0.42 + i * 1.1;
      const lapped = gap !== null && gap > track.baseLap;
      return {
        pos: i + 1,
        driver: r.d.id,
        team: r.d.team,
        grid: gridPos[r.d.id],
        status: r.dnf ? 'Ausfall' : 'Ziel',
        laps: r.dnf ? r.dnfLap : (lapped ? track.laps - 1 : track.laps),
        time: r.dnf ? 'DNF' : (i === 0 ? fmtRaceTime(raceTime) : (lapped ? '+1 Rd.' : '+' + gap.toFixed(3).replace('.', ',') + ' s')),
        points: r.dnf ? 0 : (POINTS[i] || 0)
      };
    });
    result.firstDnf = dnfs.length ? dnfs[dnfs.length - 1].d.id : null;
    result.yellowFlags = 2 + Math.floor(rand() * 6);
    result.redFlags = rand() < 0.12 ? 1 : 0;
    result.winnerStops = rand() < 0.7 ? 1 : 2;
    result.winnerStartTyre = rand() < 0.65 ? 'medium' : (rand() < 0.5 ? 'soft' : 'hard');
    const gains = result.results.filter((x) => x.status === 'Ziel').map((x) => ({ id: x.driver, gain: x.grid - x.pos }));
    result.mostGained = gains.sort((a, b) => b.gain - a.gain)[0].id;
    return (raceCache[key] = result);
  }

  function season(year) {
    return calendar(year).map((e) => race(year, e.round));
  }

  /**
   * WM-Stand nach jeder Runde (für Verlaufsdiagramm und Tabellen).
   * Rückgabe: { rounds: [1..n], drivers: {id: [kumulierte Punkte je Runde]}, teams: {...} }
   */
  function standingsProgress(year) {
    const done = season(year).filter((r) => r.done);
    const drivers = {};
    const teams = {};
    DRIVERS.forEach((d) => (drivers[d.id] = []));
    TEAMS.forEach((t) => (teams[t.id] = []));
    const dSum = {};
    const tSum = {};
    done.forEach(function (r) {
      r.results.forEach(function (x) {
        dSum[x.driver] = (dSum[x.driver] || 0) + x.points;
        tSum[x.team] = (tSum[x.team] || 0) + x.points;
      });
      DRIVERS.forEach((d) => drivers[d.id].push(dSum[d.id] || 0));
      TEAMS.forEach((t) => teams[t.id].push(tSum[t.id] || 0));
    });
    return { rounds: done.map((r) => r.round), races: done, drivers, teams };
  }

  /** Aktueller WM-Stand als sortierte Liste */
  function standings(year, kind) {
    const prog = standingsProgress(year);
    const source = kind === 'teams' ? prog.teams : prog.drivers;
    return Object.keys(source)
      .map((id) => ({ id, points: source[id][source[id].length - 1] || 0 }))
      .sort((a, b) => b.points - a.points)
      .map((x, i) => Object.assign(x, { pos: i + 1 }));
  }

  /** Aggregierte Kennzahlen eines Fahrers im Datensatz (2023–2026) */
  function driverStats(driverId) {
    const stats = { races: 0, wins: 0, podiums: 0, poles: 0, points: 0, dnfs: 0, bestFinish: null, seasons: [] };
    YEARS.forEach(function (year) {
      let seasonPoints = 0;
      season(year).filter((r) => r.done).forEach(function (r) {
        const x = r.results.find((y) => y.driver === driverId);
        stats.races++;
        if (r.pole === driverId) stats.poles++;
        if (x.status === 'Ausfall') stats.dnfs++;
        if (x.status === 'Ziel' && x.pos === 1) stats.wins++;
        if (x.status === 'Ziel' && x.pos <= 3) stats.podiums++;
        if (x.status === 'Ziel') stats.bestFinish = Math.min(stats.bestFinish || 99, x.pos);
        seasonPoints += x.points;
      });
      const rank = standings(year, 'drivers').find((s) => s.id === driverId).pos;
      stats.points += seasonPoints;
      stats.seasons.push({ year, points: seasonPoints, rank });
    });
    return stats;
  }

  /** Kennzahlen eines Teams in einem Jahr (US14) */
  function teamStats(teamId, year) {
    const drivers = DRIVERS.filter((d) => d.team === teamId);
    let wins = 0, podiums = 0, posSum = 0, posCount = 0, points = 0, poles = 0;
    season(year).filter((r) => r.done).forEach(function (r) {
      if (drivers.some((d) => d.id === r.pole)) poles++;
      r.results.filter((x) => x.team === teamId).forEach(function (x) {
        points += x.points;
        if (x.status === 'Ziel') {
          posSum += x.pos;
          posCount++;
          if (x.pos === 1) wins++;
          if (x.pos <= 3) podiums++;
        }
      });
    });
    const rank = standings(year, 'teams').find((s) => s.id === teamId).pos;
    return { drivers, wins, podiums, poles, points, rank, avgPos: posCount ? posSum / posCount : null };
  }

  /** Streckenhistorie (US17): Sieger je Jahr + Rundenrekord */
  function trackHistory(trackId) {
    const track = TRACK[trackId];
    const winners = YEARS.map(function (year) {
      const entry = calendar(year).find((e) => e.track === trackId);
      if (!entry) return { year, race: null };
      const r = race(year, entry.round);
      return { year, race: r, winner: r.done ? r.results[0].driver : null };
    });
    const rand = rngFor('record', trackId);
    const recordHolder = DRIVERS[Math.floor(rand() * 8)];
    return {
      winners,
      record: { time: track.baseLap * 0.982, driver: recordHolder.id, year: 2019 + Math.floor(rand() * 7) }
    };
  }

  /**
   * Rundenzeiten (US18) für Rennen oder Qualifying.
   * Rückgabe: Array mit Sekunden je Runde (null = keine Zeit, z. B. nach Ausfall)
   */
  function lapTimes(year, round, session, driverId) {
    const r = race(year, round);
    if (!r || !r.done) return [];
    const track = TRACK[r.track];
    const d = DRIVER[driverId];
    const rand = rngFor('laps', year, round, session, driverId);
    const base = track.baseLap + d.pace + form(year, driverId);

    if (session === 'quali') {
      return Array.from({ length: 9 }, (_, i) => base - 1.2 - Math.floor(i / 3) * 0.35 + Math.abs(gauss(rand)) * 0.25);
    }

    const result = r.results.find((x) => x.driver === driverId);
    const stopLaps = [Math.floor(track.laps * (0.3 + rand() * 0.1))];
    if (result.pos > 1 || r.winnerStops === 2) stopLaps.push(Math.floor(track.laps * (0.62 + rand() * 0.1)));
    let stintAge = 0;
    return Array.from({ length: track.laps }, function (_, i) {
      const lap = i + 1;
      if (lap > result.laps) return null;
      stintAge++;
      let t = base + (track.laps - lap) * 0.03 + stintAge * 0.045 + gauss(rand) * 0.18;
      if (lap === 1) t += 4.5;
      if (stopLaps.includes(lap)) {
        t += 20 + rand() * 2;
        stintAge = 0;
      }
      return t;
    });
  }

  /* ------------------------------------------------------------------
     Tippspiel (US07, US19–US22)
     ------------------------------------------------------------------ */
  const TIP_CATEGORIES = [
    { id: 'pole', label: 'Pole-Position', type: 'driver', points: 5, group: 'basis' },
    { id: 'p1', label: 'Sieger', type: 'driver', points: 10, group: 'basis' },
    { id: 'p2', label: 'Platz 2', type: 'driver', points: 6, group: 'basis' },
    { id: 'p3', label: 'Platz 3', type: 'driver', points: 4, group: 'basis' },
    { id: 'fastest', label: 'Schnellste Runde', type: 'driver', points: 4, group: 'extra' },
    { id: 'firstDnf', label: 'Erster Ausfall', type: 'driver', points: 6, group: 'extra' },
    { id: 'mostGained', label: 'Meiste Positionsgewinne', type: 'driver', points: 5, group: 'extra' },
    { id: 'yellowFlags', label: 'Gelbe Flaggen', type: 'number', min: 0, max: 15, points: 3, group: 'extra' },
    { id: 'redFlags', label: 'Rote Flaggen', type: 'number', min: 0, max: 3, points: 5, group: 'extra' },
    { id: 'winnerStops', label: 'Boxenstopps des Siegers', type: 'number', min: 0, max: 4, points: 3, group: 'strategie' },
    { id: 'winnerStartTyre', label: 'Startreifen des Siegers', type: 'tyre', points: 3, group: 'strategie' }
  ];

  const TYRES = [
    { id: 'soft', name: 'Soft', letter: 'S', color: '#DA291C' },
    { id: 'medium', name: 'Medium', letter: 'M', color: '#FFD12E' },
    { id: 'hard', name: 'Hard', letter: 'H', color: '#F0F0EC' },
    { id: 'intermediate', name: 'Intermediate', letter: 'I', color: '#43B02A' },
    { id: 'wet', name: 'Wet', letter: 'W', color: '#0067AD' }
  ];
  const TYRE = byId(TYRES);

  /** Tatsächlicher Wert einer Tipp-Kategorie in einem gewerteten Rennen */
  function actualFor(r, catId) {
    const map = {
      pole: r.pole, p1: r.results[0].driver, p2: r.results[1].driver, p3: r.results[2].driver,
      fastest: r.fastest, firstDnf: r.firstDnf, mostGained: r.mostGained,
      yellowFlags: r.yellowFlags, redFlags: r.redFlags, winnerStops: r.winnerStops,
      winnerStartTyre: r.winnerStartTyre
    };
    return map[catId];
  }

  /** Punkte-Aufschlüsselung (US07) */
  function scoreTips(r, tips) {
    return TIP_CATEGORIES.map(function (cat) {
      const tip = tips[cat.id];
      const actual = actualFor(r, cat.id);
      let points = 0;
      if (tip !== undefined && tip !== null && tip !== '') {
        if (String(tip) === String(actual)) points = cat.points;
        else if (cat.type === 'number' && Math.abs(Number(tip) - Number(actual)) === 1) points = Math.floor(cat.points / 2);
        else if (['p1', 'p2', 'p3'].includes(cat.id) && [r.results[0].driver, r.results[1].driver, r.results[2].driver].includes(tip)) points = 2;
      }
      return { cat, tip, actual, points };
    });
  }

  // Meine Tipps zum letzten gewerteten Rennen (Singapur, teils richtig) und zum laufenden (USA)
  const last = race(CURRENT_YEAR, COMPLETED_ROUNDS);
  const MY_TIPS = {
    [last.track]: {
      pole: last.pole, p1: last.results[1].driver, p2: last.results[0].driver, p3: last.results[2].driver,
      fastest: last.fastest === 'ver' ? 'nor' : 'ver', firstDnf: 'str', mostGained: last.mostGained,
      yellowFlags: last.yellowFlags + 1, redFlags: 0, winnerStops: last.winnerStops, winnerStartTyre: 'soft'
    },
    usa: { pole: 'ver', p1: 'nor', p2: 'pia', p3: 'lec', fastest: 'ver', firstDnf: 'bot', mostGained: 'ham', yellowFlags: 5, redFlags: 0, winnerStops: 1, winnerStartTyre: 'medium' }
  };

  /** Community-Tendenzen (US21): Anteil der Tipps je Option */
  function communityTrends(trackId, catId) {
    const cat = TIP_CATEGORIES.find((c) => c.id === catId);
    const rand = rngFor('trend', trackId, catId);
    let options;
    if (cat.type === 'driver') {
      options = DRIVERS.slice().sort((a, b) => a.pace + rand() * 0.6 - (b.pace + rand() * 0.6)).slice(0, 4).map((d) => d.id);
      if (catId === 'firstDnf') options = ['bot', 'str', 'col', 'per'];
    } else if (cat.type === 'tyre') {
      options = ['medium', 'soft', 'hard'];
    } else {
      const center = catId === 'yellowFlags' ? 4 : 1;
      options = [center, center + 1, Math.max(0, center - 1)];
    }
    let rest = 100;
    const shares = options.map(function (option, i) {
      const share = i === options.length - 1 ? Math.round(rest * 0.55) : Math.round(rest * (0.38 + rand() * 0.2));
      rest -= share;
      return { option, share };
    });
    shares.push({ option: null, share: rest });            // "Andere"
    return shares;
  }

  const USERNAMES = ['Turn1Tim', 'SlipstreamSara', 'DRS_Dennis', 'PitWallPaula', 'ApexAli', 'UndercutUwe',
    'HairpinHanna', 'KerbKarl', 'ChicaneChris', 'PolePia', 'GridGreta', 'FlatOutFinn', 'BlueFlagBen',
    'SectorSophie', 'ParcFermePaul', 'LockUpLeo', 'RainMasterRia', 'SafetyCarSven', 'TyreWhispererTom', 'OvercutOla'];

  const ME = { name: 'Anton Bauer', handle: 'Anton B.', email: 'anton.bauer@example.com', rank: 1284, points: 412 };

  function leaderboard(scope) {
    const rand = rngFor('board', scope);
    const total = scope === 'gruppe' ? 24 : 18240;
    let points = scope === 'gruppe' ? 468 : 731;
    const names = scope === 'gruppe'
      ? ['Mara K.', 'Jonas W.', 'Lea S.', 'Tobias R.', 'Selin A.', 'Felix H.', 'Nina P.', 'David M.', 'Anton B.', 'Paul F.']
      : USERNAMES;
    const rows = names.map(function (name, i) {
      if (i > 0) points -= Math.floor(2 + rand() * 9);
      return { rank: i + 1, name, points, me: name === ME.handle, trend: Math.round(gauss(rand) * 3) };
    });
    if (scope !== 'gruppe') rows.push({ rank: ME.rank, name: ME.handle, points: ME.points, me: true, trend: 37 });
    return { total, rows };
  }

  return {
    COUNTRIES, TEAMS, DRIVERS, TRACKS, TYRES, TEAM, DRIVER, TRACK, TYRE, YEARS, CURRENT_YEAR,
    COMPLETED_ROUNDS, LIVE_TRACK, TIP_TRACK, TIP_CATEGORIES, MY_TIPS, ME, POINTS,
    calendar, roundsDone, race, season, standings, standingsProgress, driverStats, teamStats,
    trackHistory, lapTimes, scoreTips, communityTrends, leaderboard, rngFor, gauss
  };

  function fmtRaceTime(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = (sec % 60).toFixed(3).padStart(6, '0');
    return `${h}:${String(m).padStart(2, '0')}:${s}`;
  }
})();


/* =====================================================================
   OGLive – simuliertes Live-Rennen (GP der USA, Circuit of the Americas)
   ---------------------------------------------------------------------
   Rechnet Positionen, Abstände, Sektorzeiten, Reifen, Boxenstopps,
   Flaggen und Ticker-Meldungen. Eine Runde dauert ca. 16 s Echtzeit,
   damit sich auf der Karte etwas bewegt.
   Flutter: StreamProvider<LiveState> über einem WebSocketChannel;
   bei Verbindungsabbruch bleibt der letzte Zustand aus dem Cache stehen.
   ===================================================================== */
window.OGLive = (function () {
  'use strict';

  const D = window.OG_DATA;
  const track = D.TRACK[D.LIVE_TRACK];
  const TICK_MS = 250;
  const SPEED = 6;                                 // Simulationssekunden pro Echtzeitsekunde
  const STINT = { soft: 16, medium: 24, hard: 32 };
  const PIT_LOSS = 21;
  const START_LAP = 30;

  let rand;
  let state;
  let simTime;
  let listeners = [];
  let frozen = null;                               // letzter Stand bei "offline"
  let lastOvertakeEvent = 0;

  function reset() {
    rand = D.rngFor('live', Date.now());
    simTime = 0;
    const grid = D.DRIVERS.slice().sort((a, b) => a.pace + rand() * 0.5 - (b.pace + rand() * 0.5));
    state = {
      track,
      totalLaps: track.laps,
      lap: START_LAP,
      flag: { kind: 'green', sector: null, until: 0 },
      fastest: null,
      bestSectors: [Infinity, Infinity, Infinity],
      events: [],
      online: true,
      latencyMs: 110,
      updatedAt: new Date(),
      finished: false,
      weather: {
        air: 27, trackTemp: 41, humidity: 48, wind: 12,
        forecast: [5, 5, 10, 20, 35, 40, 30].map((rain, i) => ({ minutes: i * 10, rain }))
      },
      cars: grid.map(function (d, i) {
        const compound = i % 3 === 0 ? 'hard' : 'medium';
        const pace = track.baseLap * 1.03 + d.pace;
        const age = 4 + Math.floor(rand() * 10);
        // Vorige Runde als Startwert, damit die Tabelle nicht leer beginnt
        const split = [0, 1, 2].map(() => (pace + age * 0.05) / 3 + 0.05 + D.gauss(rand) * 0.08);
        const lap = split[0] + split[1] + split[2];
        return {
          id: d.id,
          dist: START_LAP - 1 + 0.98 - i * 0.03 - rand() * 0.01,
          pace,
          tyre: { compound, age },
          stops: 1,
          status: 'run',
          pitUntil: 0,
          lastLap: lap,
          bestLap: lap,
          lapStart: 0,
          sectorStart: 0,
          sectors: split.map((time) => ({ time, mark: 'green' })),
          bestOwn: split.slice(),
          gridPos: i + 1,
          pos: i + 1,
          gap: 0,
          interval: 0
        };
      })
    };
    [0, 1, 2].forEach(function (s) {
      const best = state.cars.reduce((a, c) => (c.sectors[s].time < a.sectors[s].time ? c : a));
      state.bestSectors[s] = best.sectors[s].time;
      best.sectors[s].mark = 'purple';
    });
    const quickest = state.cars.reduce((a, c) => (c.bestLap < a.bestLap ? c : a));
    state.fastest = { driver: quickest.id, time: quickest.bestLap, lap: START_LAP - 1 };
    seedEvents();
    order();
  }

  function seedEvents() {
    const leader = state.cars[0].id;
    [
      { lap: 1, kind: 'flag', text: 'Grünes Licht – das Rennen ist gestartet.' },
      { lap: 1, kind: 'overtake', text: `${code(leader)} führt nach der ersten Kurve.` },
      { lap: 9, kind: 'flag', text: 'Gelbe Flagge in Sektor 2 – Dreher in Kurve 12, keine Schäden.' },
      { lap: 14, kind: 'weather', text: 'Wolken ziehen auf – Regenwahrscheinlichkeit ab Runde 45 steigt auf 40 %.' },
      { lap: 18, kind: 'pit', text: 'Erste Boxenstopp-Welle: die Mittelfeldteams wechseln auf Hard.' },
      { lap: 24, kind: 'info', text: 'DRS ist freigegeben.' }
    ].forEach((e) => pushEvent(e.kind, e.text, e.lap));
  }

  function code(id) {
    return D.DRIVER[id].code;
  }

  function pushEvent(kind, text, lap) {
    state.events.unshift({ kind, text, lap: lap || state.lap, time: new Date() });
    state.events.length = Math.min(state.events.length, 60);
  }

  function order() {
    const prev = state.cars.map((c) => c.id);
    state.cars.sort(function (a, b) {
      if (a.status === 'out' && b.status !== 'out') return 1;
      if (b.status === 'out' && a.status !== 'out') return -1;
      return b.dist - a.dist;
    });
    const leader = state.cars[0];
    state.cars.forEach(function (c, i) {
      c.pos = i + 1;
      c.gap = (leader.dist - c.dist) * track.baseLap;
      c.interval = i === 0 ? 0 : (state.cars[i - 1].dist - c.dist) * track.baseLap;
    });
    return prev;
  }

  function detectOvertakes(prev) {
    if (simTime - lastOvertakeEvent < 25) return;
    for (let i = 0; i < Math.min(10, state.cars.length); i++) {
      const car = state.cars[i];
      const before = prev.indexOf(car.id);
      if (before > i && car.status === 'run') {
        const passed = state.cars[i + 1];
        if (passed && passed.status === 'run') {
          pushEvent('overtake', `${code(car.id)} geht an ${code(passed.id)} vorbei – jetzt P${car.pos}.`);
          lastOvertakeEvent = simTime;
          return;
        }
      }
    }
  }

  function step() {
    const dt = (TICK_MS / 1000) * SPEED;
    simTime += dt;

    if (state.flag.kind !== 'green' && simTime > state.flag.until) {
      pushEvent('flag', state.flag.kind === 'sc' ? 'Safety Car kommt in dieser Runde herein.' : `Sektor ${state.flag.sector} wieder grün.`);
      state.flag = { kind: 'green', sector: null, until: 0 };
    } else if (state.flag.kind === 'green' && rand() < 0.0009) {
      triggerYellow();
    }

    state.cars.forEach(function (car) {
      if (car.status === 'out' || state.finished) return;
      if (car.status === 'pit') {
        if (simTime >= car.pitUntil) {
          car.status = 'run';
          const from = car.tyre.compound;
          const to = state.lap > track.laps * 0.65 ? (rand() < 0.5 ? 'soft' : 'medium') : 'hard';
          car.tyre = { compound: to, age: 0 };
          car.stops++;
          pushEvent('pit', `Boxenstopp ${code(car.id)}: ${D.TYRE[from].name} → ${D.TYRE[to].name} (${(2.1 + rand() * 1.4).toFixed(1).replace('.', ',')} s).`);
        }
        car.dist += dt / (car.pace * 3);                // langsam durch die Boxengasse
        return;
      }

      let pace = car.pace + car.tyre.age * 0.05 + D.gauss(rand) * 0.15;
      if (state.flag.kind === 'sc') pace *= 1.45;
      const before = car.dist;
      car.dist += dt / pace;

      // Sektorgrenzen bei 1/3, 2/3 und Ziellinie
      const sBefore = Math.floor((before % 1) * 3);
      const sAfter = Math.floor((car.dist % 1) * 3);
      // genauer Zeitpunkt der Grenzüberquerung innerhalb des Takts
      const boundary = (Math.floor(before * 3) + 1) / 3;
      const crossedAt = simTime - dt * (car.dist - boundary) / (car.dist - before);
      if ((sAfter !== sBefore || Math.floor(car.dist) !== Math.floor(before)) && !car.timing) {
        car.timing = true;                         // erste Grenze: ab hier wird gemessen
        car.sectorStart = car.lapStart = crossedAt;
      } else if (sAfter !== sBefore || Math.floor(car.dist) !== Math.floor(before)) {
        const sector = sBefore;
        const t = crossedAt - car.sectorStart;
        car.sectorStart = crossedAt;
        let mark = 'yellow';
        if (t < state.bestSectors[sector]) {
          state.bestSectors[sector] = t;
          mark = 'purple';
        } else if (t < car.bestOwn[sector]) {
          mark = 'green';
        }
        car.bestOwn[sector] = Math.min(car.bestOwn[sector], t);
        car.sectors[sector] = { time: t, mark };
        if (sector === 0) car.sectors[1] = car.sectors[2] = null;
      }

      if (Math.floor(car.dist) !== Math.floor(before)) lapComplete(car, crossedAt);
    });

    // Ausfall (selten)
    if (rand() < 0.0006) {
      const candidates = state.cars.filter((c) => c.status === 'run' && c.pos > 6);
      if (candidates.length) {
        const car = candidates[Math.floor(rand() * candidates.length)];
        car.status = 'out';
        pushEvent('dnf', `Ausfall: ${code(car.id)} stellt den Wagen mit Hydraulikproblem ab.`);
        triggerYellow(2);
      }
    }

    const prev = order();
    detectOvertakes(prev);
    state.lap = Math.min(track.laps, Math.floor(state.cars[0].dist) + 1);

    if (state.cars[0].dist >= track.laps && !state.finished) {
      state.finished = true;
      pushEvent('flag', `Zielflagge! ${D.DRIVER[state.cars[0].id].first} ${D.DRIVER[state.cars[0].id].last} gewinnt den ${track.gp}.`);
      setTimeout(function () {
        reset();
        pushEvent('info', 'Simulation neu gestartet.');
      }, 15000);
    }

    state.latencyMs = Math.round(80 + rand() * 90);
    state.updatedAt = new Date();
  }

  function lapComplete(car, at) {
    const t = at - car.lapStart;
    car.lapStart = at;
    if (t > 60) {
      car.lastLap = t;
      if (!car.bestLap || t < car.bestLap) car.bestLap = t;
      if (!state.fastest || t < state.fastest.time) {
        const first = !state.fastest;
        state.fastest = { driver: car.id, time: t, lap: Math.floor(car.dist) };
        if (!first) pushEvent('fastest', `Schnellste Runde: ${code(car.id)} mit ${fmtLap(t)}.`);
      }
    }
    car.tyre.age++;
    if (car.tyre.age > STINT[car.tyre.compound] && Math.floor(car.dist) < track.laps - 4) {
      car.status = 'pit';
      car.pitUntil = simTime + PIT_LOSS;
    }
  }

  function fmtLap(sec) {
    const m = Math.floor(sec / 60);
    return `${m}:${(sec - m * 60).toFixed(3).padStart(6, '0')}`.replace('.', ',');
  }

  function triggerYellow(sector) {
    const s = sector || 1 + Math.floor(rand() * 3);
    state.flag = { kind: 'yellow', sector: s, until: simTime + 45 };
    pushEvent('flag', `Gelbe Flagge in Sektor ${s}.`);
  }

  function triggerSafetyCar() {
    state.flag = { kind: 'sc', sector: null, until: simTime + 120 };
    pushEvent('flag', 'Safety Car auf der Strecke – Trümmerteile in Kurve 1.');
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(state), function (key, value) {
      return (typeof value === 'string' && (key === 'time' || key === 'updatedAt')) ? new Date(value) : value;
    });
  }

  function emit() {
    const view = frozen || state;
    listeners.forEach((fn) => fn(view));
  }

  reset();
  setInterval(function () {
    step();
    emit();
  }, TICK_MS);

  return {
    /** Abonnieren; gibt eine Abmelde-Funktion zurück */
    subscribe(fn) {
      listeners.push(fn);
      fn(frozen || state);
      return () => (listeners = listeners.filter((x) => x !== fn));
    },
    get state() {
      return frozen || state;
    },
    /** Verbindung simulieren (US-NFR05): offline → letzter Stand bleibt stehen */
    setOnline(online) {
      if (online) {
        frozen = null;
        state.online = true;
      } else if (!frozen) {
        frozen = snapshot();
        frozen.online = false;
      }
      emit();
    },
    triggerYellow: () => triggerYellow(),
    triggerSafetyCar,
    restart: reset,
    fmtLap
  };
})();
