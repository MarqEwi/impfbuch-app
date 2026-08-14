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

  const A = { b: 595.28, h: 841.89, li: 48, re: 547 };
  const F = { AMBER: "0.784 0.565 0.122", AMBER_D: "0.53 0.37 0.05",
              INK: "0.16 0.14 0.1", GRAU: "0.45 0.43 0.38",
              HELL: "0.85 0.83 0.78", ZART: "0.92 0.9 0.86", WEISS: "1 1 1" };

  function erzeugen(profil, variante) {
    const S = window.STIKO;
    const seiten = [];
    let ops = null;
    let y = 0;

    const t = (x, yy, s, gr, font, farbe) =>
      ops.push(`${farbe || F.INK} rg BT /${font || "F1"} ${gr} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td (${enc(s)}) Tj ET`);
    const linie = (x1, y1, x2, y2, st, farbe) =>
      ops.push(`${farbe || F.HELL} RG ${st || 0.6} w ${x1} ${y1.toFixed(1)} m ${x2} ${y2.toFixed(1)} l S`);
    const flaeche = (x, yy, b, hh, farbe) =>
      ops.push(`${farbe} rg ${x} ${yy.toFixed(1)} ${b} ${hh} re f`);

    function neueSeite(erste) {
      ops = [];
      seiten.push(ops);
      if (erste) {
        flaeche(0, A.h - 74, A.b, 74, F.AMBER);
        const titel = variante === "impfbuch" ? "Impfbuch" : "Impfübersicht";
        t(A.li, A.h - 46, titel, 22, "F2", F.WEISS);
        t(A.li, A.h - 64, "Private Übersicht aus der Impfbuch-App", 8.5, "F1", F.WEISS);
        y = A.h - 102;
      } else {
        flaeche(0, A.h - 26, A.b, 26, F.AMBER);
        t(A.li, A.h - 18, `${profil.name} — Fortsetzung`, 9, "F2", F.WEISS);
        y = A.h - 52;
      }
    }
    // Sorgt für Platz; bricht sonst um. 70 pt bleiben für die Fußzeile frei.
    function brauch(n) {
      if (y - n < 70) neueSeite(false);
    }

    neueSeite(true);

    // Person
    t(A.li, y, profil.name || "—", 14, "F2");
    y -= 15;
    if (profil.birthdate) {
      t(A.li, y, `geboren am ${datumDe(profil.birthdate)}`, 10, "F1", F.GRAU);
      y -= 12;
    }
    y -= 10;

    function abschnitt(titel) {
      brauch(40);
      t(A.li, y, titel, 12.5, "F2", F.AMBER_D);
      y -= 5;
      linie(A.li, y, A.re, y, 1.1, F.AMBER);
      y -= 17;
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
        felder.forEach(([label, wert]) => {
          const zeilen = umbrechen(wert, A.re - (A.li + 170), 10.5);
          brauch(zeilen.length * 13 + 4);
          t(A.li, y, label.toUpperCase(), 7.5, "F1", F.GRAU);
          zeilen.forEach((z) => {
            t(A.li + 170, y, z, 10.5);
            y -= 13;
          });
          y -= 4;
        });
        y -= 8;
      }
    }

    /* ---- Impfungen, gruppiert je Impfung, chronologisch */
    abschnitt("Impfungen");
    const spalten = { nr: A.li, datum: A.li + 24, produkt: A.li + 94, charge: A.li + 262, arzt: A.li + 348 };
    const spaltenkopf = () => {
      t(spalten.datum, y, "DATUM", 7, "F1", F.GRAU);
      t(spalten.produkt, y, "IMPFSTOFF", 7, "F1", F.GRAU);
      t(spalten.charge, y, "CHARGE", 7, "F1", F.GRAU);
      t(spalten.arzt, y, "ÄRZTIN / ARZT", 7, "F1", F.GRAU);
      y -= 12;
    };

    let irgendwas = false;
    (S.STIKO_SCHEDULE || []).forEach((vac) => {
      const eintraege = (profil.records || [])
        .filter((r) => (r.targets || []).includes(vac.id))
        .slice()
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      if (!eintraege.length) return;
      irgendwas = true;

      brauch(48);
      t(A.li, y, vac.name, 11, "F2");
      t(
        A.li + breite(vac.name, 11) + 8,
        y,
        `— ${eintraege.length} ${eintraege.length === 1 ? "Eintrag" : "Einträge"}`,
        9, "F1", F.GRAU
      );
      y -= 13;
      spaltenkopf();

      eintraege.forEach((r, i) => {
        const umbruch = y - 15 < 70;
        brauch(15);
        if (umbruch) spaltenkopf();
        t(spalten.nr, y, `${i + 1}.`, 9.5, "F1", F.GRAU);
        t(spalten.datum, y, datumDe(r.date), 9.5);
        t(spalten.produkt, y, kurz(r.product || "—", spalten.charge - spalten.produkt - 8, 9.5), 9.5);
        t(spalten.charge, y, kurz(r.batch || "—", spalten.arzt - spalten.charge - 8, 9.5), 9.5);
        t(spalten.arzt, y, kurz(r.doctor || "—", A.re - spalten.arzt, 9.5), 9.5);
        linie(A.li, y - 4, A.re, y - 4, 0.4, F.ZART);
        y -= 15;
      });
      y -= 10;
    });
    if (!irgendwas) {
      t(A.li, y, "Noch keine Impfungen eingetragen.", 10, "F3", F.GRAU);
      y -= 14;
    }

    /* ---- Fußzeile auf jeder Seite */
    const heute = new Date();
    const heuteDe = `${String(heute.getDate()).padStart(2, "0")}.${String(
      heute.getMonth() + 1
    ).padStart(2, "0")}.${heute.getFullYear()}`;
    seiten.forEach((seite, i) => {
      const alt = ops;
      ops = seite;
      linie(A.li, 54, A.re, 54, 0.7, F.HELL);
      t(A.li, 44, "Diese Übersicht ersetzt weder den amtlichen Impfausweis noch ärztliche Beratung.", 7.5, "F3", F.GRAU);
      t(A.li, 34, `Privates Dokument — erstellt am ${heuteDe} mit der Impfbuch-App.`, 7.5, "F3", F.GRAU);
      const nr = `Seite ${i + 1} von ${seiten.length}`;
      t(A.re - breite(nr, 8), 44, nr, 8, "F1", F.GRAU);
      ops = alt;
    });

    /* ---- PDF zusammensetzen */
    const objekte = [];
    objekte.push("<< /Type /Catalog /Pages 2 0 R >>");
    objekte.push(""); // Platzhalter für den Seitenbaum (Objekt 2)
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>");

    const seitenNrn = [];
    seiten.forEach((seite) => {
      const inhalt = seite.join("\n");
      objekte.push(`<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`);
      const inhaltNr = objekte.length;
      objekte.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A.b} ${A.h}] ` +
          `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> ` +
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
