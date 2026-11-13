# Aufgaben: Login-Fenster (Design)

Ziel: Die Fenster **Login** und **Registrieren** sind da und sehen aus wie im Mockup, **ohne**
„Mit Google/GitHub fortfahren“. Eine Verbindung zum Server gibt es hier noch nicht:
- „Anmelden“ öffnet direkt den App-Rahmen.
- „Konto erstellen“ prüft nur, ob die Felder ausgefüllt sind.

Die echte Anmeldung (Server, Tokens, sicherer Speicher, Abmelden) steht in **`AUFGABEN-Anmeldung.md`**.
Vorlage: HTML in `login-clean/`, Flutter in `Flutter_Version_Prototyp/lib/login_page.dart`.

Voraussetzung: Die Aufgaben aus `AUFGABEN.md` (Rahmen, inkl. Z1–Z3) sind erledigt.
Wer L1 bis L10 der Reihe nach umsetzt, hat genau den Stand des Prototyps. L11 und L12 bauen die Registrieren-Seite dazu.

**Spielregeln** (wie beim Rahmen)
- Jede Aufgabe = **ein Commit**, Message beginnt mit der ID, z. B. `L4: Login-Seite Grundgerüst`.
- Vor dem Commit: `flutter analyze` meldet „No issues found!“, die App startet, und ab L4 ist `flutter test` grün.
- Vor jeder Aufgabe `git pull`. L4 bis L12 ändern alle `lib/login_page.dart`, deshalb **nacheinander** erledigen.
- Branch-Vorschlag: `feature/login`, von `dev` abzweigen.

---

## Übersicht

| ✓ | ID | Aufgabe | Dateien | braucht vorher | Wer |
|---|---|---|---|---|---|
| ☐ | L1 | Großes Logo (Bildmarke + Schriftzug) | `lib/logo_full.dart` | – | Mario |
| ☐ | L2 | Maße und gleiche Größen auf allen Geräten | `lib/theme.dart` | – | Mario |
| ☐ | L3 | Aussehen von Textfeldern und Buttons | `lib/theme.dart` | L2 | Mario |
| ☐ | L4 | Login-Seite Grundgerüst (Karte, Logo, Titel) | `lib/login_page.dart`, `lib/main.dart`, `test/shell_test.dart` | L1, L3 | Mario |
| ☐ | L5 | E-Mail-Feld | `lib/login_page.dart` | L4 | Mario |
| ☐ | L6 | Passwort-Feld mit Auge | `lib/login_page.dart` | L5 | Leon |
| ☐ | L7 | Anmelden-Button öffnet den Rahmen | `lib/login_page.dart` | L6 | Leon |
| ☐ | L8 | „Passwort vergessen?“ und „Registrieren“ | `lib/login_page.dart` | L7 | Leon |
| ☐ | L9 | Tastatur und automatisches Ausfüllen | `lib/login_page.dart` | L8 | Leon |
| ☐ | L10 | Tests für den Login | `test/login_test.dart` | L9 | Leon |
| ☐ | L11 | Login aufteilen: Layout und Passwortfeld | `lib/auth_layout.dart`, `lib/password_field.dart`, `lib/login_page.dart` | L10 | Leon |
| ☐ | L12 | Registrieren-Seite | `lib/register_page.dart`, `lib/theme.dart`, `lib/login_page.dart` | L11 | Leon |

**Aufteilung**

| | Aufgaben | Inhalt |
|---|---|---|
| **Mario** (erster Teil) | L1 → L2 → L3 → L4 → L5 | Logo, Theme, Seitengerüst, E-Mail-Feld |
| **Leon** (zweiter Teil) | L6 → … → L12 | Passwort, Buttons, Tastatur, Tests, Registrieren-Seite |

- L1 und L2 hängen von nichts ab, Mario kann damit sofort anfangen.
- **Übergabe:** Leon braucht Marios fertigen Stand **L5**. Mario sagt Bescheid, sobald L5 gepusht ist, dann `git pull` und los mit L6.
- Nach L5 macht Mario mit der Funktion weiter (`AUFGABEN-Anmeldung.md`, F1–F7). Das läuft parallel zu Leons L6–L12.

---

## Mario

### L1: Großes Logo (Bildmarke + Schriftzug)

**Ziel:** Ein Widget `OgLogoFull` zeigt die OG-Bildmarke und darunter „Open**Grid**“ („Open“ weiß, „Grid“ rot).

> Warum nicht `icon_transparent.svg`? Darin ist der Schriftzug als SVG-Text mit Schatten-Filter.
> Den kann `flutter_svg` nicht darstellen, und der Text käme in einer Ersatzschrift. Darum nehmen
> wir die schon vorhandene Bildmarke `assets/logo-mark.svg` plus echten Text.

1. Datei `lib/logo_full.dart` anlegen:

```dart
// Großes Logo: Bildmarke "OG" + Schriftzug "OpenGrid" ("Grid" in Rot).
// Der Schriftzug ist echter Text statt SVG, damit er scharf und lesbar bleibt.
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';

import 'theme.dart';

class OgLogoFull extends StatelessWidget {
  const OgLogoFull({super.key});

  @override
  Widget build(BuildContext context) {
    final style = GoogleFonts.roboto(
      fontSize: 26,
      height: 1,
      fontWeight: FontWeight.w800,
      letterSpacing: -0.2,
      shadows: const [Shadow(color: Color(0xCC000000), offset: Offset(0, 3), blurRadius: 6)],
    );

    return Semantics(
      label: 'OpenGrid',
      image: true,
      child: ExcludeSemantics(
        child: Column(
          children: [
            SvgPicture.asset('assets/logo-mark.svg', width: 160),
            const SizedBox(height: OgSpace.s3),
            Text.rich(
              TextSpan(
                children: [
                  TextSpan(text: 'Open', style: style.copyWith(color: OgColors.onAccent)),
                  TextSpan(text: 'Grid', style: style.copyWith(color: OgColors.accent)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

**Prüfen:** `flutter analyze` meldet keine Fehler. Sichtbar wird das Logo mit L4.

- [ ] erledigt · Commit: `L1: Großes Logo`

### L2: Maße und gleiche Größen auf allen Geräten

**Ziel:** Neue Maße für den Login. Außerdem sind Textfelder und Buttons auf allen Geräten gleich groß
(Felder 56 px, Buttons 48 px). Ohne diese Einstellung macht Flutter sie am Desktop kleiner („compact“).

1. In `lib/theme.dart` in `OgSpace` unter `static const s6 = 32.0;` ergänzen:

```dart
  static const s7 = 40.0;
```

2. In `OgSize` unter `static const compactBreakpoint = 760.0;` ergänzen:

```dart

  /// Login: Karte höchstens so breit, darunter ohne Kartenrahmen.
  static const loginMaxWidth = 400.0;
  static const loginCardBreakpoint = 600.0;
```

3. In `buildOgTheme()` im `ThemeData(...)` unter `dividerColor: OgColors.divider,` ergänzen:

```dart
    // Überall gleiche Größen (Desktop wäre sonst "compact": Felder 48 statt 56 px)
    visualDensity: VisualDensity.standard,
```

**Prüfen:** `flutter analyze` meldet keine Fehler, der Rahmen sieht unverändert aus, und `flutter test` ist grün.

- [ ] erledigt · Commit: `L2: Login-Maße, gleiche Größen auf allen Geräten`

### L3: Aussehen von Textfeldern und Buttons

**Ziel:** Alle Textfelder und Buttons der App sehen einheitlich aus. Das gilt auch für spätere Seiten.

| Element | Aussehen |
|---|---|
| Textfeld | Rahmen 1 px `#6E6E73`, Ecken 4 px. Fokus: Rahmen 2 px hell `#EDEDED`. Label grau, beim Fokus hell |
| Primär-Button (`FilledButton`) | rot `#E11D48`, Schrift weiß, mindestens 48 px hoch |
| Text-Button (`TextButton`) | neutral hell (nicht rot), mindestens 48 × 48 px, 12 px Innenabstand seitlich |
| Button-Schrift | Roboto 14 px, halbfett (w500) |

1. In `lib/theme.dart` in `buildOgTheme()` unter der Zeile `const label = TextStyle(...);` einfügen:

```dart
  final buttonText = GoogleFonts.roboto(fontSize: 14, height: 20 / 14, fontWeight: FontWeight.w500, letterSpacing: 0.1);
  final fieldBorder = OutlineInputBorder(borderRadius: BorderRadius.circular(4));
```

2. Ganz am Ende von `buildOgTheme()`, direkt **über** der Zeile `  );` (das ist das Ende von
   `base.copyWith(`, also hinter dem `navigationBarTheme`-Block), einfügen:

```dart
    // Textfelder: Rahmen mit schwebendem Label
    inputDecorationTheme: InputDecorationTheme(
      labelStyle: const TextStyle(color: OgColors.onSurfaceVariant),
      floatingLabelStyle: const TextStyle(color: OgColors.onSurface),
      enabledBorder: fieldBorder.copyWith(borderSide: const BorderSide(color: OgColors.outline)),
      focusedBorder: fieldBorder.copyWith(borderSide: const BorderSide(color: OgColors.onSurface, width: 2)),
    ),
    // Primär-Button: einziger roter Button pro Screen
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: OgColors.accent,
        foregroundColor: OgColors.onAccent,
        minimumSize: const Size(64, 48),
        textStyle: buttonText,
      ),
    ),
    // Text-Button: bewusst neutral, damit Rot sparsam bleibt
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: OgColors.onSurface,
        minimumSize: const Size(48, 48),
        padding: const EdgeInsets.symmetric(horizontal: OgSpace.s3),
        textStyle: buttonText,
      ),
    ),
```

**Prüfen:** `flutter analyze` meldet keine Fehler, und `flutter test` ist grün. Sichtbar wird es ab L5.

- [ ] erledigt · Commit: `L3: Theme für Textfelder und Buttons`

### L4: Login-Seite Grundgerüst (Karte, Logo, Titel)

**Ziel:** Die App startet mit dem Login. Bisher zeigt er Logo, „Anmelden“ und den Untertitel.
- **Breit (ab 600 px):** dunkelgraue Karte (`#1C1C1E`, Ecken 16 px), höchstens 400 px breit, mittig.
  Innenabstand oben 40 px, sonst 32 px.
- **Schmal (unter 600 px):** keine Karte, Inhalt direkt auf dem Hintergrund, seitlich 24 px Abstand.

1. Datei `lib/login_page.dart` anlegen:

```dart
// Login – E-Mail + Passwort, ohne OAuth.
// Breit (≥ 600 px): Karte, höchstens 400 px breit, mittig.
// Schmal: ohne Kartenrahmen, Inhalt direkt auf dem Screen.
import 'package:flutter/material.dart';

import 'logo_full.dart';
import 'theme.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final form = _form(context);

          if (constraints.maxWidth < OgSize.loginCardBreakpoint) {
            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: OgSpace.s5, vertical: OgSpace.s6),
                child: form,
              ),
            );
          }

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: OgSpace.s4, vertical: OgSpace.s6),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: OgSize.loginMaxWidth),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(OgSpace.s6, OgSpace.s7, OgSpace.s6, OgSpace.s6),
                  decoration: BoxDecoration(
                    color: OgColors.surface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: form,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _form(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const OgLogoFull(),
        const SizedBox(height: OgSpace.s6),
        Semantics(
          header: true,
          child: Text(
            'Anmelden',
            textAlign: TextAlign.center,
            style: text.headlineSmall?.copyWith(color: OgColors.onSurface),
          ),
        ),
        const SizedBox(height: OgSpace.s2),
        Text(
          'Melde dich mit deinem OpenGrid-Konto an',
          textAlign: TextAlign.center,
          style: text.bodyMedium?.copyWith(color: OgColors.onSurfaceVariant),
        ),
        const SizedBox(height: OgSpace.s6),
        // L5–L8: Felder und Buttons
      ],
    );
  }
}
```

2. In `lib/main.dart`:
   - `import 'shell.dart';` ersetzen durch `import 'login_page.dart';`
   - `home: const AppShell(),` ersetzen durch `home: const LoginPage(),`

3. Die Tests aus Z2/Z3 starten die App und würden jetzt auf dem Login landen. Sie sollen weiter
   direkt den Rahmen testen. In `test/shell_test.dart`:
   - `import 'package:opengrid/main.dart';` ersetzen durch:
     ```dart
     import 'package:opengrid/shell.dart';
     import 'package:opengrid/theme.dart';
     ```
   - unter der Funktion `setWindow(...)` einfügen:
     ```dart

     /// Rahmen direkt starten, ohne Login
     Widget shellApp() => MaterialApp(theme: buildOgTheme(), home: const AppShell());
     ```
   - beide Stellen `await tester.pumpWidget(const OpenGridApp());` ersetzen durch
     `await tester.pumpWidget(shellApp());`

**Prüfen:**
- Breites Fenster: mittig eine Karte mit OG-Logo, „OpenGrid“, „Anmelden“ und „Melde dich mit deinem OpenGrid-Konto an“.
- Fenster schmaler als 600 px: Die Karte verschwindet, und der Inhalt steht direkt auf dem dunklen Hintergrund.
- `flutter test` ist grün.

- [ ] erledigt · Commit: `L4: Login-Seite Grundgerüst`

### L5: E-Mail-Feld

**Ziel:** Ein Textfeld „E-Mail“ mit Rahmen. Das Label rutscht beim Antippen auf den Rahmen, und auf dem Handy erscheint die E-Mail-Tastatur (mit @).

1. In `lib/login_page.dart` die Zeile `        // L5–L8: Felder und Buttons` ersetzen durch:

```dart
        const TextField(
          keyboardType: TextInputType.emailAddress,
          decoration: InputDecoration(labelText: 'E-Mail'),
        ),
        // L6–L8: Passwort und Buttons
```

**Prüfen:** Klick ins Feld: Das Label „E-Mail“ wandert auf den Rahmen, und der Rahmen wird hell und 2 px dick.

- [ ] erledigt · Commit: `L5: E-Mail-Feld`

---

## Leon

### L6: Passwort-Feld mit Auge

**Ziel:** Feld „Passwort“, die Eingabe ist verdeckt. Rechts sitzt ein Auge-Button, der das Passwort ein- und ausblendet.
Das Icon wechselt dabei zwischen Auge und durchgestrichenem Auge.

1. In `lib/login_page.dart` in `_LoginPageState` direkt unter `class _LoginPageState extends State<LoginPage> {` einfügen:

```dart
  bool _hidePassword = true;

```

2. Die Zeile `        // L6–L8: Passwort und Buttons` ersetzen durch:

```dart
        const SizedBox(height: OgSpace.s4),
        TextField(
          obscureText: _hidePassword,
          decoration: InputDecoration(
            labelText: 'Passwort',
            suffixIcon: IconButton(
              tooltip: _hidePassword ? 'Passwort anzeigen' : 'Passwort verbergen',
              icon: Icon(_hidePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined),
              onPressed: () => setState(() => _hidePassword = !_hidePassword),
            ),
          ),
        ),
        // L7–L8: Buttons
```

**Prüfen:** Etwas ins Passwortfeld tippen: Man sieht Punkte. Klick aufs Auge zeigt den Text, ein zweiter Klick verdeckt ihn wieder.

- [ ] erledigt · Commit: `L6: Passwort-Feld mit Auge`

### L7: Anmelden-Button öffnet den Rahmen

**Ziel:** Ein roter Button „Anmelden“ über die volle Breite. Klick öffnet den App-Rahmen (Home).
Den Login ersetzt er dabei (`pushReplacement`), damit „Zurück“ nicht wieder zum Login führt.
Eine echte Prüfung von E-Mail und Passwort gibt es noch nicht.

1. In `lib/login_page.dart` bei den Imports `import 'shell.dart';` ergänzen, sodass sie so aussehen:

```dart
import 'package:flutter/material.dart';

import 'logo_full.dart';
import 'shell.dart';
import 'theme.dart';
```

2. In `_LoginPageState` unter `bool _hidePassword = true;` (und der Leerzeile danach) einfügen:

```dart
  /// Mockup: keine echte Prüfung, "Anmelden" öffnet den App-Rahmen.
  void _login() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const AppShell()),
    );
  }

```

3. Die Zeile `        // L7–L8: Buttons` ersetzen durch:

```dart
        const SizedBox(height: OgSpace.s4),
        FilledButton(onPressed: _login, child: const Text('Anmelden')),
```

   Der Button wird automatisch so breit wie die Felder, weil die `Column` `CrossAxisAlignment.stretch` hat.

**Prüfen:** Klick auf „Anmelden“: Der Rahmen mit den Reitern erscheint, und oben steht „Start“.

- [ ] erledigt · Commit: `L7: Anmelden öffnet den App-Rahmen`

### L8: „Passwort vergessen?“ und „Registrieren“

**Ziel:**
- Rechtsbündig unter dem Passwortfeld steht der Text-Button „Passwort vergessen?“ (hell, nicht rot).
- Ganz unten mittig steht „Noch kein Konto? **Registrieren**“, wobei „Registrieren“ rot ist.
- Beide Buttons tun noch nichts, die Screens folgen später.

1. In `lib/login_page.dart` direkt **über** den zwei Zeilen

```dart
        const SizedBox(height: OgSpace.s4),
        FilledButton(onPressed: _login, child: const Text('Anmelden')),
```

einfügen:

```dart
        const SizedBox(height: OgSpace.s2),
        // Rechtsbündig mit dem Feldrand: Innenabstand des Buttons ausgleichen
        Align(
          alignment: Alignment.centerRight,
          child: Transform.translate(
            offset: const Offset(OgSpace.s3, 0),
            child: TextButton(
              onPressed: () {}, // Screen folgt später
              child: const Text('Passwort vergessen?'),
            ),
          ),
        ),
```

2. Direkt **unter** der Zeile `FilledButton(onPressed: _login, child: const Text('Anmelden')),` einfügen:

```dart
        const SizedBox(height: OgSpace.s6),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('Noch kein Konto?', style: text.bodyMedium?.copyWith(color: OgColors.onSurfaceVariant)),
            TextButton(
              onPressed: () {}, // Screen folgt später
              style: TextButton.styleFrom(
                foregroundColor: OgColors.accentText,
                padding: const EdgeInsets.symmetric(horizontal: OgSpace.s2),
              ),
              child: const Text('Registrieren'),
            ),
          ],
        ),
```

   `Wrap` statt `Row`: Auf sehr schmalen Bildschirmen rutscht „Registrieren“ in die nächste Zeile, statt abgeschnitten zu werden.

**Prüfen:** Der Screen sieht aus wie `login-clean/index.html`: „Passwort vergessen?“ steht bündig mit dem rechten Feldrand, und unten steht „Noch kein Konto? Registrieren“.

- [ ] erledigt · Commit: `L8: Passwort vergessen und Registrieren`

### L9: Tastatur und automatisches Ausfüllen

**Ziel:**
- Enter im E-Mail-Feld springt ins Passwortfeld, Enter im Passwortfeld meldet an.
- Browser und Passwort-Manager erkennen die Felder und bieten gespeicherte Zugangsdaten an.
- Auf dem Handy zeigt die Tastatur „Weiter“ bzw. „Fertig“.

1. In `lib/login_page.dart` in `build` die Zeile

```dart
          final form = _form(context);
```

ersetzen durch:

```dart
          // AutofillGroup: Browser/Passwort-Manager können E-Mail + Passwort ausfüllen
          final form = AutofillGroup(child: _form(context));
```

2. Im E-Mail-Feld unter `keyboardType: TextInputType.emailAddress,` ergänzen:

```dart
          autofillHints: [AutofillHints.email],
          textInputAction: TextInputAction.next,
```

3. Im Passwort-Feld unter `obscureText: _hidePassword,` ergänzen:

```dart
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _login(),
```

**Prüfen:**
- Ins E-Mail-Feld klicken und Enter drücken: Der Cursor springt ins Passwortfeld.
- Enter im Passwortfeld: Der Rahmen öffnet sich.

- [ ] erledigt · Commit: `L9: Tastatur und Autofill`

### L10: Tests für den Login

**Ziel:** Automatische Tests stellen sicher, dass „Anmelden“ den Rahmen öffnet und das Auge das Passwort ein- und ausblendet.

1. Datei `test/login_test.dart` anlegen:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:opengrid/main.dart';

void main() {
  // Im Test keine Schriften aus dem Internet laden
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('Anmelden öffnet den App-Rahmen', (tester) async {
    tester.view.physicalSize = const Size(1200, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const OpenGridApp());
    expect(find.text('Melde dich mit deinem OpenGrid-Konto an'), findsOneWidget);

    await tester.tap(find.widgetWithText(FilledButton, 'Anmelden'));
    await tester.pump(); // Seitenwechsel starten
    await tester.pump(const Duration(seconds: 1)); // Übergang abwarten
    expect(find.text('Start'), findsOneWidget);
    expect(find.text('Melde dich mit deinem OpenGrid-Konto an'), findsNothing);
  });

  testWidgets('Auge blendet das Passwort ein und aus', (tester) async {
    await tester.pumpWidget(const OpenGridApp());
    TextField password() => tester.widget<TextField>(find.widgetWithText(TextField, 'Passwort'));

    expect(password().obscureText, isTrue);
    await tester.tap(find.byTooltip('Passwort anzeigen'));
    await tester.pump();
    expect(password().obscureText, isFalse);
  });
}
```

   Nicht `pumpAndSettle()` verwenden. Der Live-Punkt im Rahmen pulsiert endlos, deshalb würde der Test nie „zur Ruhe kommen“ und abbrechen.

2. `flutter test` ausführen.

**Prüfen:** `flutter test` meldet `All tests passed!` mit 4 Tests: 2 vom Rahmen und 2 vom Login.
Die Meldung `unhandled element <filter/>` ist harmlos (Schatten im Logo).

- [ ] erledigt · Commit: `L10: Tests für den Login`

### L11: Login aufteilen: Layout und Passwortfeld

**Ziel:** Kartenrahmen und Passwortfeld mit Auge braucht auch die Registrieren-Seite. Darum kommen beide
in eigene Dateien. Der Login sieht danach genauso aus wie vorher.

1. Datei `lib/auth_layout.dart` anlegen (das ist das bisherige `build` aus `login_page.dart`):

```dart
// Gemeinsamer Rahmen für Login und Registrieren.
// Breit (≥ 600 px): Karte, höchstens 400 px breit, mittig.
// Schmal: ohne Kartenrahmen, Inhalt direkt auf dem Screen.
import 'package:flutter/material.dart';

import 'theme.dart';

class AuthLayout extends StatelessWidget {
  const AuthLayout({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (constraints.maxWidth < OgSize.loginCardBreakpoint) {
            return SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: OgSpace.s5, vertical: OgSpace.s6),
                child: child,
              ),
            );
          }

          return Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: OgSpace.s4, vertical: OgSpace.s6),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: OgSize.loginMaxWidth),
                child: Container(
                  padding: const EdgeInsets.fromLTRB(OgSpace.s6, OgSpace.s7, OgSpace.s6, OgSpace.s6),
                  decoration: BoxDecoration(
                    color: OgColors.surface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: child,
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}
```

2. Datei `lib/password_field.dart` anlegen:

```dart
// Passwortfeld mit Auge zum Ein- und Ausblenden (Login und Registrieren).
import 'package:flutter/material.dart';

class PasswordField extends StatefulWidget {
  const PasswordField({super.key, this.controller, this.autofillHints, this.textInputAction, this.onSubmitted});

  final TextEditingController? controller;
  final Iterable<String>? autofillHints;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  State<PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<PasswordField> {
  bool _hide = true;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: _hide,
      autofillHints: widget.autofillHints,
      textInputAction: widget.textInputAction,
      onSubmitted: widget.onSubmitted,
      decoration: InputDecoration(
        labelText: 'Passwort',
        suffixIcon: IconButton(
          tooltip: _hide ? 'Passwort anzeigen' : 'Passwort verbergen',
          icon: Icon(_hide ? Icons.visibility_outlined : Icons.visibility_off_outlined),
          onPressed: () => setState(() => _hide = !_hide),
        ),
      ),
    );
  }
}
```

3. In `lib/login_page.dart` alles **vom Dateianfang bis direkt vor** der Zeile
   `  Widget _form(BuildContext context) {` ersetzen durch:

```dart
// Login – E-Mail + Passwort, ohne OAuth. Rahmen (Karte/schmal): auth_layout.dart
import 'package:flutter/material.dart';

import 'auth_layout.dart';
import 'logo_full.dart';
import 'password_field.dart';
import 'shell.dart';
import 'theme.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  /// Mockup: keine echte Prüfung, "Anmelden" öffnet den App-Rahmen.
  void _login() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute<void>(builder: (_) => const AppShell()),
    );
  }

  @override
  Widget build(BuildContext context) {
    // AutofillGroup: Browser/Passwort-Manager können E-Mail + Passwort ausfüllen
    return AuthLayout(child: AutofillGroup(child: _form(context)));
  }

```

   Weg sind dabei `_hidePassword` (steckt jetzt im `PasswordField`) und der Layout-Code (steckt in `AuthLayout`).

4. In `_form` das komplette Passwort-Feld, also den Block ab `        TextField(` mit `obscureText: _hidePassword,`
   bis zu seinem schließenden `        ),`, ersetzen durch:

```dart
        PasswordField(
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _login(),
        ),
```

**Prüfen:** Der Login sieht aus wie vorher, auch schmal unter 600 px, und das Auge funktioniert.
`flutter test` ist grün.

- [ ] erledigt · Commit: `L11: Layout und Passwortfeld ausgelagert`

### L12: Registrieren-Seite (Oberfläche)

**Ziel:** „Registrieren“ auf dem Login öffnet eine eigene Seite. Sie hat den gleichen Rahmen, die Felder
E-Mail und Passwort und den Button „Konto erstellen“. Unten steht „Schon ein Konto? **Anmelden**“, das
führt zurück zum Login. Leere Felder zeigen einen Hinweis. Die echte Anmeldung folgt in `AUFGABEN-Anmeldung.md` (F10).

1. In `lib/theme.dart` in `OgColors` unter `static const live = …;` ergänzen:

```dart
  static const error = Color(0xFFFFB4AB); // Fehlermeldungen (hell, gut lesbar auf dunkel)
```

2. Datei `lib/register_page.dart` anlegen:

```dart
// Registrieren – E-Mail + Passwort. Ein Profilbild gibt es noch nicht.
import 'package:flutter/material.dart';

import 'auth_layout.dart';
import 'logo_full.dart';
import 'password_field.dart';
import 'theme.dart';

class RegisterPage extends StatefulWidget {
  const RegisterPage({super.key});

  @override
  State<RegisterPage> createState() => _RegisterPageState();
}

class _RegisterPageState extends State<RegisterPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  /// Eingaben prüfen. An den Server geht es ab F10 (AUFGABEN-Anmeldung.md).
  void _register() {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setState(() => _error = null);
    // F10: an den Server schicken
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return AuthLayout(
      child: AutofillGroup(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const OgLogoFull(),
            const SizedBox(height: OgSpace.s6),
            Semantics(
              header: true,
              child: Text(
                'Registrieren',
                textAlign: TextAlign.center,
                style: text.headlineSmall?.copyWith(color: OgColors.onSurface),
              ),
            ),
            const SizedBox(height: OgSpace.s2),
            Text(
              'Erstelle dein OpenGrid-Konto',
              textAlign: TextAlign.center,
              style: text.bodyMedium?.copyWith(color: OgColors.onSurfaceVariant),
            ),
            const SizedBox(height: OgSpace.s6),
            TextField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(labelText: 'E-Mail'),
            ),
            const SizedBox(height: OgSpace.s4),
            PasswordField(
              controller: _password,
              autofillHints: const [AutofillHints.newPassword], // Passwort-Manager schlägt ein neues vor
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _register(),
            ),
            if (_error != null) ...[
              const SizedBox(height: OgSpace.s3),
              Semantics(
                liveRegion: true, // Screenreader liest die Meldung vor
                child: Text(_error!, style: text.bodyMedium?.copyWith(color: OgColors.error)),
              ),
            ],
            const SizedBox(height: OgSpace.s5),
            FilledButton(onPressed: _register, child: const Text('Konto erstellen')),
            const SizedBox(height: OgSpace.s6),
            Wrap(
              alignment: WrapAlignment.center,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text('Schon ein Konto?', style: text.bodyMedium?.copyWith(color: OgColors.onSurfaceVariant)),
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: TextButton.styleFrom(
                    foregroundColor: OgColors.accentText,
                    padding: const EdgeInsets.symmetric(horizontal: OgSpace.s2),
                  ),
                  child: const Text('Anmelden'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
```

3. In `lib/login_page.dart` unter `import 'password_field.dart';` ergänzen:

```dart
import 'register_page.dart';
```

4. Im Button **„Registrieren“** (nicht bei „Passwort vergessen?“) die Zeile
   `              onPressed: () {}, // Screen folgt später` ersetzen durch:

```dart
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const RegisterPage()),
              ),
```

**Prüfen:**
- Klick auf „Registrieren“ öffnet die neue Seite, „Anmelden“ unten führt zurück.
- „Konto erstellen“ mit leeren Feldern zeigt „Bitte E-Mail und Passwort eingeben.“
- `flutter test` ist grün.

- [ ] erledigt · Commit: `L12: Registrieren-Seite (Oberfläche)`
