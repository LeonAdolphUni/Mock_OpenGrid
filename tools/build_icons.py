"""
OpenGrid – Icons, Team-Kacheln und Übersichtsseite
==================================================
Icon-Basis ist Material Symbols Outlined (Google Fonts). Die sind in den
Seiten per Ligatur eingebunden und in Flutter direkt verfügbar:
  <span class="material-symbols-outlined icon">home</span>
  → Icon(Icons.home_outlined)   aktiv: Icon(Icons.home)

Dieses Skript erzeugt nur, was Material nicht hat, plus die Übersicht:
  icons.svg         Sprite mit eigenen Icons im Material-Raster (F1-Auto)
  icons/<name>.svg  dieselben Icons als Einzeldateien für Flutter
  icons.html        Übersichtsseite (Material-Icons, F1-Auto, Teams, Reifen)
Außerdem hängt es an alle Verweise auf icons.svg, styles.css und app.js
einen Versions-Hash an, damit der Browser keine alten Dateien zeigt.

Die erzeugten Dateien liegen fertig im Ordner – das Skript ist nur nötig,
wenn Icons, Teams oder Reifen geändert werden (kein Build-Schritt).

Aufruf:  python tools/build_icons.py
"""
import hashlib
import re
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Material Symbols: (Ligatur, Beschreibung). Die Ligatur ist zugleich der
# Name in Flutter (Icons.<ligatur> bzw. Icons.<ligatur>_outlined).
# ---------------------------------------------------------------------------
MATERIAL_F1 = [
    ("sports_motorsports", "Fahrer (Helm)"),
    ("groups",             "Team"),
    ("emoji_events",       "Pokal / Meisterschaft"),
    ("leaderboard",        "Wertung"),
    ("calendar_month",     "Rennkalender"),
    ("route",              "Strecke"),
    ("timer",              "Rundenzeit"),
    ("speed",              "Geschwindigkeit"),
    ("swap_vert",          "Positionswechsel"),
    ("tire_repair",        "Reifen / Boxenstopp"),
    ("build",              "Technik / Setup"),
    ("water_drop",         "Regen / Wetter"),
    ("sensors",            "Live"),
]

MATERIAL_UI = [
    ("home",             "Start"),
    ("article",          "News"),
    ("person",           "Profil"),
    ("settings",         "Einstellungen"),
    ("login",            "Anmelden"),
    ("logout",           "Abmelden"),
    ("visibility",       "Passwort anzeigen"),
    ("visibility_off",   "Passwort verbergen"),
    ("search",           "Suche"),
    ("notifications",    "Benachrichtigungen"),
    ("add",              "Hinzufügen"),
    ("close",            "Schließen"),
    ("menu",             "Menü"),
    ("check",            "Ausgewählt"),
    ("arrow_back",       "Zurück"),
    ("arrow_drop_down",  "Aufklappen"),
    ("chevron_right",    "Weiter"),
    ("image",            "Bild-Platzhalter"),
    ("desktop_windows",  "Desktop"),
    ("smartphone",       "Mobile"),
]

# ---------------------------------------------------------------------------
# Eigene Icons im Material-Raster (24 × 24, 2 px Innenabstand, Kontur 1.6,
# runde Ecken). Inaktiv = Kontur, aktiv = gefüllt (wie bei Material).
# ---------------------------------------------------------------------------
STROKE = 1.6

def rrect(x, y, w, h, r):
    """Abgerundetes Rechteck als Pfad."""
    return (f"M{x + r} {y} H{x + w - r} a{r} {r} 0 0 1 {r} {r} V{y + h - r} "
            f"a{r} {r} 0 0 1 {-r} {r} H{x + r} a{r} {r} 0 0 1 {-r} {-r} V{y + r} "
            f"a{r} {r} 0 0 1 {r} {-r} Z")


# F1-Wagen, Seitenansicht nach rechts, als Vollfläche (wie in F1-Apps):
# eine Kontur wäre bei diesem Detailgrad auf 24 px nicht lesbar.
# Geometrie und Proportionen: tools/f1_car.py → tools/f1_car_path.txt
F1_CAR_PATH = (Path(__file__).resolve().parent / "f1_car_path.txt").read_text(encoding="utf-8").strip()

CUSTOM_ICONS = {
    # name: (Beschreibung, Formen, viewBox)   ("solid", d) = immer Vollfläche
    "f1-car": ("F1-Wagen (Seitenansicht)", [("solid", F1_CAR_PATH)], "0 1 24 24"),
}

# ---------------------------------------------------------------------------
# Teams: echte Logos (assets/teams/<id>.svg, vorbereitet von
# tools/prepare_team_logos.py) auf einer Team-Kachel (.team-tile).
#   Modus: "white" Logo einfarbig weiß · "silver" Graustufen (für Logos,
#          deren Details in Weiß verloren gingen) · "text" kein Logo → Schriftzug
# Nur für den privaten Gebrauch – die Logos sind markenrechtlich geschützt.
# ---------------------------------------------------------------------------
TEAMS = [
    # id               Name               Teamfarbe   Modus
    ("mclaren",        "McLaren",         "#FF8000",  "white"),
    ("ferrari",        "Ferrari",         "#E8002D",  "white"),
    ("mercedes",       "Mercedes",        "#00D7B6",  "white"),
    ("red-bull",       "Red Bull Racing", "#3671C6",  "white"),
    ("aston-martin",   "Aston Martin",    "#229971",  "white"),
    ("alpine",         "Alpine",          "#0093CC",  "white"),
    ("williams",       "Williams",        "#64C4FF",  "white"),
    ("racing-bulls",   "Racing Bulls",    "#6692FF",  "text"),
    ("haas",           "Haas",            "#E6002B",  "white"),
    ("audi",           "Audi",            "#A9ACB1",  "white"),
    ("cadillac",       "Cadillac",        "#EDEDED",  "silver"),
]

# Reifenmischungen: (id, Name, Buchstabe, Farbe der Seitenwand)
TYRES = [
    ("soft",         "Soft",         "S", "#DA291C"),
    ("medium",       "Medium",       "M", "#FFD12E"),
    ("hard",         "Hard",         "H", "#F0F0EC"),
    ("intermediate", "Intermediate", "I", "#43B02A"),
    ("wet",          "Wet",          "W", "#0067AD"),
]


# ---------------------------------------------------------------------------
# Eigene Icons ausgeben
# ---------------------------------------------------------------------------
def icon_paths(paths, fill, stroke):
    attrs = (f'fill-rule="evenodd" stroke-width="{STROKE}" '
             f'stroke-linejoin="round" stroke-linecap="round"')
    out = []
    for item in paths:
        if isinstance(item, tuple) and item[0] == "solid":   # Vollfläche in Konturfarbe
            out.append(f'<path d="{item[1]}" fill-rule="evenodd" {stroke.replace("stroke=", "fill=")}/>')
        elif isinstance(item, tuple):          # ("line", d): nie gefüllt
            out.append(f'<path d="{item[1]}" fill="none" {stroke} stroke-width="1.2" stroke-linecap="round"/>')
        else:
            out.append(f'<path d="{item}" {fill} {stroke} {attrs}/>')
    return out


def build_sprite():
    # --icon-fill / --icon-stroke-width: inaktiv Kontur 1.6, aktiv gefüllt mit Kontur 0.6
    out = ['<svg xmlns="http://www.w3.org/2000/svg">',
           '  <!-- OpenGrid – eigene Icons im Material-Raster, generiert von tools/build_icons.py -->']
    for name, (label, paths, view_box) in CUSTOM_ICONS.items():
        out.append(f'  <!-- {label} -->')
        out.append(f'  <symbol id="{name}" viewBox="{view_box}">')
        out += ["    " + p for p in icon_paths(paths, 'style="fill: var(--icon-fill, none); stroke-width: var(--icon-stroke-width, 1.6)"', 'stroke="currentColor"')]
        out.append('  </symbol>')
    out.append('</svg>\n')
    (ROOT / "icons.svg").write_text("\n".join(out), encoding="utf-8")


def build_single_files():
    # Für Flutter: <name>.svg (Kontur) und <name>-filled.svg (gefüllt), weiß
    folder = ROOT / "icons"
    folder.mkdir(exist_ok=True)
    for old in folder.glob("*.svg"):
        old.unlink()
    for name, (label, paths, view_box) in CUSTOM_ICONS.items():
        # gefüllte Variante mit dünnerer Kontur, damit die Abstände sichtbar bleiben
        for suffix, fill in (("", 'fill="none"'), ("-filled", 'fill="#FFFFFF" style="stroke-width: 0.6"')):
            lines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}" width="24" height="24">',
                     f'  <!-- {label} -->']
            lines += ["  " + p for p in icon_paths(paths, fill, 'stroke="#FFFFFF"')]
            lines.append('</svg>\n')
            (folder / f"{name}{suffix}.svg").write_text("\n".join(lines), encoding="utf-8")


# ---------------------------------------------------------------------------
# Übersichtsseite
# ---------------------------------------------------------------------------
def material(lig, extra=""):
    cls = "material-symbols-outlined icon" + (f" {extra}" if extra else "")
    return f'<span class="{cls}" aria-hidden="true">{lig}</span>'


def custom(name, extra=""):
    cls = "icon" + (f" {extra}" if extra else "")
    return f'<svg class="{cls}" aria-hidden="true"><use href="icons.svg#{name}"></use></svg>'


def tile(inactive, active, caption, code):
    return (f'        <li class="icon-tile"><span class="icon-tile__pair">'
            f'<span class="text-secondary">{inactive}</span>{active}</span>'
            f'<span class="body-small">{escape(caption)}</span>'
            f'<code class="icon-tile__code">{escape(code)}</code></li>')


def material_tile(lig, label):
    return tile(material(lig), material(lig, "icon--active"), label, lig)


def custom_tile(name, label):
    return tile(custom(name), custom(name, "icon--active"), label, f"{name}.svg")


def team_tile(tid, name, color, mode):
    if mode == "text":
        logo = f'<span class="team-tile__wordmark">{escape(name)}</span>'
    else:
        extra = " team-tile__logo--silver" if mode == "silver" else ""
        logo = f'<img class="team-tile__logo{extra}" src="assets/teams/{tid}.svg" alt="">'
    return (f'        <li class="team-tile" style="--team-color: {color}" aria-label="{escape(name)}">'
            f'{logo}<span class="team-tile__name">{escape(name)}</span></li>')


def tyre_tile(tid, name, letter, color):
    return (f'        <li class="icon-tile"><span class="icon-tile__pair">'
            f'<span class="tyre-badge" style="--tyre-color: {color}" aria-hidden="true">{letter}</span>'
            f'<span class="tyre-badge tyre-badge--large" style="--tyre-color: {color}" aria-hidden="true">{letter}</span>'
            f'</span><span class="body-small">{escape(name)}</span></li>')


def section(sid, title, note, tiles, list_class="icon-grid"):
    note_html = f'\n      <p class="body-medium text-secondary icon-section__note">{note}</p>' if note else ""
    return f'''    <section class="overview__section" aria-labelledby="{sid}-heading">
      <h2 class="title-medium text-secondary" id="{sid}-heading">{title}</h2>{note_html}
      <ul class="{list_class}">
{chr(10).join(tiles)}
      </ul>
    </section>
'''


def build_gallery():
    f1 = [material_tile(*i) for i in MATERIAL_F1] + [custom_tile(n, v[0]) for n, v in CUSTOM_ICONS.items()]
    ui = [material_tile(*i) for i in MATERIAL_UI]
    teams = [team_tile(*t) for t in TEAMS]
    tyres = [tyre_tile(*t) for t in TYRES]

    html = f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>OpenGrid – Icons</title>

  <!-- Schrift + Icons (Google Fonts) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block">

  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Icon-Übersicht (nicht Teil der App).
       GENERIERT von tools/build_icons.py – Änderungen bitte dort vornehmen. -->
  <main class="overview overview--wide">
    <header class="overview__header">
      <h1 class="headline-medium">Icons</h1>
      <p class="body-large text-secondary">Material Symbols Outlined: inaktiv als Kontur, aktiv gefüllt. In Flutter direkt verfügbar über <code>Icons.&lt;name&gt;_outlined</code> bzw. <code>Icons.&lt;name&gt;</code>. Was Material nicht hat (F1-Wagen), ist im selben Raster ergänzt.</p>
    </header>

    <section class="overview__section" aria-labelledby="sizes-heading">
      <h2 class="title-medium text-secondary" id="sizes-heading">Größen und Zustände</h2>
      <div class="icon-sample">
        {material("sports_motorsports", "text-secondary")}
        <span class="body-small text-secondary">24 · inaktiv</span>
        {material("sports_motorsports", "icon--active")}
        <span class="body-small text-secondary">24 · aktiv</span>
        {material("sports_motorsports", "icon--large icon--active")}
        <span class="body-small text-secondary">40 · aktiv</span>
        {custom("f1-car", "icon--large icon--active")}
        <img class="icon-sample__logo" src="logo-mark.svg" alt="OpenGrid-Bildmarke zum Vergleich">
      </div>
    </section>

{section("f1", "Formel 1 (inaktiv / aktiv)", "", f1)}
{section("teams", "Teams", "Echte Team-Logos (Wikimedia Commons) einheitlich in Weiß auf einer Kachel, Streifen in der Teamfarbe. Nur für den privaten Gebrauch – die Logos sind markenrechtlich geschützt. Für Racing Bulls gibt es dort kein Logo, daher vorerst der Schriftzug.", teams, "team-grid")}
{section("tyres", "Reifenmischungen", "Ring in der Farbe der Mischung mit Kennbuchstabe, wie in den gängigen F1-Apps.", tyres)}
{section("ui", "Oberfläche (inaktiv / aktiv)", "", ui)}  </main>

  <!-- Mockup-Navigation (nur zum Durchklicken, nicht Teil der App) -->
  <nav class="mockup-nav" aria-label="Mockup-Screens">
    <a href="index.html">Übersicht</a>
    <a href="desktop-home.html">Desktop · Start</a>
    <a href="desktop-login.html">Desktop · Login</a>
    <a href="mobile-home.html">Mobile · Start</a>
    <a href="mobile-login.html">Mobile · Login</a>
    <a href="icons.html" aria-current="page">Icons</a>
  </nav>

</body>
</html>
'''
    (ROOT / "icons.html").write_text(html, encoding="utf-8")


def stamp_versions():
    """Cache-Busting: hängt an alle Verweise auf icons.svg, styles.css und die
    Skripte einen Inhalts-Hash an (z. B. styles.css?v=1a2b3c4d), damit der
    Browser nach einer Änderung nicht die alte Datei aus dem Cache zeigt."""
    for asset in ("icons.svg", "styles.css", "variants.css", "config.js", "api.js", "live.js",
                  "history.js", "og-data.js", "og-ui.js", "app.js"):
        version = hashlib.sha1((ROOT / asset).read_bytes()).hexdigest()[:8]
        pattern = re.compile(re.escape(asset) + r'(\?v=[0-9a-f]+)?(?=[#"])')
        for page in ROOT.glob("*.html"):
            text = page.read_text(encoding="utf-8")
            updated = pattern.sub(f"{asset}?v={version}", text)
            if updated != text:
                page.write_text(updated, encoding="utf-8")


if __name__ == "__main__":
    build_sprite()
    build_single_files()
    build_gallery()
    stamp_versions()
    print(f"{len(MATERIAL_F1) + len(MATERIAL_UI)} Material-Icons, {len(CUSTOM_ICONS)} eigene, "
          f"{len(TEAMS)} Teams, {len(TYRES)} Reifen -> icons.svg, icons/, icons.html")
