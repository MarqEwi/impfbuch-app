/*
 * Brücke zwischen Web-App und nativer Capacitor-App.
 *
 * Grundsatz: Die App fragt IMMER window.NativeBridge — die Brücke entscheidet
 * per Feature-Detection, ob der native Weg (Capacitor-Plugins) oder das
 * bisherige Browser-Verhalten genutzt wird. So bleibt die Web-Version auf
 * GitHub Pages unverändert funktionsfähig.
 *
 * Nativ laufen Datei-Exporte über @capacitor/filesystem (Cache-Verzeichnis)
 * plus @capacitor/share (Teilen-Dialog) — a.download und window.print()
 * funktionieren im Android-WebView nicht zuverlässig.
 *
 * Hinweis Drucken: Die Impfbuch-App hat aktuell keine Druckfunktion. Sollte
 * eine dazukommen, gehört sie ebenfalls HIER hinein (natives Printer-Plugin,
 * im Browser window.print()).
 */
(function () {
  "use strict";

  function isNative() {
    return !!(
      window.Capacitor &&
      typeof window.Capacitor.isNativePlatform === "function" &&
      window.Capacitor.isNativePlatform()
    );
  }

  // Speichert/teilt eine Textdatei (z. B. JSON-Export).
  // Nativ: in den App-Cache schreiben und den Teilen-Dialog öffnen
  // (Nutzer wählt Ziel: Dateien, Drive, Mail …). Web: klassischer Download.
  async function saveTextFile(filename, text, mimeType) {
    if (isNative()) {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const result = await Filesystem.writeFile({
        path: filename,
        data: text,
        directory: "CACHE",
        encoding: "utf8",
      });
      await Share.share({
        title: filename,
        url: result.uri,
      });
      return;
    }
    // Browser-Fallback: bisheriges Verhalten
    const blob = new Blob([text], { type: mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* Binärdatei (z. B. PDF), Inhalt als Base64. `modus` entscheidet:
     "share" öffnet den Teilen-Dialog, "download" legt die Datei ab.
     Nativ: Capacitor schreibt Base64 ohne encoding-Angabe direkt binär —
     zum Speichern in DOCUMENTS (dort findet der Nutzer sie wieder), zum
     Teilen in den CACHE (Wegwerf-Kopie für die Ziel-App). Im Browser gibt
     es in beiden Fällen den Blob-Download; die Web-Share-API kann keine
     Dateien aus dem Speicher heraus zuverlässig weiterreichen. */
  async function saveBinaryFile(filename, base64, mimeType, modus) {
    if (isNative()) {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      if (modus === "download") {
        const result = await Filesystem.writeFile({
          path: filename,
          data: base64,
          directory: "DOCUMENTS",
          recursive: true,
        });
        return { gespeichertUnter: result.uri };
      }
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: "CACHE",
      });
      await Share.share({ title: filename, url: result.uri });
      return {};
    }
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType || "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return {};
  }

  window.NativeBridge = { isNative, saveTextFile, saveBinaryFile };
})();
