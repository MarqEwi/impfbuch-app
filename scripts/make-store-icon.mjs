/* Erzeugt das Play-Store-Produktsymbol (Diamant) als 512x512-PNG.
   Reines Node (zlib), kein externes Paket. 3x-Supersampling für glatte Kanten. */
import zlib from "node:zlib";
import { writeFileSync } from "node:fs";

const OUT = process.argv[2] || "premium_unlock_icon.png";
const SIZE = 512, SS = 3, W = SIZE * SS; // Supersampling
const BG = [242, 246, 252];

// Diamant-Geometrie im 100x92-Raster (wie das SVG in der App)
const TRIS = [
  [[8,34],[26,34],[50,88], "6f9fe0"],
  [[26,34],[50,34],[50,88], "9bc4f2"],
  [[50,34],[74,34],[50,88], "86b5ec"],
  [[74,34],[92,34],[50,88], "5f92db"],
  [[8,34],[26,12],[26,34], "86b5ec"],
  [[26,12],[50,34],[26,34], "a2caf5"],
  [[26,12],[74,12],[50,34], "bcdcff"],
  [[74,12],[74,34],[50,34], "a2caf5"],
  [[92,34],[74,12],[74,34], "86b5ec"],
];
const LINES = [
  [[26,12],[74,12]], [[74,12],[92,34]], [[92,34],[50,88]],
  [[50,88],[8,34]], [[8,34],[26,12]], [[8,34],[92,34]],
  [[26,12],[26,34]], [[74,12],[74,34]],
  [[26,34],[50,88]], [[50,34],[50,88]], [[74,34],[50,88]],
  [[26,12],[50,34]], [[74,12],[50,34]],
];
const INK = [27, 35, 51];
const STROKE = 2.0; // Linienbreite im 100er-Raster

// Abbildung 100x92 -> Bildfläche mit Rand
const PAD = 0.14;
const scale = (SIZE * (1 - 2 * PAD)) / 100;
const offX = SIZE * PAD, offY = (SIZE - 92 * scale) / 2;
const toPx = ([x, y]) => [(offX + x * scale) * SS, (offY + y * scale) * SS];

const hex = (h) => [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];

function inTri(px, py, a, b, c) {
  const s = (a[1]-c[1])*(px-c[0]) + (c[0]-a[0])*(py-c[1]);
  const t = (c[1]-b[1])*(px-c[0]) + (b[0]-c[0])*(py-c[1]);
  const d = (c[1]-b[1])*(a[0]-c[0]) + (b[0]-c[0])*(a[1]-c[1]);
  if (d === 0) return false;
  const u = s/d, v = t/d;
  return u >= 0 && v >= 0 && u + v <= 1;
}
function distSeg(px, py, p, q) {
  const dx = q[0]-p[0], dy = q[1]-p[1];
  const L = dx*dx + dy*dy;
  let t = L ? ((px-p[0])*dx + (py-p[1])*dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = p[0] + t*dx, cy = p[1] + t*dy;
  return Math.hypot(px-cx, py-cy);
}

// Rastern (supersampled)
const tris = TRIS.map(([a,b,c,col]) => [toPx(a), toPx(b), toPx(c), hex(col)]);
const lines = LINES.map(([p,q]) => [toPx(p), toPx(q)]);
const halfW = (STROKE * scale * SS) / 2;

const big = new Uint8Array(W * W * 3);
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const px = x + 0.5, py = y + 0.5;
    let col = BG;
    for (const [a,b,c,rgb] of tris) if (inTri(px,py,a,b,c)) { col = rgb; break; }
    for (const [p,q] of lines) if (distSeg(px,py,p,q) <= halfW) { col = INK; break; }
    const i = (y*W + x) * 3;
    big[i] = col[0]; big[i+1] = col[1]; big[i+2] = col[2];
  }
}

// Herunterrechnen (Kantenglättung)
const raw = Buffer.alloc(SIZE * (1 + SIZE*3));
for (let y = 0; y < SIZE; y++) {
  raw[y * (1 + SIZE*3)] = 0; // Filter 0
  for (let x = 0; x < SIZE; x++) {
    let r=0,g=0,b=0;
    for (let dy=0; dy<SS; dy++) for (let dx=0; dx<SS; dx++) {
      const i = ((y*SS+dy)*W + (x*SS+dx)) * 3;
      r+=big[i]; g+=big[i+1]; b+=big[i+2];
    }
    const n = SS*SS, o = y*(1+SIZE*3) + 1 + x*3;
    raw[o] = Math.round(r/n); raw[o+1] = Math.round(g/n); raw[o+2] = Math.round(b/n);
  }
}

// PNG schreiben
const CRC = (() => { const t=[]; for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  return (buf)=>{let c=0xFFFFFFFF;for(const b of buf)c=t[(c^b)&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};})();
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type,"ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(td));
  return Buffer.concat([len, td, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE,0); ihdr.writeUInt32BE(SIZE,4);
ihdr[8]=8; ihdr[9]=2; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0; // 8bit RGB
const png = Buffer.concat([
  Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);
writeFileSync(OUT, png);
console.log(`${OUT} — ${SIZE}x${SIZE}, ${Math.round(png.length/1024)} KB`);
