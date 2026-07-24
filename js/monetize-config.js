/*
 * Zentrale Konfiguration für Werbung (AdMob) und Premium-Kauf.
 *
 * WICHTIG (Learning C10): Während der Entwicklung IMMER Test-IDs verwenden.
 * Erst ganz zum Schluss ADS_TESTING auf false setzen und die echten IDs
 * eintragen. Niemals die eigenen (Test-)Anzeigen anklicken (Learning C13).
 */
window.MONETIZE = {
  /* ------------------------------------------------------------- Werbung */
  // true = Google-Test-Anzeigen. Zum Schluss auf false umstellen.
  ADS_TESTING: true,

  // AdMob-App-ID kommt ins AndroidManifest (Learning C9), NICHT hierher.
  //   Test-App-ID:  ca-app-pub-3940256099942544~3347511713
  //   Echte App-ID: <deine App-ID>  → im Manifest eintragen

  // Banner-Anzeigenblock-IDs (Android)
  BANNER_ID_TEST: "ca-app-pub-3940256099942544/6300978111",
  BANNER_ID_REAL: "", // TODO: echte Banner-ID hier eintragen

  bannerId() {
    return this.ADS_TESTING ? this.BANNER_ID_TEST : this.BANNER_ID_REAL;
  },

  /* -------------------------------------------------------- Premium-Kauf */
  // Produkt-ID (unveränderbar, muss exakt der Play-Console-Eingabe entsprechen,
  // Learning E20). Unterstrich erlaubt.
  PRODUCT_ID: "premium_unlock",
  // Kaufoptions-ID (nur Kleinbuchstaben/Ziffern/Bindestrich, KEIN Unterstrich).
  PRODUCT_OFFER_ID: "premium-unlock",
  // Anzeigepreis, falls der Store (noch) keinen echten Preis liefert.
  PRICE_FALLBACK: "2,99 €",

  /* ----------------------------------------------------------- Diagnose */
  // Statuszeile in „Über diese App" anzeigen. Vor Release auf false.
  DIAG: true,
};
