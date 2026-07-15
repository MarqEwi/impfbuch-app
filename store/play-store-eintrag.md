# Play-Store-Eintrag — Impfbuch-App

Vorbereitete Inhalte zum Einfügen in die Google Play Console.

---

## App-Name (max. 30 Zeichen)

```
Impfbuch – digitaler Impfpass
```

## Kurzbeschreibung (max. 80 Zeichen)

```
Impfungen im Blick: Fälligkeiten, Reiseimpfungen, Erinnerungen – 100 % lokal.
```

## Vollständige Beschreibung (max. 4000 Zeichen)

```
Dein digitaler Impfpass im Stil des gelben Impfausweises – übersichtlich, praktisch und komplett privat.

ALLE IMPFUNGEN IM BLICK
• Vollständiges Impfschema nach STIKO-Empfehlung (RKI): von der Grundimmunisierung im Säuglingsalter über Auffrischungen bis zu Impfungen ab 60
• Automatische Fälligkeitsberechnung aus deinem Geburtsdatum – du siehst sofort, was überfällig ist, was bald ansteht und was erledigt ist
• Erinnerungen an fällige Impfungen

SCHNELL EINGETRAGEN
• Kombinationsimpfungen (6-fach, Tdap-IPV, MMRV u. v. m.) mit einem Klick – nichts doppelt erfassen
• Schnelleintrag: mehrere Impfungen und mehrere Termine auf einmal
• Einträge mit Impfstoff, Charge und Arzt – wie im Papier-Impfpass, chronologisch sortiert
• Geführte Ersteinrichtung zum Übertragen deines Impfpasses

FÜR DIE GANZE FAMILIE
• Mehrere Personen-Profile (z. B. Kinder) mit eigenen Impfdaten
• Nicht relevante Impfungen ausblenden – altersbedingt Unnötiges wird automatisch ausgeblendet

REISEN & BERUF
• Reise- und Länderempfehlungen für alle Länder der Welt: Pflicht- und empfohlene Impfungen, mit Abgleich gegen deinen Impfstatus
• „Weltweiter Impfschutz" für Vielreisende
• Gültigkeits-Überwachung für Reise- und Berufsimpfungen (z. B. Typhus, Gelbfieber): sieh jederzeit, ob der Schutz noch aktiv ist

DEINE DATEN GEHÖREN DIR
• Alle Daten bleiben ausschließlich auf deinem Gerät – keine Anmeldung, keine Server, kein Tracking, keine Werbung
• Export/Import als Datei, wahlweise pro Person
• Offline nutzbar, Dark Mode inklusive

WICHTIGER HINWEIS
Diese App ersetzt weder den amtlichen Impfausweis noch ärztliche Beratung. Das Impfschema orientiert sich am STIKO-Impfkalender; individuelle Empfehlungen können abweichen. Reiseempfehlungen sind eine kuratierte Übersicht ohne Gewähr – lass dich vor Reisen ärztlich beraten.
```

---

## Grafiken

| Asset | Datei | Anforderung |
|---|---|---|
| App-Icon | `icons/icon-512.png` | 512×512 PNG ✓ |
| Feature-Grafik | `store/feature-graphic.png` | 1024×500 PNG ✓ |
| Screenshots | selbst aufnehmen | mind. 2, je 9:16 (Handy) |

**Screenshots aufnehmen:** App auf dem S24 installieren → durch die Tabs gehen
(Impfpass mit Einträgen, Fällig, Reise mit einem Land, Dark Mode) → je einen
Screenshot (Power + Leiser). Empfohlen: 4–6 Stück.

## Formular-Antworten (Play Console)

- **Kategorie:** Medizin (oder Gesundheit & Fitness)
- **Datenschutzerklärung-URL:** `https://marqewi.github.io/impfbuch-app/datenschutz.html`
- **Datensicherheit („Data safety"):** Es werden **keine Daten erhoben oder
  weitergegeben** — alle Fragen entsprechend mit „Nein" beantworten
  (keine Erfassung, keine Weitergabe, Daten verlassen das Gerät nicht).
- **Anmeldung erforderlich?** Nein
- **Werbung?** Nein
- **Einstufung des Inhalts (IARC-Fragebogen):** keine bedenklichen Inhalte →
  ergibt USK 0 / „Alle Altersgruppen"
- **Zielgruppe:** 18+ wählen (vereinfacht die Prüfung; Kinder-Profile werden
  von Erwachsenen gepflegt)
- **Gesundheits-App-Deklaration:** Zweck „Gesundheitsinformationen verwalten /
  Impfnachweis-Organisation"; keine Medizinprodukt-Funktion, keine Diagnosen

## Ablauf-Checkliste

1. ☐ GitHub Pages live (`https://marqewi.github.io/impfbuch-app/`)
2. ☐ Google-Play-Entwicklerkonto registriert (25 $, Identitätsprüfung)
3. ☐ PWABuilder: URL eingeben → „Package for Android" → `.aab` + Signatur-Key
   + `assetlinks.json` herunterladen (**Key-Datei gut aufbewahren!**)
4. ☐ `assetlinks.json` unter `https://marqewi.github.io/.well-known/assetlinks.json`
   veröffentlichen (eigenes Repo `MarqEwi.github.io`)
5. ☐ Play Console: App anlegen → `.aab` hochladen (erst interner Test empfohlen)
6. ☐ Store-Eintrag mit obigen Texten/Grafiken füllen, Formulare beantworten
7. ☐ Zur Prüfung einreichen (Dauer: meist 1–7 Tage)
