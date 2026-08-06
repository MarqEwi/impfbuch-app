/*
 * Erzeugt die Papiertextur für den Hintergrund — rein rechnerisch, ohne
 * externe Pakete.
 *
 * Warum nicht ein Foto/KI-Bild? Eine gescannte Textur kachelt nie sauber
 * (sichtbare Kanten) und bringt Flecken mit, die im App-Hintergrund
 * schmuddelig wirken. Hier entsteht eine gleichmäßige, feine Faserstruktur,
 * die sich exakt wiederholt: Die großflächige Variation nutzt ausschließlich
 * ganzzahlige Frequenzen, ist also am Rand nahtlos; das feine Korn ist so
 * hochfrequent, dass Übergänge nicht auffallen.
 *
 * Aufruf:  node scripts/make-paper-texture.mjs [ausgabe.png] [hex]
 */
import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const OUT = process.argv[2] || "images/paper.png";
const BASE_HEX = (process.argv[3] || "e9c94a").replace("#", "");
// 256er-Kachel: feines Korn bleibt sichtbar, die Datei aber klein (PNG kann
// zufälliges Korn kaum komprimieren — jede Vervierfachung der Fläche kostet
// direkt Dateigröße).
const SIZE = 256;

const base = [
  parseInt(BASE_HEX.slice(0, 2), 16),
  parseInt(BASE_HEX.slice(2, 4), 16),
  parseInt(BASE_HEX.slice(4, 6), 16),
];

// Wiederholbares Rauschen (fester Startwert → identisches Ergebnis bei jedem Lauf)
let seed = 20260806;
function rnd() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}

const TAU = Math.PI * 2;
// Großflächige Wolkigkeit: ganzzahlige Frequenzen → nahtlos an den Kanten
const waves = [];
for (let i = 0; i < 7; i++) {
  waves.push({
    fx: 1 + Math.floor(rnd() * 4),
    fy: 1 + Math.floor(rnd() * 4),
    px: rnd() * TAU,
    py: rnd() * TAU,
    amp: 0.6 / (i + 1),
  });
}

const raw = Buffer.alloc(SIZE * (1 + SIZE * 3));
for (let y = 0; y < SIZE; y++) {
  raw[y * (1 + SIZE * 3)] = 0; // Filtertyp 0
  for (let x = 0; x < SIZE; x++) {
    const u = x / SIZE;
    const v = y / SIZE;

    // sanfte Tonschwankung (± ca. 1,5 %)
    let cloud = 0;
    for (const w of waves) {
      cloud +=
        w.amp *
        Math.sin(TAU * w.fx * u + w.px) *
        Math.sin(TAU * w.fy * v + w.py);
    }
    cloud *= 0.014;

    // Papierfaser: nur waagerecht und in der Lage leicht verzogen. Zwei
    // gekreuzte Sinus ergäben ein sichtbares Gittermuster — deshalb bewusst
    // nur eine Richtung.
    const fiber =
      0.005 * Math.sin(TAU * 48 * v + 2.2 * Math.sin(TAU * 3 * u)) +
      0.003 * Math.sin(TAU * 23 * v + 1.7 * Math.sin(TAU * 2 * u + 1.1));

    // Korn (hochfrequent, Kanten dadurch unauffällig)
    const grain = (rnd() - 0.5) * 0.026;

    const f = 1 + cloud + fiber + grain;
    const o = y * (1 + SIZE * 3) + 1 + x * 3;
    for (let c = 0; c < 3; c++) {
      raw[o + c] = Math.max(0, Math.min(255, Math.round(base[c] * f)));
    }
  }
}

/* ------------------------------------------------------------- PNG-Ausgabe */
const CRC = (() => {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return (buf) => {
    let c = 0xffffffff;
    for (const b of buf) c = t[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 2; // 8 Bit, RGB
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(OUT, png);
console.log(`${OUT} — ${SIZE}×${SIZE}, ${Math.round(png.length / 1024)} KB`);
