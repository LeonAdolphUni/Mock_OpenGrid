# Aufgaben: Anmeldung (Funktion)

Ziel: Man meldet sich **wirklich** an. Dazu gehören:
- Registrieren und Login beim Server
- Access Token (kurzlebig, z. B. 15 min) und Refresh Token
- Refresh Token im sicheren Speicher
- Erneuern im Hintergrund, damit immer ein gültiger Access Token da ist
- Abmelden

Zeiten und Server-Adresse stehen nicht im Code. Wie die Fenster aussehen, steht in **`AUFGABEN-Login.md`**.

Diese Aufgaben stecken nicht im Prototyp, weil sie einen Server brauchen. Der Code ist trotzdem Schritt für
Schritt durchgespielt, mit einem nachgebauten Server in den Tests.

**Voraussetzung**
- F1–F7 (Logik ohne Oberfläche) brauchen nur den Rahmen aus `AUFGABEN.md`. Sie können also **parallel** zum Design laufen.
- Ab F8 muss `AUFGABEN-Login.md` bis **L12** fertig sein.

**Spielregeln**
- Jede Aufgabe = **ein Commit**, Message beginnt mit der ID, z. B. `F5: AuthService …`.
- Vor dem Commit: `flutter analyze` meldet „No issues found!“, und `flutter test` ist grün.
- Ab F8 startet die App nur noch mit Konfiguration:
  `flutter run -d chrome --dart-define-from-file=config/dev.json` (oder in VS Code mit F5, siehe F1).
- Branch-Vorschlag: `feature/auth`, von `dev` abzweigen. Vor F8 den fertigen Login-Branch hereinholen:
  entweder `git merge dev`, wenn `feature/login` schon in `dev` gemergt ist, sonst `git merge feature/login`.

---

## Übersicht

| ✓ | ID | Aufgabe | Dateien | braucht vorher | Wer |
|---|---|---|---|---|---|
| ☐ | F1 | Pakete und Konfiguration (nichts fest im Code) | `pubspec.yaml`, `config/dev.json`, `lib/config.dart`, `.vscode/launch.json` | – | Mario |
| ☐ | F2 | Token-Paar aus der Server-Antwort | `lib/auth/token_pair.dart` | F1 | Mario |
| ☐ | F3 | Sicherer Speicher für den Refresh Token | `lib/auth/token_storage.dart` | F1 | Mario |
| ☐ | F4 | Verbindung zum Server | `lib/auth/auth_api.dart` | F2 | Mario |
| ☐ | F5 | AuthService: Login, Registrieren, Abmelden, Refresh | `lib/auth/auth_service.dart` | F3, F4 | Mario |
| ☐ | F6 | App-Start und Erneuern im Hintergrund | `lib/auth/auth_service.dart` | F5 | Mario |
| ☐ | F7 | Tests für die Token-Logik | `test/fake_server.dart`, `test/auth_service_test.dart` | F6 | Mario |
| ☐ | F8 | App-Start: Login oder Rahmen | `lib/auth/auth_scope.dart`, `lib/auth_gate.dart`, `lib/main.dart`, `test/test_app.dart`, `test/login_test.dart` | F7, L12 | Leon |
| ☐ | F9 | Login echt beim Server | `lib/login_page.dart`, `lib/auth_layout.dart` | F8 | Leon |
| ☐ | F10 | Registrieren echt beim Server | `lib/register_page.dart` | F9 | Leon |
| ☐ | F11 | Abmelden im Profil | `lib/pages/profile_page.dart` | F8 | Leon |
| ☐ | F12 | Tests für Login, Registrieren, Abmelden | `test/login_test.dart`, `test/register_test.dart` | F10, F11 | Leon |

**Aufteilung**

| | Aufgaben | Inhalt |
|---|---|---|
| **Mario** | F1 → … → F7 | Logik: Pakete, Konfiguration, Tokens, sicherer Speicher, Server, Erneuern im Hintergrund, Tests |
| **Leon** | F8 → … → F12 | Anbinden: App-Start, Login und Registrieren echt, Abmelden, Tests |

- Mario fängt nach L5 (Design) direkt mit F1 an. F1–F7 ändern keine Datei aus dem Design.
- **Übergabe:** Für F8 braucht Leon Marios fertigen Stand **F7** und sein eigenes **L12**.
- Insgesamt hat jeder 12 Aufgaben: Mario L1–L5 und F1–F7, Leon L6–L12 und F8–F12.

---

## So funktioniert die Anmeldung

```text
 App                                          Server
  │  POST /auth/login  (E-Mail, Passwort)        │
  │ ───────────────────────────────────────────▶ │
  │ ◀──────── Access Token + Refresh Token ───── │  Access Token gilt z. B. 15 min
  │                                              │  (die Laufzeit schickt der Server mit)
  │  Refresh Token → sicherer Speicher           │
  │  Access Token  → nur im Arbeitsspeicher      │
  │                                              │
  │  … kurz vor Ablauf …                         │
  │  POST /auth/refresh  (Refresh Token)         │
  │ ───────────────────────────────────────────▶ │  Steht der Token in der Datenbank
  │ ◀──────── neues Paar ─────────────────────── │  und gilt er noch? Dann neues Paar,
  │           oder 401 → abmelden, Login         │  der alte Refresh Token ist danach ungültig.
```

Damit **immer** ein gültiger Access Token da ist, gibt es drei Sicherungen:

1. **Timer:** Kurz vor Ablauf holt die App von selbst ein neues Paar.
2. **Vor jeder Anfrage:** `validAccessToken()` prüft und erneuert, falls nötig.
3. **Zurück in der App:** Im Hintergrund laufen Timer auf dem Handy nicht zuverlässig. Darum wird
   beim Zurückkehren nachgeprüft.

Wichtig: Es läuft immer nur **eine** Erneuerung gleichzeitig. Würden zwei Anfragen denselben Refresh
Token schicken, wäre er nach der ersten ungültig, und die zweite würde den Nutzer abmelden.

Beim App-Start: Liegt ein Refresh Token im Speicher, holt die App damit ein neues Paar und geht
direkt in den Rahmen. Lehnt der Server ab, kommt der Login.

## Nichts fest im Code

| Wert | Woher er kommt |
|---|---|
| Laufzeit des Access Tokens (z. B. 15 min) | vom Server, bei jedem Login/Refresh (`expiresIn`, sonst `exp` im Token) |
| Wie lange vor Ablauf erneuert wird | `REFRESH_MARGIN_SECONDS` in `config/dev.json` |
| Adresse des Servers | `API_BASE_URL` in `config/dev.json` |

Für andere Umgebungen später einfach weitere Dateien anlegen, z. B. `config/prod.json`.

## Absprache mit dem Backend (vor F4 klären!)

Der Code geht von dieser Schnittstelle aus. Weicht das Backend ab, werden **nur**
`lib/auth/auth_api.dart` und der Test-Server `test/fake_server.dart` angepasst.

| Aufruf | Anfrage (JSON) | Antwort |
|---|---|---|
| `POST /auth/register` | `{"email", "password", "profilePicture": ""}` | `2xx` ok · `409` E-Mail schon vergeben · `400` Eingabe ungültig |
| `POST /auth/login` | `{"email", "password"}` | `200` + Token-Paar · `401` E-Mail/Passwort falsch |
| `POST /auth/refresh` | `{"refreshToken"}` | `200` + **neues** Token-Paar · `401`/`403` Token unbekannt oder abgelaufen |
| `POST /auth/logout` | `{"refreshToken"}` | `2xx`, der Server löscht den Refresh Token aus der Datenbank |

Token-Paar: `{"accessToken": "…", "refreshToken": "…", "expiresIn": 900}`. Dabei ist `expiresIn` die
Laufzeit in Sekunden. Fehlt `expiresIn`, liest die App den Ablauf aus `exp` im Access Token (JWT).

Fürs Backend:
- Refresh Tokens in der Datenbank speichern. Beim Refresh prüfen, ob der Token da ist und noch gilt.
- Beim Refresh den alten Refresh Token löschen und ein neues Paar ausgeben.
- Beim Logout den Refresh Token löschen.
- Für Chrome muss der Server CORS für die Adresse von `flutter run -d chrome` erlauben.

---

## Mario

### F1: Pakete und Konfiguration (nichts fest im Code)

**Ziel:** Die Pakete für Server-Anfragen und den sicheren Speicher sind installiert. Server-Adresse und
Erneuerungs-Zeitpunkt kommen aus einer Konfigurationsdatei statt aus dem Code.

1. Pakete installieren:

```text
flutter pub add http flutter_secure_storage dev:fake_async
```

   - `http`: Anfragen an den Server
   - `flutter_secure_storage`: sicherer Speicher für den Refresh Token
   - `fake_async` (nur für Tests): spult in Tests die Zeit vor, damit man nicht 15 min warten muss

2. Datei `config/dev.json` anlegen (Adresse an euren Server anpassen):

```json
{
  "API_BASE_URL": "http://localhost:8080",
  "REFRESH_MARGIN_SECONDS": 60
}
```

3. Datei `lib/config.dart` anlegen:

```dart
// App-Konfiguration: kommt beim Start von außen, nichts davon steht fest im Code.
// Start: flutter run --dart-define-from-file=config/dev.json
abstract final class AppConfig {
  /// Adresse des Servers, z. B. http://localhost:8080
  static const apiBaseUrl = String.fromEnvironment('API_BASE_URL');

  /// So viele Sekunden vor Ablauf wird der Access Token erneuert.
  /// Wie lange er gilt (z. B. 15 min), sagt der Server bei jedem Login/Refresh.
  static const refreshMarginSeconds = int.fromEnvironment('REFRESH_MARGIN_SECONDS');

  /// Bricht den Start mit klarer Meldung ab, wenn die Konfiguration fehlt.
  static void check() {
    if (apiBaseUrl.isEmpty || refreshMarginSeconds <= 0) {
      throw StateError('Konfiguration fehlt. Starten mit: flutter run --dart-define-from-file=config/dev.json');
    }
  }
}
```

4. Damit F5 in VS Code die Konfiguration mitgibt, die Datei `.vscode/launch.json` anlegen.
   Gibt es sie schon, nur die Zeile `"args"` in die vorhandene Konfiguration übernehmen.

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "OpenGrid (dev)",
      "request": "launch",
      "type": "dart",
      "args": ["--dart-define-from-file=config/dev.json"]
    }
  ]
}
```

**Prüfen:** `flutter analyze` meldet keine Fehler, und `flutter test` ist grün. Die App läuft noch wie vorher,
denn die Konfiguration wird erst ab F8 benutzt.

- [ ] erledigt · Commit: `F1: Pakete und Konfiguration`

### F2: Token-Paar aus der Server-Antwort

**Ziel:** Aus der JSON-Antwort des Servers wird ein `TokenPair` mit Access Token, Refresh Token und Ablaufzeit.
Die Laufzeit kommt immer vom Server.

1. Datei `lib/auth/token_pair.dart` anlegen:

```dart
// Antwort des Servers bei Login und Refresh: zwei Tokens + Ablaufzeit.
import 'dart:convert';

class TokenPair {
  const TokenPair({required this.accessToken, required this.refreshToken, required this.expiresAt});

  /// Kurzlebig, geht bei jeder Anfrage an den Server mit
  final String accessToken;

  /// Langlebig, nur zum Holen neuer Tokens – wird sicher gespeichert
  final String refreshToken;

  /// Ab hier ist der Access Token ungültig
  final DateTime expiresAt;

  /// [now] = Zeitpunkt der Antwort. Die Laufzeit kommt vom Server: aus `expiresIn`
  /// (Sekunden) oder, falls er das nicht schickt, aus `exp` im Access Token (JWT).
  factory TokenPair.fromJson(Map<String, dynamic> json, DateTime now) {
    final accessToken = json['accessToken'] as String;
    final expiresIn = json['expiresIn'] as int?;
    return TokenPair(
      accessToken: accessToken,
      refreshToken: json['refreshToken'] as String,
      expiresAt: expiresIn != null ? now.add(Duration(seconds: expiresIn)) : _jwtExpiry(accessToken),
    );
  }

  /// Ein JWT besteht aus drei Teilen "kopf.inhalt.signatur", `exp` steht im Inhalt.
  static DateTime _jwtExpiry(String jwt) {
    final payload = utf8.decode(base64Url.decode(base64Url.normalize(jwt.split('.')[1])));
    final exp = (jsonDecode(payload) as Map<String, dynamic>)['exp'] as int; // Sekunden seit 1970
    return DateTime.fromMillisecondsSinceEpoch(exp * 1000);
  }
}
```

**Prüfen:** `flutter analyze` meldet keine Fehler.

- [ ] erledigt · Commit: `F2: Token-Paar aus der Server-Antwort`

### F3: Sicherer Speicher für den Refresh Token

**Ziel:** Der Refresh Token wird verschlüsselt gespeichert und übersteht so einen App-Neustart.
Für Tests gibt es eine Variante, die nur im Arbeitsspeicher arbeitet.

1. Datei `lib/auth/token_storage.dart` anlegen:

```dart
// Sicherer Speicher für den Refresh Token (verschlüsselter Speicher des
// Betriebssystems, z. B. Keychain auf iOS, Keystore auf Android).
// Der Access Token wird nie gespeichert, er bleibt nur im Arbeitsspeicher.
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract interface class TokenStorage {
  Future<String?> readRefreshToken();
  Future<void> writeRefreshToken(String token);
  Future<void> deleteRefreshToken();
}

class SecureTokenStorage implements TokenStorage {
  static const _key = 'refresh_token';
  final _storage = const FlutterSecureStorage();

  @override
  Future<String?> readRefreshToken() => _storage.read(key: _key);

  @override
  Future<void> writeRefreshToken(String token) => _storage.write(key: _key, value: token);

  @override
  Future<void> deleteRefreshToken() => _storage.delete(key: _key);
}

/// Für Tests: hält den Token nur im Arbeitsspeicher.
class MemoryTokenStorage implements TokenStorage {
  String? token;

  @override
  Future<String?> readRefreshToken() async => token;

  @override
  Future<void> writeRefreshToken(String token) async => this.token = token;

  @override
  Future<void> deleteRefreshToken() async => token = null;
}
```

   > Im Browser (Chrome) legt `flutter_secure_storage` den Token verschlüsselt im `localStorage` ab.
   > Das ist weniger sicher als auf dem Handy, reicht aber für die Entwicklung.

**Prüfen:** `flutter analyze` meldet keine Fehler.

- [ ] erledigt · Commit: `F3: Sicherer Speicher für den Refresh Token`

### F4: Verbindung zum Server

**Ziel:** Eine Klasse `AuthApi` übernimmt die vier Aufrufe Registrieren, Login, Refresh und Abmelden.
Fehler kommen als `AuthException` zurück, mit einem Text für die Oberfläche.
Vorher die Tabelle „Absprache mit dem Backend“ mit dem Backend abgleichen.

1. Datei `lib/auth/auth_api.dart` anlegen:

```dart
// Verbindung zum Server: Login, Registrieren, Refresh, Abmelden.
// Pfade, Feldnamen und Statuscodes stehen nur hier. Ändert das Backend etwas,
// wird nur diese Datei angepasst.
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'token_pair.dart';

/// Was schiefgehen kann – mit dem Text für die Oberfläche
enum AuthError {
  invalidCredentials('E-Mail oder Passwort ist falsch.'),
  emailTaken('Für diese E-Mail gibt es schon ein Konto.'),
  invalidInput('Bitte E-Mail und Passwort prüfen.'),
  sessionExpired('Sitzung abgelaufen. Bitte neu anmelden.'),
  network('Server nicht erreichbar. Bitte Verbindung prüfen.'),
  server('Unerwarteter Fehler. Bitte später erneut versuchen.');

  const AuthError(this.message);
  final String message;
}

class AuthException implements Exception {
  const AuthException(this.error);
  final AuthError error;

  @override
  String toString() => 'AuthException(${error.name})';
}

class AuthApi {
  /// [baseUrl] z. B. `http://localhost:8080` (mit oder ohne `/` am Ende).
  /// [client] und [now] nur für Tests austauschen.
  AuthApi({required String baseUrl, http.Client? client, DateTime Function()? now})
      : _baseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl,
        _client = client ?? http.Client(),
        _now = now ?? DateTime.now;

  final String _baseUrl;
  final http.Client _client;
  final DateTime Function() _now;

  Future<TokenPair> login(String email, String password) async {
    final res = await _post('/auth/login', {'email': email, 'password': password});
    if (res.statusCode == 401) throw const AuthException(AuthError.invalidCredentials);
    return _tokens(res);
  }

  /// Ein Profilbild gibt es noch nicht, darum erstmal ein leerer String.
  Future<void> register(String email, String password) async {
    final res = await _post('/auth/register', {'email': email, 'password': password, 'profilePicture': ''});
    if (res.statusCode == 409) throw const AuthException(AuthError.emailTaken);
    if (res.statusCode == 400) throw const AuthException(AuthError.invalidInput);
    _expectOk(res);
  }

  /// Der Server prüft, ob der Refresh Token in der Datenbank steht und noch gilt.
  /// Antwort: ein neues Paar. Der alte Refresh Token ist danach ungültig.
  Future<TokenPair> refresh(String refreshToken) async {
    final res = await _post('/auth/refresh', {'refreshToken': refreshToken});
    if (res.statusCode == 401 || res.statusCode == 403) throw const AuthException(AuthError.sessionExpired);
    return _tokens(res);
  }

  /// Der Server löscht den Refresh Token aus der Datenbank.
  Future<void> logout(String refreshToken) async {
    _expectOk(await _post('/auth/logout', {'refreshToken': refreshToken}));
  }

  Future<http.Response> _post(String path, Map<String, String> body) async {
    try {
      return await _client.post(
        Uri.parse('$_baseUrl$path'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
    } on http.ClientException {
      throw const AuthException(AuthError.network); // kein Netz, Server aus, falsche Adresse
    }
  }

  void _expectOk(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) throw const AuthException(AuthError.server);
  }

  TokenPair _tokens(http.Response res) {
    _expectOk(res);
    try {
      return TokenPair.fromJson(jsonDecode(res.body) as Map<String, dynamic>, _now());
    } catch (_) {
      throw const AuthException(AuthError.server); // Antwort hat nicht das erwartete Format
    }
  }
}
```

   Beim Registrieren wird `profilePicture` vorerst als leerer String geschickt.

**Prüfen:** `flutter analyze` meldet keine Fehler.

- [ ] erledigt · Commit: `F4: Verbindung zum Server`

### F5: AuthService: Login, Registrieren, Abmelden, Refresh

**Ziel:** `AuthService` hält die Anmeldung. Er meldet an, registriert, meldet ab und liefert mit
`validAccessToken()` einen gültigen Access Token. Ist der Token zu alt, holt er vorher ein neues Paar.
Den Timer und den App-Start ergänzt F6.

1. Datei `lib/auth/auth_service.dart` anlegen:

```dart
// Hält die Anmeldung: Login, Registrieren, Abmelden – und im Hintergrund
// immer einen gültigen Access Token.
//
//   Login/Registrieren  → Server schickt Access Token + Refresh Token
//   Refresh Token       → sicherer Speicher (überlebt einen App-Neustart)
//   kurz vor Ablauf     → mit dem Refresh Token ein neues Paar holen
//   Server lehnt ab     → abmelden, zurück zum Login
import 'package:flutter/foundation.dart';

import 'auth_api.dart';
import 'token_pair.dart';
import 'token_storage.dart';

enum AuthStatus {
  unknown, // App startet, gespeicherte Sitzung wird geprüft
  signedOut,
  signedIn,
}

class AuthService extends ChangeNotifier {
  /// [_refreshMargin]: so lange vor Ablauf wird erneuert (aus der Konfiguration).
  /// [now] nur für Tests austauschen.
  AuthService(this._api, this._storage, this._refreshMargin, {DateTime Function()? now}) : _now = now ?? DateTime.now;

  final AuthApi _api;
  final TokenStorage _storage;
  final Duration _refreshMargin;
  final DateTime Function() _now;

  AuthStatus _status = AuthStatus.unknown;
  AuthStatus get status => _status;

  String? _accessToken;
  String? _refreshToken;
  DateTime? _expiresAt;
  Future<void>? _running; // gerade laufende Erneuerung

  Future<void> login(String email, String password) async {
    await _save(await _api.login(email, password));
    _setStatus(AuthStatus.signedIn);
  }

  /// Konto anlegen und direkt anmelden
  Future<void> register(String email, String password) async {
    await _api.register(email, password);
    await login(email, password);
  }

  /// Lokal abmelden und den Server bitten, den Refresh Token zu löschen.
  Future<void> logout() async {
    final token = _refreshToken;
    await _clear();
    if (token != null) _api.logout(token).ignore(); // Fehler egal, lokal ist schon abgemeldet
  }

  /// Für jede Anfrage an den Server: liefert einen gültigen Access Token
  /// und erneuert ihn vorher, falls er bald abläuft.
  Future<String> validAccessToken() async {
    if (_isDue) await refresh();
    return _accessToken!;
  }

  /// Neues Paar holen. Rufen mehrere Stellen gleichzeitig auf, geht trotzdem nur
  /// eine Anfrage raus – der alte Refresh Token gilt nach der ersten nicht mehr.
  Future<void> refresh() => _running ??= _refresh().whenComplete(() => _running = null);

  bool get _isDue => _expiresAt == null || !_now().isBefore(_expiresAt!.subtract(_refreshMargin));

  Future<void> _refresh() async {
    final token = _refreshToken;
    if (token == null) throw const AuthException(AuthError.sessionExpired);
    try {
      await _save(await _api.refresh(token));
    } on AuthException catch (e) {
      if (e.error == AuthError.sessionExpired) await _clear(); // Server kennt den Token nicht (mehr)
      rethrow;
    }
  }

  // F6: App-Start und Erneuern im Hintergrund

  // --- Hilfsfunktionen ---

  Future<void> _save(TokenPair tokens) async {
    _accessToken = tokens.accessToken;
    _refreshToken = tokens.refreshToken;
    _expiresAt = tokens.expiresAt;
    await _storage.writeRefreshToken(tokens.refreshToken);
  }

  Future<void> _clear() async {
    _accessToken = null;
    _refreshToken = null;
    _expiresAt = null;
    await _storage.deleteRefreshToken();
    _setStatus(AuthStatus.signedOut);
  }

  void _setStatus(AuthStatus status) {
    if (_status == status) return;
    _status = status;
    notifyListeners();
  }
}
```

   `ChangeNotifier`: Ändert sich `status`, baut die Oberfläche neu. Das nutzt Leon ab F8.

**Prüfen:** `flutter analyze` meldet keine Fehler.

- [ ] erledigt · Commit: `F5: AuthService mit Login, Registrieren, Abmelden, Refresh`

### F6: App-Start und Erneuern im Hintergrund

**Ziel:**
- Beim App-Start prüft `init()`, ob noch eine Sitzung gespeichert ist.
- Ein Timer erneuert den Access Token kurz vor Ablauf.
- `refreshIfDue()` prüft nach, wenn die App wieder in den Vordergrund kommt.

1. In `lib/auth/auth_service.dart` ganz oben, über `import 'package:flutter/foundation.dart';`, einfügen:

```dart
import 'dart:async';

```

2. Unter `  Future<void>? _running; // gerade laufende Erneuerung` einfügen:

```dart
  Timer? _timer; // erneuert kurz vor Ablauf
```

3. Die Zeile `  // F6: App-Start und Erneuern im Hintergrund` ersetzen durch:

```dart
  // --- App-Start und Erneuern im Hintergrund ---

  /// Beim App-Start: Gibt es noch eine Sitzung vom letzten Mal?
  Future<void> init() async {
    _refreshToken = await _storage.readRefreshToken();
    if (_refreshToken == null) {
      _setStatus(AuthStatus.signedOut);
      return;
    }
    try {
      await refresh();
    } on AuthException catch (e) {
      if (e.error == AuthError.sessionExpired) return; // refresh() hat schon abgemeldet
      // Server nicht erreichbar: Sitzung behalten, nächster Versuch bei der nächsten Anfrage
    }
    _setStatus(AuthStatus.signedIn);
  }

  /// Wenn die App wieder in den Vordergrund kommt: Timer laufen im Hintergrund
  /// nicht zuverlässig, darum hier nachprüfen.
  Future<void> refreshIfDue() async {
    if (_status == AuthStatus.signedIn && _isDue) await refresh();
  }

  /// Timer stellen: kurz vor Ablauf von selbst erneuern
  void _schedule() {
    _timer?.cancel();
    final wait = _expiresAt!.subtract(_refreshMargin).difference(_now());
    if (wait > Duration.zero) _timer = Timer(wait, () => refresh().ignore());
  }
```

4. In `_save` unter `    await _storage.writeRefreshToken(tokens.refreshToken);` einfügen:

```dart
    _schedule();
```

5. In `_clear` direkt unter `  Future<void> _clear() async {` einfügen:

```dart
    _timer?.cancel();
```

6. Ganz unten in der Klasse, unter der Methode `_setStatus`, einfügen:

```dart

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }
```

**Prüfen:** `flutter analyze` meldet keine Fehler. Ob der Timer wirklich auslöst, prüft F7.

- [ ] erledigt · Commit: `F6: App-Start und Erneuern im Hintergrund`

### F7: Tests für die Token-Logik

**Ziel:** Tests mit einem nachgebauten Server zeigen, dass die Token-Logik stimmt:
- Login speichert den Refresh Token.
- Der Timer erneuert nach 14 min (15 min Laufzeit minus 60 s).
- Gleichzeitige Anfragen erneuern nur einmal.
- Beim App-Start meldet eine gespeicherte Sitzung an.
- Lehnt der Server ab, wird abgemeldet.

1. Datei `test/fake_server.dart` anlegen. Leon braucht sie ab F8 für seine Tests.

```dart
// Nachgebauter Server für Tests. Antwortet so, wie wir es mit dem Backend
// abgesprochen haben (siehe AUFGABEN-Anmeldung.md, "Absprache mit dem Backend").
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:opengrid/auth/auth_api.dart';
import 'package:opengrid/auth/auth_service.dart';
import 'package:opengrid/auth/token_storage.dart';

class FakeServer {
  /// Aufgerufene Pfade der Reihe nach, z. B. ['/auth/login', '/auth/refresh']
  final calls = <String>[];

  /// Zuletzt geschickter Inhalt je Pfad
  final bodies = <String, Map<String, dynamic>>{};

  /// true: Der Server kennt den Refresh Token nicht (mehr)
  bool rejectRefresh = false;

  int _issued = 0;

  late final http.Client client = MockClient((request) async {
    final path = request.url.path;
    calls.add(path);
    bodies[path] = jsonDecode(request.body) as Map<String, dynamic>;
    return switch (path) {
      '/auth/login' => bodies[path]!['password'] == 'richtig' ? _tokens() : http.Response('', 401),
      '/auth/refresh' => rejectRefresh ? http.Response('', 401) : _tokens(),
      _ => http.Response('', 200),
    };
  });

  /// Wie oft [path] aufgerufen wurde
  int count(String path) => calls.where((p) => p == path).length;

  /// Neues Paar, 15 min gültig – die Laufzeit legt hier der "Server" fest
  http.Response _tokens() {
    _issued++;
    return http.Response(
      jsonEncode({'accessToken': 'access$_issued', 'refreshToken': 'refresh$_issued', 'expiresIn': 900}),
      200,
    );
  }
}

/// AuthService wie in der App, aber mit [FakeServer]. Erneuert 60 s vor Ablauf.
AuthService testAuth(FakeServer server, TokenStorage storage, {DateTime Function()? now}) => AuthService(
      AuthApi(baseUrl: 'http://server.test', client: server.client, now: now),
      storage,
      const Duration(seconds: 60),
      now: now,
    );
```

2. Datei `test/auth_service_test.dart` anlegen:

```dart
import 'package:fake_async/fake_async.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:opengrid/auth/auth_api.dart';
import 'package:opengrid/auth/auth_service.dart';
import 'package:opengrid/auth/token_storage.dart';

import 'fake_server.dart';

void main() {
  late FakeServer server;
  late MemoryTokenStorage storage;

  setUp(() {
    server = FakeServer();
    storage = MemoryTokenStorage();
  });

  test('Login speichert den Refresh Token sicher', () async {
    final auth = testAuth(server, storage);
    addTearDown(auth.dispose);

    await auth.login('a@b.de', 'richtig');
    expect(auth.status, AuthStatus.signedIn);
    expect(storage.token, 'refresh1');
    expect(await auth.validAccessToken(), 'access1');
  });

  test('Falsches Passwort: Fehler, nichts gespeichert', () async {
    final auth = testAuth(server, storage);
    addTearDown(auth.dispose);

    await expectLater(
      auth.login('a@b.de', 'falsch'),
      throwsA(isA<AuthException>().having((e) => e.error, 'error', AuthError.invalidCredentials)),
    );
    expect(storage.token, isNull);
  });

  test('Registrieren schickt ein leeres Profilbild und meldet an', () async {
    final auth = testAuth(server, storage);
    addTearDown(auth.dispose);

    await auth.register('a@b.de', 'richtig');
    expect(server.bodies['/auth/register'], {'email': 'a@b.de', 'password': 'richtig', 'profilePicture': ''});
    expect(auth.status, AuthStatus.signedIn);
  });

  test('Kurz vor Ablauf wird im Hintergrund erneuert', () {
    fakeAsync((time) {
      final start = DateTime(2026);
      final auth = testAuth(server, storage, now: () => start.add(time.elapsed));

      auth.login('a@b.de', 'richtig');
      time.flushMicrotasks();

      // 900 s gültig, 60 s vorher erneuern → nach 840 s
      time.elapse(const Duration(seconds: 839));
      expect(server.count('/auth/refresh'), 0);
      time.elapse(const Duration(seconds: 1));
      expect(server.count('/auth/refresh'), 1);
      expect(storage.token, 'refresh2'); // neuer Refresh Token gespeichert

      // und danach immer wieder
      time.elapse(const Duration(seconds: 840));
      expect(server.count('/auth/refresh'), 2);
      auth.dispose();
    });
  });

  test('Gleichzeitige Anfragen erneuern nur einmal', () async {
    var now = DateTime(2026);
    final auth = testAuth(server, storage, now: () => now);
    addTearDown(auth.dispose);
    await auth.login('a@b.de', 'richtig');

    now = now.add(const Duration(minutes: 15)); // Access Token abgelaufen
    final tokens = await Future.wait([auth.validAccessToken(), auth.validAccessToken()]);
    expect(tokens, ['access2', 'access2']);
    expect(server.count('/auth/refresh'), 1);
  });

  test('App-Start mit gespeicherter Sitzung: angemeldet', () async {
    storage.token = 'alt';
    final auth = testAuth(server, storage);
    addTearDown(auth.dispose);

    await auth.init();
    expect(auth.status, AuthStatus.signedIn);
    expect(server.bodies['/auth/refresh'], {'refreshToken': 'alt'});
    expect(storage.token, 'refresh1');
  });

  test('Server kennt den Refresh Token nicht: abgemeldet', () async {
    storage.token = 'alt';
    server.rejectRefresh = true;
    final auth = testAuth(server, storage);
    addTearDown(auth.dispose);

    await auth.init();
    expect(auth.status, AuthStatus.signedOut);
    expect(storage.token, isNull);
  });
}
```

**Prüfen:** `flutter test` meldet `All tests passed!` mit 11 Tests (2 Rahmen, 2 Login, 7 Token-Logik).
Der Timer-Test dauert keine 14 Minuten, weil `fakeAsync` die Zeit vorspult.

- [ ] erledigt · Commit: `F7: Tests für die Token-Logik` · danach Leon Bescheid sagen (Übergabe für F8)

---

## Leon

### F8: App-Start: Login oder Rahmen

> Braucht Marios Stand **F7** und das fertige Design bis **L12** (`AUFGABEN-Login.md`): vorher `git pull`.

**Ziel:**
- Beim Start entscheidet `AuthGate`: Ist eine Sitzung gespeichert, geht es direkt in den Rahmen, sonst zum Login.
- Solange das geprüft wird, dreht sich ein Ladekreis.
- `AuthScope` macht den `AuthService` überall erreichbar.
- Kommt die App zurück in den Vordergrund, wird der Token nachgeprüft.

1. Datei `lib/auth/auth_scope.dart` anlegen:

```dart
// Macht den AuthService überall im Widget-Baum erreichbar.
import 'package:flutter/widgets.dart';

import 'auth_service.dart';

class AuthScope extends InheritedNotifier<AuthService> {
  const AuthScope({super.key, required AuthService auth, required super.child}) : super(notifier: auth);

  /// Baut das Widget neu, wenn sich die Anmeldung ändert (z. B. in AuthGate)
  static AuthService watch(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AuthScope>()!.notifier!;

  /// Ohne Neuaufbau, z. B. in einem Button-Klick
  static AuthService read(BuildContext context) => context.getInheritedWidgetOfExactType<AuthScope>()!.notifier!;
}
```

2. Datei `lib/auth_gate.dart` anlegen:

```dart
// Entscheidet beim Start und nach Login/Abmelden: Login oder App-Rahmen.
import 'package:flutter/material.dart';

import 'auth/auth_scope.dart';
import 'auth/auth_service.dart';
import 'login_page.dart';
import 'shell.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    // Zurück in der App: prüfen, ob der Access Token inzwischen abgelaufen ist
    _lifecycle = AppLifecycleListener(onResume: () => AuthScope.read(context).refreshIfDue().ignore());
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return switch (AuthScope.watch(context).status) {
      AuthStatus.unknown => const Scaffold(body: Center(child: CircularProgressIndicator())),
      AuthStatus.signedOut => const LoginPage(),
      AuthStatus.signedIn => const AppShell(),
    };
  }
}
```

3. Den Inhalt von `lib/main.dart` komplett ersetzen durch:

```dart
// OpenGrid – Variante B (Pit Wall)
// Start: flutter run --dart-define-from-file=config/dev.json
import 'package:flutter/material.dart';

import 'auth/auth_api.dart';
import 'auth/auth_scope.dart';
import 'auth/auth_service.dart';
import 'auth/token_storage.dart';
import 'auth_gate.dart';
import 'config.dart';
import 'theme.dart';

void main() {
  AppConfig.check();
  WidgetsFlutterBinding.ensureInitialized(); // der sichere Speicher braucht die Plattform
  final auth = AuthService(
    AuthApi(baseUrl: AppConfig.apiBaseUrl),
    SecureTokenStorage(),
    const Duration(seconds: AppConfig.refreshMarginSeconds),
  )..init();
  runApp(OpenGridApp(auth: auth));
}

class OpenGridApp extends StatelessWidget {
  const OpenGridApp({super.key, required this.auth});

  final AuthService auth;

  @override
  Widget build(BuildContext context) {
    return AuthScope(
      auth: auth,
      child: MaterialApp(
        title: 'OpenGrid',
        debugShowCheckedModeBanner: false,
        theme: buildOgTheme(),
        home: const AuthGate(),
      ),
    );
  }
}
```

4. Datei `test/test_app.dart` anlegen. Sie startet in Tests die ganze App mit Marios Test-Server:

```dart
// Startet die ganze App im Test – mit nachgebautem Server statt echtem Backend.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:opengrid/auth/auth_service.dart';
import 'package:opengrid/auth/token_storage.dart';
import 'package:opengrid/main.dart';

import 'fake_server.dart';

/// [savedRefreshToken]: so tun, als wäre vom letzten Start noch eine Sitzung gespeichert.
Future<FakeServer> pumpApp(WidgetTester tester, {String? savedRefreshToken}) async {
  tester.view.physicalSize = const Size(1200, 900);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final server = FakeServer();
  final auth = testAuth(server, MemoryTokenStorage()..token = savedRefreshToken);
  await auth.init();
  await tester.pumpWidget(_DisposeAuth(auth: auth, child: OpenGridApp(auth: auth)));
  return server;
}

/// Auf eine Antwort vom (Fake-)Server und den Seitenwechsel warten.
/// Nicht pumpAndSettle(): Der Live-Punkt im Rahmen pulsiert endlos.
Future<void> settle(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

/// Stoppt den Erneuerungs-Timer, sobald der Test die App abbaut.
/// (addTearDown wäre zu spät: Flutter prüft offene Timer schon vorher.)
class _DisposeAuth extends StatefulWidget {
  const _DisposeAuth({required this.auth, required this.child});

  final AuthService auth;
  final Widget child;

  @override
  State<_DisposeAuth> createState() => _DisposeAuthState();
}

class _DisposeAuthState extends State<_DisposeAuth> {
  @override
  void dispose() {
    widget.auth.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
```

5. Den Inhalt von `test/login_test.dart` komplett ersetzen durch:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'test_app.dart';

void main() {
  // Im Test keine Schriften aus dem Internet laden
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  final email = find.widgetWithText(TextField, 'E-Mail');
  final password = find.widgetWithText(TextField, 'Passwort');
  final loginButton = find.widgetWithText(FilledButton, 'Anmelden');

  testWidgets('Anmelden öffnet den App-Rahmen', (tester) async {
    await pumpApp(tester);
    expect(find.text('Melde dich mit deinem OpenGrid-Konto an'), findsOneWidget);

    await tester.enterText(email, 'a@b.de');
    await tester.enterText(password, 'richtig');
    await tester.tap(loginButton);
    await settle(tester);
    expect(find.text('Start'), findsOneWidget);
    expect(find.text('Melde dich mit deinem OpenGrid-Konto an'), findsNothing);
  });

  testWidgets('Auge blendet das Passwort ein und aus', (tester) async {
    await pumpApp(tester);
    TextField field() => tester.widget<TextField>(password);

    expect(field().obscureText, isTrue);
    await tester.tap(find.byTooltip('Passwort anzeigen'));
    await tester.pump();
    expect(field().obscureText, isFalse);
  });
}
```

**Prüfen:**
- Start mit `flutter run -d chrome --dart-define-from-file=config/dev.json`: Erst kurz der Ladekreis, dann der Login.
- „Anmelden“ öffnet noch wie bisher ohne Prüfung den Rahmen. Das ändert F9.
- Start **ohne** `--dart-define-from-file`: Die App bricht mit „Konfiguration fehlt …“ ab. Das ist so gewollt.
- `flutter test` ist grün (11 Tests).

- [ ] erledigt · Commit: `F8: App-Start entscheidet zwischen Login und Rahmen`

### F9: Login echt beim Server

**Ziel:**
- „Anmelden“ schickt E-Mail und Passwort an den Server.
- Während der Anfrage zeigt der Button einen Ladekreis und ist gesperrt.
- Fehler erscheinen über dem Button, z. B. „E-Mail oder Passwort ist falsch.“ oder „Server nicht erreichbar.“
- Klappt der Login, wechselt `AuthGate` von selbst zum Rahmen. Das `pushReplacement` fällt weg.

1. In `lib/auth_layout.dart` ganz unten anfügen:

```dart

/// Kleiner Ladekreis im Button, solange der Server antwortet
class ButtonSpinner extends StatelessWidget {
  const ButtonSpinner({super.key});

  @override
  Widget build(BuildContext context) {
    return const SizedBox.square(
      dimension: 20,
      child: CircularProgressIndicator(strokeWidth: 2, color: OgColors.onSurface),
    );
  }
}
```

2. Den Inhalt von `lib/login_page.dart` komplett ersetzen durch:

```dart
// Login – E-Mail + Passwort, ohne OAuth. Rahmen (Karte/schmal): auth_layout.dart
import 'package:flutter/material.dart';

import 'auth/auth_api.dart';
import 'auth/auth_scope.dart';
import 'auth_layout.dart';
import 'logo_full.dart';
import 'password_field.dart';
import 'register_page.dart';
import 'theme.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  /// Beim Server anmelden. Klappt es, wechselt AuthGate von selbst zum App-Rahmen.
  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await AuthScope.read(context).login(_email.text.trim(), _password.text);
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // AutofillGroup: Browser/Passwort-Manager können E-Mail + Passwort ausfüllen
    return AuthLayout(child: AutofillGroup(child: _form(context)));
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
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _login(),
        ),
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
        if (_error != null) ...[
          Semantics(
            liveRegion: true, // Screenreader liest die Meldung vor
            child: Text(_error!, style: text.bodyMedium?.copyWith(color: OgColors.error)),
          ),
        ],
        const SizedBox(height: OgSpace.s4),
        FilledButton(
          onPressed: _busy ? null : _login,
          child: _busy ? const ButtonSpinner() : const Text('Anmelden'),
        ),
        const SizedBox(height: OgSpace.s6),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('Noch kein Konto?', style: text.bodyMedium?.copyWith(color: OgColors.onSurfaceVariant)),
            TextButton(
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(builder: (_) => const RegisterPage()),
              ),
              style: TextButton.styleFrom(
                foregroundColor: OgColors.accentText,
                padding: const EdgeInsets.symmetric(horizontal: OgSpace.s2),
              ),
              child: const Text('Registrieren'),
            ),
          ],
        ),
      ],
    );
  }
}
```

   Neu gegenüber L12:
   - `_email` und `_password` lesen die Felder aus.
   - `_busy` steuert den Ladekreis, `_error` die Meldung.
   - `_login()` ruft den `AuthService` auf.
   - Der Import von `shell.dart` fällt weg.

**Prüfen:**
- Ohne laufenden Server: Anmelden zeigt „Server nicht erreichbar. Bitte Verbindung prüfen.“
- Mit Server und richtigen Daten: Der Rahmen öffnet sich. Nach einem Neustart der App geht es direkt in den Rahmen.
- `flutter test` ist grün.

- [ ] erledigt · Commit: `F9: Login echt beim Server`

### F10: Registrieren echt beim Server

**Ziel:** „Konto erstellen“ legt das Konto beim Server an. Das Profilbild wird vorerst als leerer String
geschickt. Danach meldet die App direkt an und zeigt den Rahmen. Fehler wie „Für diese E-Mail gibt es
schon ein Konto.“ erscheinen über dem Button.

1. In `lib/register_page.dart` unter `import 'package:flutter/material.dart';` (und der Leerzeile) ergänzen:

```dart
import 'auth/auth_api.dart';
import 'auth/auth_scope.dart';
```

2. Unter `  final _password = TextEditingController();` einfügen:

```dart
  bool _busy = false;
```

3. Die komplette Methode `_register` (ab dem Kommentar `  /// Eingaben prüfen …` bis zu ihrer schließenden `  }`)
   ersetzen durch:

```dart
  /// Konto anlegen und direkt anmelden. Danach zurück: AuthGate zeigt dann den App-Rahmen.
  Future<void> _register() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    final navigator = Navigator.of(context);
    try {
      await AuthScope.read(context).register(_email.text.trim(), _password.text);
      navigator.pop();
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.error.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

```

4. Die Zeile `            FilledButton(onPressed: _register, child: const Text('Konto erstellen')),` ersetzen durch:

```dart
            FilledButton(
              onPressed: _busy ? null : _register,
              child: _busy ? const ButtonSpinner() : const Text('Konto erstellen'),
            ),
```

**Prüfen:** Mit Server: Neues Konto anlegen, danach ist der Rahmen offen. Mit derselben E-Mail noch einmal
registrieren zeigt „Für diese E-Mail gibt es schon ein Konto.“ `flutter test` ist grün.

- [ ] erledigt · Commit: `F10: Registrieren echt beim Server`

### F11: Abmelden im Profil

**Ziel:** Auf der Seite „Profil“ gibt es den Button „Abmelden“. Er löscht die Tokens auf dem Gerät und
bittet den Server, den Refresh Token zu löschen. Danach erscheint der Login.

1. Den Inhalt von `lib/pages/profile_page.dart` komplett ersetzen durch:

```dart
import 'package:flutter/material.dart';

import '../auth/auth_scope.dart';
import '../theme.dart';

class ProfilePage extends StatelessWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('ProfilePage – folgt'),
          const SizedBox(height: OgSpace.s4),
          // Abmelden: AuthGate wechselt danach von selbst zum Login
          TextButton.icon(
            onPressed: () => AuthScope.read(context).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Abmelden'),
          ),
        ],
      ),
    );
  }
}
```

**Prüfen:** Profil → „Abmelden“ zeigt den Login. Nach einem Neustart der App kommt ebenfalls der Login.

- [ ] erledigt · Commit: `F11: Abmelden im Profil`

### F12: Tests für Login, Registrieren, Abmelden

**Ziel:** Die ganze App wird mit dem Test-Server durchgespielt:
- falsches Passwort
- leere Felder
- gespeicherte Sitzung
- Abmelden
- Registrieren

1. In `test/login_test.dart` direkt **über** der letzten Zeile `}` einfügen:

```dart

  testWidgets('Falsches Passwort zeigt eine Meldung', (tester) async {
    await pumpApp(tester);

    await tester.enterText(email, 'a@b.de');
    await tester.enterText(password, 'falsch');
    await tester.tap(loginButton);
    await settle(tester);
    expect(find.text('E-Mail oder Passwort ist falsch.'), findsOneWidget);
    expect(find.text('Start'), findsNothing);
  });

  testWidgets('Leere Felder: Hinweis, keine Anfrage an den Server', (tester) async {
    final server = await pumpApp(tester);

    await tester.tap(loginButton);
    await tester.pump();
    expect(find.text('Bitte E-Mail und Passwort eingeben.'), findsOneWidget);
    expect(server.calls, isEmpty);
  });

  testWidgets('Gespeicherte Sitzung öffnet direkt den App-Rahmen', (tester) async {
    await pumpApp(tester, savedRefreshToken: 'alt');
    expect(find.text('Start'), findsOneWidget);
  });

  testWidgets('Abmelden führt zurück zum Login', (tester) async {
    final server = await pumpApp(tester, savedRefreshToken: 'alt');

    await tester.tap(find.text('Profil'));
    await tester.pump();
    await tester.tap(find.text('Abmelden'));
    await settle(tester);
    expect(find.text('Melde dich mit deinem OpenGrid-Konto an'), findsOneWidget);
    expect(server.count('/auth/logout'), 1);
  });
```

2. Datei `test/register_test.dart` anlegen:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';

import 'test_app.dart';

void main() {
  // Im Test keine Schriften aus dem Internet laden
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('Registrieren legt ein Konto an und öffnet den App-Rahmen', (tester) async {
    final server = await pumpApp(tester);

    await tester.tap(find.widgetWithText(TextButton, 'Registrieren'));
    await settle(tester);
    expect(find.text('Erstelle dein OpenGrid-Konto'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'E-Mail'), 'neu@b.de');
    await tester.enterText(find.widgetWithText(TextField, 'Passwort'), 'richtig');
    await tester.tap(find.widgetWithText(FilledButton, 'Konto erstellen'));
    await settle(tester);

    expect(server.bodies['/auth/register'], {'email': 'neu@b.de', 'password': 'richtig', 'profilePicture': ''});
    expect(find.text('Start'), findsOneWidget);
  });

  testWidgets('"Schon ein Konto? Anmelden" führt zurück zum Login', (tester) async {
    await pumpApp(tester);

    await tester.tap(find.widgetWithText(TextButton, 'Registrieren'));
    await settle(tester);
    await tester.tap(find.widgetWithText(TextButton, 'Anmelden'));
    await settle(tester);
    expect(find.text('Melde dich mit deinem OpenGrid-Konto an'), findsOneWidget);
  });
}
```

**Prüfen:** `flutter test` meldet `All tests passed!` mit 17 Tests:

| Tests | Anzahl |
|---|---|
| Rahmen | 2 |
| Token-Logik | 7 |
| Login | 6 |
| Registrieren | 2 |

- [ ] erledigt · Commit: `F12: Tests für Login, Registrieren, Abmelden`
