/*
 * Erzeugt die PDF-Übersicht für die eigenen Unterlagen — von Hand, ohne
 * Fremdbibliothek. Warum: Die App ist offline-fähig und schlank; eine
 * PDF-Bibliothek brächte hunderte Kilobyte für etwas, das mit den
 * eingebauten PDF-Grundfunktionen (Standard-Schrift Helvetica, Text,
 * Linien, Flächen) vollständig auskommt.
 *
 * Verwendung:  PdfExport.erzeugen(profil, "impfungen" | "impfbuch")
 *              → { base64, dateiname }
 */
(function () {
  "use strict";

  /* ------------------------------------------------ Zeichen & Maße */

  // CP1252-Sonderzeichen, die nicht in Latin-1 liegen (deutsche Anführungen,
  // Gedankenstrich …) — alles andere ≤ 0xFF geht direkt durch.
  const CP1252 = {
    "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92,
    "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96,
    "—": 0x97, "€": 0x80,
  };
  function enc(s) {
    let raw = "";
    for (const ch of String(s == null ? "" : s)) {
      const c = ch.codePointAt(0);
      if (c <= 0xff) raw += String.fromCharCode(c);
      else if (CP1252[ch] !== undefined) raw += String.fromCharCode(CP1252[ch]);
      else raw += "?";
    }
    return raw.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  }

  /* Breitenschätzung für Helvetica (in em) — genau genug für Umbruch und
     Kürzung; der Text ist linksbündig, Millimeter zählen hier nicht. */
  function breite(s, gr) {
    let b = 0;
    for (const ch of String(s == null ? "" : s)) {
      if ("iljI.,:;'!|()[] ".includes(ch)) b += 0.3;
      else if ("mwMW@".includes(ch)) b += 0.89;
      else if (ch >= "A" && ch <= "Z") b += 0.68;
      else b += 0.52;
    }
    return b * gr;
  }

  // Kürzt auf eine Spaltenbreite (Punkt) mit Auslassungspunkten.
  function kurz(s, maxPt, gr) {
    s = String(s == null ? "" : s);
    if (breite(s, gr) <= maxPt) return s;
    while (s.length && breite(s + "…", gr) > maxPt) s = s.slice(0, -1);
    return s + "…";
  }

  // Bricht Text in Zeilen um (für mehrzeilige Angaben wie die Adresse).
  function umbrechen(s, maxPt, gr) {
    const zeilen = [];
    for (const roh of String(s == null ? "" : s).split(/\n/)) {
      let zeile = "";
      for (const wort of roh.split(/\s+/)) {
        const test = zeile ? zeile + " " + wort : wort;
        if (breite(test, gr) <= maxPt) zeile = test;
        else {
          if (zeile) zeilen.push(zeile);
          zeile = kurz(wort, maxPt, gr);
        }
      }
      zeilen.push(zeile);
    }
    return zeilen;
  }

  function datumDe(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    return m ? `${m[3]}.${m[2]}.${m[1]}` : iso || "";
  }

  /* ------------------------------------------------ Dokument bauen */

  const A = { b: 595.28, h: 841.89, li: 52, re: 543 };
  /* Zurückhaltende Palette: Farbe nur als Akzent, keine großen Vollton-
     Flächen — das spart Toner und bleibt auch im Schwarzweiß-Druck lesbar. */
  const F = { AMBER: "0.784 0.565 0.122", AMBER_D: "0.46 0.32 0.04",
              INK: "0.13 0.12 0.09", GRAU: "0.42 0.40 0.36",
              HELL: "0.78 0.76 0.71", ZART: "0.88 0.86 0.82",
              ZEBRA: "0.965 0.955 0.935", WEISS: "1 1 1" };

  // App-Gruppenfarbe (#rrggbb) → PDF-Farbe
  function hexPdf(hex) {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || "");
    if (!m) return F.GRAU;
    return [1, 2, 3].map((i) => (parseInt(m[i], 16) / 255).toFixed(3)).join(" ");
  }

  function erzeugen(profil, variante) {
    const S = window.STIKO;
    const GRUPPEN = (S && S.GROUPS) || {};
    const seiten = [];
    let ops = null;
    let y = 0;

    /* `sperr` setzt die Zeichenabstände (Tc) — für die kleinen
       Versalien-Beschriftungen, die dem Dokument Ruhe geben. Tc gehört zum
       Textzustand und bliebe sonst stehen, deshalb immer mitgeben. */
    const t = (x, yy, s, gr, font, farbe, sperr) =>
      ops.push(
        `${farbe || F.INK} rg BT /${font || "F1"} ${gr} Tf ${(sperr || 0).toFixed(2)} Tc ` +
          `${x.toFixed(1)} ${yy.toFixed(1)} Td (${enc(s)}) Tj ET`
      );
    const linie = (x1, y1, x2, y2, st, farbe) =>
      ops.push(`${farbe || F.HELL} RG ${st || 0.6} w ${x1.toFixed(1)} ${y1.toFixed(1)} m ${x2.toFixed(1)} ${y2.toFixed(1)} l S`);
    const flaeche = (x, yy, b, hh, farbe) =>
      ops.push(`${farbe} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${b.toFixed(1)} ${hh.toFixed(1)} re f`);
    const rahmen = (x, yy, b, hh, st, farbe) =>
      ops.push(`${farbe || F.HELL} RG ${st || 0.7} w ${x.toFixed(1)} ${yy.toFixed(1)} ${b.toFixed(1)} ${hh.toFixed(1)} re S`);

    const heute = new Date();
    const heuteDe = `${String(heute.getDate()).padStart(2, "0")}.${String(
      heute.getMonth() + 1
    ).padStart(2, "0")}.${heute.getFullYear()}`;

    function neueSeite(erste) {
      ops = [];
      seiten.push(ops);
      if (erste) {
        /* Kopf im Stil des Impfpass-Deckblatts: Serifentitel wie in der App,
           darunter eine kräftige Bernstein-Linie statt einer Farbfläche. */
        const titel = variante === "impfbuch" ? "Impfbuch" : "Impfübersicht";
        t(A.li, A.h - 62, titel, 25, "F4", F.INK);
        t(A.re - breite("Stand: " + heuteDe, 8), A.h - 62, "Stand: " + heuteDe, 8, "F1", F.GRAU);
        t(A.li, A.h - 76, "PRIVATE ÜBERSICHT AUS DER IMPFBUCH-APP", 7.5, "F1", F.GRAU, 1.1);
        linie(A.li, A.h - 86, A.re, A.h - 86, 2, F.AMBER);
        y = A.h - 112;
      } else {
        t(A.li, A.h - 46, `${profil.name} — Fortsetzung`, 9, "F4", F.GRAU);
        t(A.re - breite(variante === "impfbuch" ? "Impfbuch" : "Impfübersicht", 8),
          A.h - 46, variante === "impfbuch" ? "Impfbuch" : "Impfübersicht", 8, "F1", F.GRAU);
        linie(A.li, A.h - 54, A.re, A.h - 54, 0.8, F.AMBER);
        y = A.h - 78;
      }
    }
    // Sorgt für Platz; bricht sonst um. 74 pt bleiben für die Fußzeile frei.
    function brauch(n) {
      if (y - n < 74) neueSeite(false);
    }

    neueSeite(true);

    /* ---- Inhaber-Feld wie im gelben Impfpass: umrandete Box mit den
       dreisprachigen Beschriftungen — das Wiedererkennungsmerkmal der App. */
    const oben = y + 14; // Oberkante der Box
    const boxH = profil.birthdate ? 78 : 48;
    rahmen(A.li, oben - boxH, A.re - A.li, boxH, 0.8, F.HELL);
    let by = oben - 15;
    t(A.li + 14, by, "ausgestellt für / issued to / délivré à", 6.5, "F1", F.GRAU, 0.2);
    by -= 17;
    t(A.li + 14, by, profil.name || "—", 15, "F4", F.INK);
    if (profil.birthdate) {
      by -= 18;
      t(A.li + 14, by, "Geburtsdatum / born on / né(e) le", 6.5, "F1", F.GRAU, 0.2);
      by -= 15;
      t(A.li + 14, by, datumDe(profil.birthdate), 11, "F1", F.INK);
    }
    y = oben - boxH - 30;

    function abschnitt(titel) {
      brauch(46);
      t(A.li, y, titel.toUpperCase(), 9, "F2", F.AMBER_D, 1.4);
      y -= 6;
      linie(A.li, y, A.re, y, 0.9, F.AMBER);
      y -= 18;
    }

    /* ---- Persönliche Angaben (nur Variante „Impfbuch") */
    if (variante === "impfbuch") {
      const b = profil.book || {};
      const felder = [
        ["Adresse", b.address],
        ["Hausärztin / Hausarzt", b.doctor],
        ["Krankenkasse", b.insurer],
        ["Versichertennummer", b.insuranceNo],
        ["Blutgruppe", b.bloodGroup],
        ["Allergien & Hinweise", b.allergies],
        ["Sonstiges", b.other],
      ].filter(([, wert]) => wert);
      if (felder.length) {
        abschnitt("Persönliche Angaben");
        const wertX = A.li + 168;
        felder.forEach(([label, wert], i) => {
          const zeilen = umbrechen(wert, A.re - wertX - 6, 10);
          const hoehe = zeilen.length * 13 + 7;
          brauch(hoehe);
          // Zarte Zeilenfarbe statt Trennlinien — ruhiger und tonersparend.
          if (i % 2 === 0) flaeche(A.li, y - hoehe + 12, A.re - A.li, hoehe, F.ZEBRA);
          t(A.li + 8, y, label.toUpperCase(), 7, "F1", F.GRAU, 0.7);
          zeilen.forEach((z) => {
            t(wertX, y, z, 10);
            y -= 13;
          });
          y -= 7;
        });
        y -= 12;
      }
    }

    /* ---- Impfungen, gruppiert je Impfung, chronologisch */
    abschnitt("Impfungen");
    const spalten = { nr: A.li + 8, datum: A.li + 26, produkt: A.li + 96,
                      charge: A.li + 264, arzt: A.li + 350 };
    const spaltenkopf = () => {
      t(spalten.datum, y, "DATUM", 6.5, "F1", F.GRAU, 0.8);
      t(spalten.produkt, y, "IMPFSTOFF", 6.5, "F1", F.GRAU, 0.8);
      t(spalten.charge, y, "CHARGE", 6.5, "F1", F.GRAU, 0.8);
      t(spalten.arzt, y, "ÄRZTIN / ARZT", 6.5, "F1", F.GRAU, 0.8);
      y -= 5;
      linie(A.li, y, A.re, y, 0.5, F.ZART);
      y -= 11;
    };

    let irgendwas = false;
    (S.STIKO_SCHEDULE || []).forEach((vac) => {
      const eintraege = (profil.records || [])
        .filter((r) => (r.targets || []).includes(vac.id))
        .slice()
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (!eintraege.length) return;
      irgendwas = true;

      /* Farbiger Balken links wie die Gruppenfarbe im Impfpass — im
         Schwarzweiß-Druck immer noch ein sauberer Strich. */
      const farbe = hexPdf((GRUPPEN[vac.group] || {}).color);
      const anzahl = `${eintraege.length} ${eintraege.length === 1 ? "Eintrag" : "Einträge"}`;
      const gruppenkopf = (fortsetzung) => {
        flaeche(A.li, y - 3, 3, 13, farbe);
        const name = vac.name + (fortsetzung ? " (Fortsetzung)" : "");
        t(A.li + 10, y, name, 11.5, "F4", F.INK);
        t(A.re - breite(anzahl, 8), y, anzahl, 8, "F1", F.GRAU);
        y -= 15;
        spaltenkopf();
      };

      brauch(56);
      gruppenkopf(false);

      eintraege.forEach((r, i) => {
        /* Bricht die Gruppe über den Seitenrand, wird ihr Kopf oben
           wiederholt — sonst stünde die Zeile ohne Bezug da. */
        const umbruch = y - 15 < 74;
        brauch(15);
        if (umbruch) gruppenkopf(true);
        // Zebrastreifen statt Trennlinien: ruhiger und im Druck sparsamer.
        if (i % 2 === 1) flaeche(A.li, y - 4, A.re - A.li, 14, F.ZEBRA);
        t(spalten.nr, y, `${i + 1}`, 8, "F1", F.GRAU);
        t(spalten.datum, y, datumDe(r.date), 9.5, "F2");
        t(spalten.produkt, y, kurz(r.product || "—", spalten.charge - spalten.produkt - 10, 9.5), 9.5);
        t(spalten.charge, y, kurz(r.batch || "—", spalten.arzt - spalten.charge - 10, 9), 9);
        t(spalten.arzt, y, kurz(r.doctor || "—", A.re - spalten.arzt - 4, 9), 9, "F1", F.GRAU);
        y -= 15;
      });
      y -= 14;
    });
    if (!irgendwas) {
      t(A.li, y, "Noch keine Impfungen eingetragen.", 10, "F3", F.GRAU);
      y -= 14;
    }

    /* ---- Fußzeile auf jeder Seite */
    seiten.forEach((seite, i) => {
      const alt = ops;
      ops = seite;
      linie(A.li, 58, A.re, 58, 0.5, F.ZART);
      t(A.li, 47, "Diese Übersicht ersetzt weder den amtlichen Impfausweis noch ärztliche Beratung.", 7, "F3", F.GRAU);
      t(A.li, 37, `Privates Dokument — erstellt am ${heuteDe} mit der Impfbuch-App.`, 7, "F3", F.GRAU);
      const nr = `${i + 1} / ${seiten.length}`;
      t(A.re - breite(nr, 8.5), 47, nr, 8.5, "F2", F.GRAU);
      ops = alt;
    });

    /* ---- PDF zusammensetzen */
    const objekte = [];
    objekte.push("<< /Type /Catalog /Pages 2 0 R >>");
    objekte.push(""); // Platzhalter für den Seitenbaum (Objekt 2)
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");
    /* F4 = Serifenschrift für Titel und Namen — greift die Georgia-Optik
       des Impfpass-Deckblatts in der App auf. Times gehört zu den 14
       Standardschriften und muss nicht eingebettet werden. */
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>");

    const seitenNrn = [];
    seiten.forEach((seite) => {
      const inhalt = seite.join("\n");
      objekte.push(`<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`);
      const inhaltNr = objekte.length;
      objekte.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A.b} ${A.h}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> ` +
          `/Contents ${inhaltNr} 0 R >>`
      );
      seitenNrn.push(objekte.length);
    });
    objekte[1] =
      `<< /Type /Pages /Kids [${seitenNrn.map((n) => n + " 0 R").join(" ")}] ` +
      `/Count ${seitenNrn.length} >>`;

    let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const offsets = [];
    objekte.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((o) => {
      pdf += String(o).padStart(10, "0") + " 00000 n \n";
    });
    pdf += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

    const slug = (profil.name || "impfpass").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const dateiname = `${variante === "impfbuch" ? "impfbuch" : "impfuebersicht"}-${slug}-${new Date().toISOString().slice(0, 10)}.pdf`;
    return { base64: btoa(pdf), dateiname };
  }

  window.PdfExport = { erzeugen };
})();
