"""
OpenGrid – F1-Wagen (Seitenansicht) als Silhouette berechnen
============================================================
Proportionen nach einem echten F1-Wagen (≈ 5,6 m lang, 3,6 m Radstand,
0,72 m Raddurchmesser, 0,95 m hoch), für 24 px leicht überhöht.

Die Räder stehen "vor" der Karosserie: um jedes Rad wird ein Spalt von
0,75 Einheiten aus der Karosserie ausgeschnitten (Boolesche Geometrie
mit shapely). Ergebnis ist EIN Pfad (fill-rule evenodd), der in
tools/f1_car_path.txt landet und von build_icons.py gelesen wird.

Nur nötig, wenn der Wagen geändert wird:
  pip install shapely
  python tools/f1_car.py && python tools/build_icons.py
"""
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union

GROUND = 16.0
WHEEL_R = 1.75
GAP = 0.75
REAR_AXLE = (4.4, GROUND - WHEEL_R)
FRONT_AXLE = (18.0, GROUND - WHEEL_R)

# Heckflügel: Flügelblatt + Endplatte (L-Form)
REAR_WING = Polygon([(0.8, 10.2), (3.8, 10.2), (3.8, 11.2), (1.7, 11.2), (1.7, 13.6), (0.8, 13.6)])

# Karosserie im Uhrzeigersinn: Motorabdeckung → Airbox → Cockpit → Nase →
# Frontflügel (direkt unter der Nasenspitze) → Unterseite → Seitenkasten
BODY = Polygon([
    (2.2, 12.2), (7.8, 11.7),
    (8.3, 10.9), (8.9, 10.3), (9.6, 10.1), (10.4, 10.1),      # Airbox
    (11.3, 11.3), (12.9, 11.3),                               # Cockpit
    (17.0, 12.3), (21.2, 13.1), (22.3, 13.5), (22.6, 13.9),   # Nase
    (22.6, 14.9), (23.2, 14.9), (23.2, 15.5), (19.6, 15.5),   # Frontflügel: dünne Platte,
    (19.6, 14.95), (22.0, 14.95), (22.0, 14.35),              # mit Schlitz zur Nase
    (16.0, 14.2), (14.6, 13.9), (14.2, 14.6), (14.0, 15.5),   # Nasenunterseite, Seitenkasten vorne
    (7.2, 15.5), (6.8, 13.4), (5.0, 12.9), (2.2, 12.8),       # Boden, Seitenkasten hinten
])

# Halo als schmaler Bügel über dem Cockpit
HALO = LineString([(11.3, 11.3), (11.9, 10.6), (12.6, 10.4), (13.2, 10.7), (13.5, 11.3)]).buffer(0.3)

ROUND = 0.15   # leichte Rundung aller Ecken


def wheel(center):
    """Rad mit kleiner Nabenöffnung."""
    return Point(center).buffer(WHEEL_R, 64).difference(Point(center).buffer(0.5, 32))


def to_path(geom):
    """Shapely-Geometrie → SVG-Pfad (Außen- und Innenringe)."""
    polys = getattr(geom, "geoms", [geom])
    parts = []
    for poly in polys:
        if poly.area < 0.4:          # Splitter (z. B. hinter dem Rad) weglassen
            continue
        for ring in [poly.exterior, *poly.interiors]:
            pts = list(ring.coords)[:-1]
            parts.append("M" + " L".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z")
    return " ".join(parts)


def build():
    body = unary_union([REAR_WING, BODY, HALO])
    body = body.buffer(ROUND, join_style="round").buffer(-ROUND, join_style="round")
    for axle in (REAR_AXLE, FRONT_AXLE):
        body = body.difference(Point(axle).buffer(WHEEL_R + GAP, 64))
    car = unary_union([body, wheel(REAR_AXLE), wheel(FRONT_AXLE)])
    return to_path(car.simplify(0.02))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "f1_car_path.txt"
    out.write_text(build() + "\n", encoding="utf-8")
    print(f"Pfad geschrieben: {out.name} ({out.stat().st_size} Bytes)")
