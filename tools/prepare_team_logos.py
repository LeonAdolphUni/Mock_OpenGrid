"""
OpenGrid – Team-Logos vorbereiten
=================================
Nimmt die Original-Logos aus assets/teams/raw/ (Quelle: Wikimedia Commons,
siehe assets/teams/QUELLEN.md) und schreibt zugeschnittene Kopien nach
assets/teams/<team>.svg. Zugeschnitten wird nur die viewBox, damit z. B.
vom Mercedes-Logo nur der Stern und nicht der Schriftzug übrig bleibt.
Die Pfade selbst bleiben unverändert.

Die einfarbige Darstellung (weiß) passiert erst in der Oberfläche:
  Web:     CSS-Filter in .team-tile__logo
  Flutter: SvgPicture.asset(..., colorFilter: ColorFilter.mode(Colors.white, BlendMode.srcIn))

Nur für den privaten Gebrauch – die Logos sind markenrechtlich geschützt.

Aufruf:  python tools/prepare_team_logos.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "teams" / "raw"
OUT = ROOT / "assets" / "teams"

# team-id → (Rohdatei, Zuschnitt als viewBox "x y b h" oder None)
LOGOS = {
    "mclaren":      ("mclaren.svg", None),                       # Speedmark
    "ferrari":      ("ferrari-wordmark.svg", None),              # Schriftzug (Pferd nicht auf Commons)
    "mercedes":     ("mercedes.svg", "0 0 354.33 354.33"),       # nur der Stern
    "red-bull":     ("red-bull.svg", None),                      # Schriftzug (Stiere nicht auf Commons)
    "aston-martin": ("aston-martin-wordmark.svg", None),         # Schriftzug (Flügel nicht auf Commons)
    "alpine":       ("alpine.svg", "0 0 362 184"),               # nur das "A"
    "williams":     ("williams.svg", None),                      # Schriftzug
    "haas":         ("haas.svg", "0 0 202 180"),                 # nur das "H"-Zeichen
    "audi":         ("audi.svg", None),                          # vier Ringe
    "cadillac":     ("cadillac.svg", "380 0 1910 730"),          # nur das Wappen
}


def crop(svg_text, view_box):
    """Setzt viewBox, width und height am <svg>-Wurzelelement."""
    root = re.search(r"<svg\b[^>]*>", svg_text, re.S)
    tag = root.group(0)
    _, _, w, h = view_box.split()
    new_tag = re.sub(r'\s(viewBox|width|height)="[^"]*"', "", tag)
    new_tag = new_tag.replace("<svg", f'<svg viewBox="{view_box}" width="{w}" height="{h}"', 1)
    return svg_text[:root.start()] + new_tag + svg_text[root.end():]


def main():
    for team, (source, view_box) in LOGOS.items():
        text = (RAW / source).read_text(encoding="utf-8")
        if view_box:
            text = crop(text, view_box)
        (OUT / f"{team}.svg").write_text(text, encoding="utf-8")
        print(f"{team:13} <- {source}" + (f"  (Zuschnitt {view_box})" if view_box else ""))


if __name__ == "__main__":
    main()
