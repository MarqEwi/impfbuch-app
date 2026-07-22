/*
 * Zentraler Edition-Schalter (Vorbereitung für spätere Varianten).
 *
 * Aktuell gibt es genau EINE Edition: kostenlos, ohne Werbung, ohne Limits.
 * Wenn später Werbung + kaufbare werbefreie Version kommen, wird NUR hier
 * umgeschaltet — der restliche Code fragt ausschließlich window.EDITION ab
 * und enthält keine verstreuten Flags.
 */
window.EDITION = {
  // "free" | künftig z. B. "premium"
  flavor: "free",
  // Werbung anzeigen? (bewusst noch nirgends implementiert)
  adsEnabled: false,
  // Premium-Funktionen freigeschaltet? (bewusst noch nirgends implementiert)
  premium: false,
};
