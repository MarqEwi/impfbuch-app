# Impfbuch-App 💉

Digitaler Impfpass im Stil des gelben deutschen Impfausweises — als installierbare
Progressive Web App (PWA). Ergänzend zum amtlichen Impfpass gedacht.

## Funktionen

- **Vollständiges STIKO-Impfschema** (RKI): Grundimmunisierung, Kindes-/Jugendalter,
  Auffrischungen, Impfungen ab 60, Indikations-/Reise- und Berufsimpfungen
- **Automatische Fälligkeitsberechnung** aus dem Geburtsdatum — Status
  überfällig / bald fällig / geplant / abgeschlossen, inkl. Mindestabständen
- **Kombinationsimpfungen** (6-fach, Tdap-IPV, MMRV, Twinrix …) — ein Eintrag
  deckt mehrere Impfungen ab
- **Schnelleintrag**: mehrere Impfungen und mehrere Daten auf einmal erfassen
- **Familienprofile**: mehrere Personen mit eigenen Impfdaten
- **Reise- & Länderempfehlungen**: alle Länder, Suche + Kontinent-Auswahl,
  „Weltweiter Impfschutz", Übernahme in Impfpass & Fälligkeitsliste
- **Gültigkeits-Überwachung** für Reise-/Berufsimpfungen (z. B. Typhus)
- **Erinnerungen**: beim Öffnen der App und (Android, installierte PWA) per
  täglicher Hintergrundprüfung
- **Dark Mode** (Hell / Dunkel / Automatisch)
- **Export/Import** als JSON, wahlweise pro Person
- **Offline-fähig** dank Service Worker

## Datenschutz

Alle Daten werden **ausschließlich lokal** im Browser-Speicher des Geräts
abgelegt. Keine Anmeldung, keine Server, keine Datenübertragung, kein Tracking.
Details: [datenschutz.html](datenschutz.html)

## Lokal starten

Statischer Server nötig (Service Worker). Unter Windows genügt:

```powershell
powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8123
```

Dann <http://localhost:8123> öffnen.

## Projektstruktur

```
index.html            Oberfläche (Tabs: Impfpass, Fällig, Reise, Profil)
css/styles.css        Design (Impfpass-Look, Dark Mode)
js/stiko-data.js      STIKO-Impfschema, Kombinationsimpfstoffe, Schutzdauern
js/travel-data.js     Länder-/Reiseempfehlungen
js/app.js             Logik: Fälligkeiten, Profile, Rendering, Dialoge
js/reminders-db.js    IndexedDB-Brücke für Hintergrund-Erinnerungen
sw.js                 Service Worker (Offline-Cache, Hintergrund-Check)
manifest.webmanifest  PWA-Manifest (installierbar, Play-Store-tauglich)
icons/, images/       App-Icons und Papier-Textur
serve.ps1             Lokaler Entwicklungs-Server (PowerShell)
```

## Veröffentlichung

1. **Hosting (HTTPS)**: z. B. Netlify — dieses Repository verbinden oder den
   Ordner manuell deployen. Es sind keine Build-Schritte nötig (statische Dateien).
2. **Google Play Store**: Mit [PWABuilder](https://www.pwabuilder.com) aus der
   gehosteten URL ein Android-Paket (`.aab`) erzeugen, die generierte
   `assetlinks.json` unter `.well-known/assetlinks.json` mit hosten und das
   Paket in der Play Console einreichen.

## Hinweis

Diese App ersetzt weder den amtlichen Impfausweis noch ärztliche Beratung.
Das Impfschema orientiert sich am STIKO-Impfkalender; individuelle Empfehlungen
können abweichen.

---

© Marc Ewers. Alle Rechte vorbehalten.
