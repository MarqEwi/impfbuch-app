/*
 * Kopiert die Web-App aus dem Projektstamm nach www/ (Capacitor-webDir).
 *
 * Der Projektstamm bleibt die "Quelle der Wahrheit" und dient weiterhin der
 * Web-Version auf GitHub Pages. Bewusst NICHT kopiert wird sw.js — der
 * Service Worker läuft nur auf github.io, nicht in der nativen App
 * (die Registrierung in app.js prüft zusätzlich den Hostnamen).
 */
import { cpSync, rmSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const www = join(root, "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

// Einzeldateien
for (const f of ["index.html", "datenschutz.html"]) {
  copyFileSync(join(root, f), join(www, f));
}
// Ordner
for (const d of ["css", "js", "icons", "images"]) {
  cpSync(join(root, d), join(www, d), { recursive: true });
}

console.log("www/ aktualisiert (ohne sw.js — Service Worker nur im Web).");
