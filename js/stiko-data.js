/*
 * STIKO-Impfschema (Standardimpfungen) — orientiert am Impfkalender der
 * Ständigen Impfkommission (RKI), Stand 2023/2024, plus Reise-/Berufsimpfungen.
 *
 * Wie im echten Impfausweis ist JEDE Krankheit eine eigene Zeile (z. B. Tetanus,
 * Pertussis, Poliomyelitis). Kombinationsimpfstoffe (6-fach, Tdap-IPV, MMRV …)
 * werden als Voreinstellung angeboten und füllen mehrere Zeilen auf einmal.
 *
 * Alle Altersangaben in MONATEN (Jahre * 12).
 *
 * Feld-Modell je Impfung:
 *   id, name, fullName, group, info
 *   series    Grundserie: [{ label, ageMonths, note }]
 *   booster   optional wiederkehrende Auffrischung { intervalYears, fromAgeMonths, label, note }
 *   annual    optional jährliche Impfung { fromAgeMonths, seasonNote }
 *   adultOnly true → erst im Erwachsenenalter relevant
 *   onDemand  true → Indikations-/Reiseimpfung: erzeugt KEINE Fälligkeit „aus dem
 *             Nichts". Erst wenn eine Serie begonnen wurde, wird an die Folgedosis
 *             erinnert. Ohne Eintrag Status „Bei Bedarf".
 *   riskNote  optional Hinweis zur Indikation
 */

const MONTH = 1;
const YEAR = 12;

const GROUPS = {
  basis: { label: "Grundimmunisierung (ab Säuglingsalter)", color: "#c0392b" },
  kind: { label: "Kindesalter", color: "#e67e22" },
  jugend: { label: "Jugendalter", color: "#8e44ad" },
  senior: { label: "Ab 60 Jahren", color: "#2c3e50" },
  indikation: { label: "Indikations-/Reiseimpfung", color: "#7f8c8d" },
  speziell: { label: "Spezielle Impfungen (Reise & Beruf)", color: "#6d4c41" },
};

// Standard-Grundserie eines Säuglings (2+1-Schema).
const INFANT_SERIES = [
  { label: "1. Dosis", ageMonths: 2 * MONTH },
  { label: "2. Dosis", ageMonths: 4 * MONTH },
  { label: "3. Dosis", ageMonths: 11 * MONTH },
];

const STIKO_SCHEDULE = [
  /* ---------------------------- Grundimmunisierung (ab Säuglingsalter) --- */
  {
    id: "rotaviren",
    name: "Rotaviren",
    fullName: "Rotavirus-Gastroenteritis (Schluckimpfung)",
    group: "basis",
    info: "Erste Dosis ab einem Alter von 6 Wochen, Impfserie früh abschließen.",
    series: [
      { label: "1. Dosis", ageMonths: 1.5 * MONTH, note: "ab 6 Wochen" },
      { label: "2. Dosis", ageMonths: 3 * MONTH },
      { label: "3. Dosis", ageMonths: 4 * MONTH, note: "je nach Impfstoff" },
    ],
  },
  {
    id: "tetanus",
    name: "Tetanus",
    fullName: "Wundstarrkrampf (Tetanus)",
    group: "basis",
    info: "Grundimmunisierung als Säugling, Auffrischungen im Kindes-/Jugendalter, danach alle 10 Jahre.",
    series: [
      { label: "1. Dosis", ageMonths: 2 * MONTH },
      { label: "2. Dosis", ageMonths: 4 * MONTH },
      { label: "3. Dosis", ageMonths: 11 * MONTH },
      { label: "Auffr. Vorschule", ageMonths: 5 * YEAR, note: "5–6 J. (Tdap)" },
      { label: "Auffr. Jugend", ageMonths: 9 * YEAR, note: "9–16 J. (Tdap-IPV)" },
    ],
    booster: {
      intervalYears: 10,
      fromAgeMonths: 18 * YEAR,
      label: "Auffrischung",
      note: "alle 10 Jahre (1× als Tdap)",
    },
  },
  {
    id: "diphtherie",
    name: "Diphtherie",
    fullName: "Diphtherie",
    group: "basis",
    info: "Grundimmunisierung als Säugling, Auffrischungen im Kindes-/Jugendalter, danach alle 10 Jahre.",
    series: [
      { label: "1. Dosis", ageMonths: 2 * MONTH },
      { label: "2. Dosis", ageMonths: 4 * MONTH },
      { label: "3. Dosis", ageMonths: 11 * MONTH },
      { label: "Auffr. Vorschule", ageMonths: 5 * YEAR, note: "5–6 J. (Tdap)" },
      { label: "Auffr. Jugend", ageMonths: 9 * YEAR, note: "9–16 J. (Tdap-IPV)" },
    ],
    booster: {
      intervalYears: 10,
      fromAgeMonths: 18 * YEAR,
      label: "Auffrischung",
      note: "alle 10 Jahre (1× als Tdap)",
    },
  },
  {
    id: "pertussis",
    name: "Pertussis (Keuchhusten)",
    fullName: "Keuchhusten (Pertussis)",
    group: "basis",
    info: "Grundimmunisierung als Säugling, Auffrischungen im Kindes-/Jugendalter; im Erwachsenenalter einmalig mit der nächsten Td-Auffrischung (als Tdap).",
    series: [
      { label: "1. Dosis", ageMonths: 2 * MONTH },
      { label: "2. Dosis", ageMonths: 4 * MONTH },
      { label: "3. Dosis", ageMonths: 11 * MONTH },
      { label: "Auffr. Vorschule", ageMonths: 5 * YEAR, note: "5–6 J. (Tdap)" },
      { label: "Auffr. Jugend", ageMonths: 9 * YEAR, note: "9–16 J. (Tdap-IPV)" },
    ],
  },
  {
    id: "poliomyelitis",
    name: "Poliomyelitis",
    fullName: "Kinderlähmung (Poliomyelitis)",
    group: "basis",
    info: "Grundimmunisierung als Säugling, Auffrischung im Jugendalter. Im Erwachsenenalter nur bei Reisen in Endemiegebiete auffrischen.",
    series: [
      { label: "1. Dosis", ageMonths: 2 * MONTH },
      { label: "2. Dosis", ageMonths: 4 * MONTH },
      { label: "3. Dosis", ageMonths: 11 * MONTH },
      { label: "Auffr. Jugend", ageMonths: 9 * YEAR, note: "9–16 J. (Tdap-IPV)" },
    ],
  },
  {
    id: "hib",
    name: "Haemophilus infl. b (Hib)",
    fullName: "Haemophilus influenzae Typ b",
    group: "basis",
    info: "Nur im Säuglingsalter nötig (Teil der 6-fach-Impfung).",
    series: INFANT_SERIES.map((d) => ({ ...d })),
  },
  {
    id: "hepatitis_b",
    name: "Hepatitis B",
    fullName: "Hepatitis B",
    group: "basis",
    info: "Bei Kindern in der 6-fach-Impfung enthalten; für Erwachsene mit erhöhtem Risiko nachholbar.",
    series: INFANT_SERIES.map((d) => ({ ...d })),
  },
  {
    id: "pneumokokken_kind",
    name: "Pneumokokken (Säugling)",
    fullName: "Pneumokokken-Konjugatimpfstoff (PCV)",
    group: "basis",
    info: "Grundimmunisierung im Säuglingsalter (2+1-Schema).",
    series: INFANT_SERIES.map((d) => ({ ...d })),
  },
  {
    id: "meningokokken_b",
    name: "Meningokokken B",
    fullName: "Meningokokken der Serogruppe B",
    group: "basis",
    info: "Seit 2024 als Standardimpfung empfohlen.",
    series: [
      { label: "1. Dosis", ageMonths: 2 * MONTH },
      { label: "2. Dosis", ageMonths: 4 * MONTH },
      { label: "3. Dosis", ageMonths: 12 * MONTH },
    ],
  },

  /* --------------------------------------------------------- Kindesalter -- */
  {
    id: "meningokokken_c",
    name: "Meningokokken C",
    fullName: "Meningokokken der Serogruppe C",
    group: "kind",
    info: "Einmalige Impfung ab dem 12. Lebensmonat.",
    series: [{ label: "1 Dosis", ageMonths: 12 * MONTH }],
  },
  {
    id: "mmr",
    name: "Masern-Mumps-Röteln",
    fullName: "Masern, Mumps, Röteln (MMR)",
    group: "kind",
    info: "Zwei Dosen; für nach 1970 Geborene ohne ausreichenden Schutz empfohlen.",
    series: [
      { label: "1. Dosis", ageMonths: 11 * MONTH },
      { label: "2. Dosis", ageMonths: 15 * MONTH, note: "Mindestabstand 4 Wochen" },
    ],
  },
  {
    id: "varizellen",
    name: "Varizellen",
    fullName: "Windpocken (Varizellen)",
    group: "kind",
    info: "Zwei Dosen, meist parallel zur MMR-Impfung.",
    series: [
      { label: "1. Dosis", ageMonths: 11 * MONTH },
      { label: "2. Dosis", ageMonths: 15 * MONTH },
    ],
  },

  /* --------------------------------------------------------- Jugendalter -- */
  {
    id: "hpv",
    name: "HPV",
    fullName: "Humane Papillomviren",
    group: "jugend",
    info: "Für alle Jugendlichen; 2 Dosen bei Beginn im Alter von 9–14 Jahren.",
    series: [
      { label: "1. Dosis", ageMonths: 9 * YEAR, note: "ab 9 Jahren" },
      { label: "2. Dosis", ageMonths: 9 * YEAR + 6 * MONTH, note: "Abstand 5 Monate" },
    ],
  },

  /* -------------------------------------------------------- Ab 60 Jahren -- */
  {
    id: "influenza",
    name: "Influenza (Grippe)",
    fullName: "Saisonale Influenza",
    group: "senior",
    info: "Jährlich für Personen ab 60 Jahren (Impfung im Herbst).",
    annual: { fromAgeMonths: 60 * YEAR, seasonNote: "am besten Okt.–Dez." },
    adultOnly: true,
  },
  {
    id: "pneumokokken_senior",
    name: "Pneumokokken (ab 60)",
    fullName: "Pneumokokken-Impfung im Alter",
    group: "senior",
    info: "Einmalige Impfung für Personen ab 60 Jahren.",
    series: [{ label: "1 Dosis", ageMonths: 60 * YEAR }],
    adultOnly: true,
  },
  {
    id: "herpes_zoster",
    name: "Herpes zoster (Gürtelrose)",
    fullName: "Herpes zoster — Totimpfstoff",
    group: "senior",
    info: "Zwei Dosen für Personen ab 60 Jahren (Abstand 2–6 Monate).",
    series: [
      { label: "1. Dosis", ageMonths: 60 * YEAR },
      { label: "2. Dosis", ageMonths: 60 * YEAR + 2 * MONTH, note: "Abstand 2–6 Monate" },
    ],
    adultOnly: true,
  },
  {
    id: "covid",
    name: "COVID-19",
    fullName: "COVID-19-Auffrischimpfung",
    group: "senior",
    info: "Jährliche Auffrischung für Personen ab 60 Jahren und Risikogruppen.",
    annual: { fromAgeMonths: 60 * YEAR, seasonNote: "meist im Herbst" },
    adultOnly: true,
  },

  /* ----------------------------------------------- Indikations-/Reise ---- */
  {
    id: "fsme",
    name: "FSME (Zecken)",
    fullName: "Frühsommer-Meningoenzephalitis",
    group: "indikation",
    info: "Bei Aufenthalt in Risikogebieten; nach Grundimmunisierung Auffrischung alle 3–5 Jahre.",
    series: [
      { label: "1. Dosis", ageMonths: 12 * MONTH },
      { label: "2. Dosis", ageMonths: 13 * MONTH, note: "Abstand 1–3 Monate" },
      { label: "3. Dosis", ageMonths: 17 * MONTH, note: "Abstand 5–12 Monate" },
    ],
    onDemand: true,
    riskNote: "Nur bei Aufenthalt in Risikogebieten empfohlen.",
  },
  {
    id: "hepatitis_a",
    name: "Hepatitis A",
    fullName: "Hepatitis A (Reise-/Indikationsimpfung)",
    group: "indikation",
    info: "Vor Reisen in Regionen mit erhöhtem Risiko; zweite Dosis für langjährigen Schutz.",
    series: [
      { label: "1. Dosis", ageMonths: 12 * MONTH },
      { label: "2. Dosis", ageMonths: 18 * MONTH, note: "Abstand 6–12 Monate" },
    ],
    onDemand: true,
    riskNote: "Keine allgemeine Standardimpfung — v. a. für Reisende und Risikogruppen.",
  },

  /* -------------------------------- Spezielle Impfungen (Reise & Beruf) -- */
  {
    id: "gelbfieber",
    name: "Gelbfieber",
    fullName: "Gelbfieber (Yellow Fever)",
    group: "speziell",
    info: "Für viele Länder Pflicht (Nachweis im gelben Ausweis). Meist lebenslanger Schutz nach einer Impfung; nur in zugelassenen Gelbfieber-Impfstellen.",
    series: [{ label: "1 Dosis", ageMonths: 9 * MONTH, note: "ab 9 Monaten" }],
    onDemand: true,
    riskNote: "Reise-/Pflichtimpfung für Endemiegebiete (Afrika, Südamerika).",
  },
  {
    id: "japanische_enzephalitis",
    name: "Japanische Enzephalitis",
    fullName: "Japanische Enzephalitis (JE)",
    group: "speziell",
    info: "Für Reisen in Endemiegebiete Asiens; Auffrischung vor erneuter Exposition.",
    series: [
      { label: "1. Dosis", ageMonths: 12 * MONTH },
      { label: "2. Dosis", ageMonths: 12 * MONTH + 1 * MONTH, note: "Abstand 28 Tage" },
    ],
    onDemand: true,
    riskNote: "Reiseimpfung für Asien/Pazifik.",
  },
  {
    id: "tollwut",
    name: "Tollwut",
    fullName: "Tollwut (Rabies) — präexpositionell",
    group: "speziell",
    info: "Vorsorgliche Impfung bei Reisen/Tätigkeiten mit Expositionsrisiko (3 Dosen).",
    series: [
      { label: "1. Dosis", ageMonths: 12 * MONTH },
      { label: "2. Dosis", ageMonths: 12 * MONTH + 0.25 * MONTH, note: "Tag 7" },
      { label: "3. Dosis", ageMonths: 12 * MONTH + 0.9 * MONTH, note: "Tag 21–28" },
    ],
    onDemand: true,
    riskNote: "Reise-/Berufsimpfung (z. B. Tierärzte, Endemiegebiete).",
  },
  {
    id: "typhus",
    name: "Typhus",
    fullName: "Typhus abdominalis",
    group: "speziell",
    info: "Reiseimpfung bei erhöhtem Risiko; Schutz ca. 3 Jahre, dann Auffrischung.",
    series: [{ label: "1 Dosis", ageMonths: 12 * MONTH }],
    onDemand: true,
    riskNote: "Reiseimpfung für Regionen mit mangelnder Hygiene.",
  },
  {
    id: "meningokokken_acwy",
    name: "Meningokokken ACWY",
    fullName: "Meningokokken der Serogruppen A, C, W, Y",
    group: "speziell",
    info: "Für Reisen (z. B. Pilgerreisen/Hadsch), Ausbrüche und bestimmte Tätigkeiten.",
    series: [{ label: "1 Dosis", ageMonths: 12 * MONTH }],
    onDemand: true,
    riskNote: "Reise-/Indikationsimpfung.",
  },
  {
    id: "cholera",
    name: "Cholera",
    fullName: "Cholera (Schluckimpfung)",
    group: "speziell",
    info: "Reiseimpfung bei erhöhtem Risiko (2 Dosen).",
    series: [
      { label: "1. Dosis", ageMonths: 12 * MONTH },
      { label: "2. Dosis", ageMonths: 12 * MONTH + 0.5 * MONTH, note: "Abstand 1–6 Wochen" },
    ],
    onDemand: true,
    riskNote: "Reiseimpfung für Risikogebiete.",
  },
];

/*
 * Kombinationsimpfungen — ein Klick hakt alle abgedeckten Krankheiten ab,
 * sodass nichts doppelt erfasst werden muss.
 */
const COMBINATIONS = [
  {
    id: "6fach",
    name: "6-fach",
    full: "Tetanus-Diphtherie-Keuchhusten-Polio-Hib-Hepatitis B",
    example: "z. B. Hexyon, Infanrix hexa",
    targets: [
      "tetanus",
      "diphtherie",
      "pertussis",
      "poliomyelitis",
      "hib",
      "hepatitis_b",
    ],
  },
  {
    id: "5fach",
    name: "5-fach",
    full: "Tetanus-Diphtherie-Keuchhusten-Polio-Hib",
    example: "z. B. Infanrix-IPV+Hib",
    targets: ["tetanus", "diphtherie", "pertussis", "poliomyelitis", "hib"],
  },
  {
    id: "tdap_ipv",
    name: "Tdap-IPV",
    full: "Tetanus-Diphtherie-Keuchhusten-Polio",
    example: "z. B. Boostrix Polio, Repevax",
    targets: ["tetanus", "diphtherie", "pertussis", "poliomyelitis"],
  },
  {
    id: "tdap",
    name: "Tdap",
    full: "Tetanus-Diphtherie-Keuchhusten",
    example: "z. B. Boostrix",
    targets: ["tetanus", "diphtherie", "pertussis"],
  },
  {
    id: "td",
    name: "Td",
    full: "Tetanus-Diphtherie",
    example: "z. B. Td-pur",
    targets: ["tetanus", "diphtherie"],
  },
  {
    id: "mmrv",
    name: "MMRV",
    full: "Masern-Mumps-Röteln-Windpocken",
    example: "z. B. Priorix-Tetra, ProQuad",
    targets: ["mmr", "varizellen"],
  },
  {
    id: "twinrix",
    name: "Hepatitis A+B",
    full: "Hepatitis A + Hepatitis B",
    example: "z. B. Twinrix",
    targets: ["hepatitis_a", "hepatitis_b"],
  },
];

// Altersbegrenzte Impfungen (nur im Säuglings-/Kleinkindalter): id → max. Alter
// in Jahren, ab dem ein Nachholen nicht mehr sinnvoll/möglich ist.
const INFANT_ONLY = {
  rotaviren: 1,
  hib: 5,
  pneumokokken_kind: 2,
};

// Nachhol-Hinweise fürs Info-Fenster.
const CATCHUP_NOTES = {
  rotaviren:
    "Nur im Säuglingsalter (bis ca. 6 Monate) möglich – später weder nötig noch nachholbar.",
  hib:
    "Bei gesunden Kindern über 5 Jahren und Erwachsenen in der Regel nicht mehr erforderlich.",
  pneumokokken_kind:
    "Säuglingsimpfung. Für Ältere ist die separate Pneumokokken-Impfung ab 60 Jahren vorgesehen.",
  tetanus:
    "Als Erwachsener jederzeit nachholbar: fehlende Dosen werden ergänzt, danach Auffrischung alle 10 Jahre.",
  diphtherie:
    "Als Erwachsener jederzeit nachholbar: fehlende Dosen werden ergänzt, danach Auffrischung alle 10 Jahre.",
  pertussis:
    "Wird im Erwachsenenalter einmalig mit der nächsten Tetanus-Diphtherie-Auffrischung (als Tdap) nachgeholt.",
  poliomyelitis:
    "Fehlende Grundimmunisierung nachholbar; sonst Auffrischung vor allem vor Reisen in Endemiegebiete.",
  hepatitis_b:
    "Bei fehlender Grundimmunisierung und erhöhtem Risiko nachholbar.",
  meningokokken_b:
    "Vor allem für Säuglinge/Kleinkinder und Risikogruppen; Nachholen bis ca. 5 Jahre.",
  meningokokken_c:
    "Einmalige Impfung; Nachholen bis zum 18. Geburtstag empfohlen.",
  mmr:
    "Für nach 1970 Geborene mit fehlendem oder unklarem Schutz: eine Impfung dringend nachholen (Masernschutz).",
  varizellen:
    "Nachholen für Ungeimpfte ohne durchgemachte Windpocken (z. B. vor Schwangerschaft, med. Personal).",
  hpv:
    "Nachholen bis zum 18. Geburtstag empfohlen; ein späterer Beginn bringt geringeren Nutzen.",
};

// Ungefähre Schutzdauer in Jahren (für die „Gültigkeit überwachen"-Funktion).
// Nur Impfungen mit sinnvoll überwachbarer, endlicher Schutzdauer.
const VALID_YEARS = {
  typhus: 3,
  gelbfieber: 10,
  japanische_enzephalitis: 3,
  tollwut: 2,
  meningokokken_acwy: 5,
  cholera: 2,
  fsme: 4,
  hepatitis_a: 20,
  poliomyelitis: 10,
  pneumokokken_senior: 6,
};

// Liefert die Kurzbezeichnung einer Impfung anhand ihrer ID.
function vaccineNameById(id) {
  const v = STIKO_SCHEDULE.find((x) => x.id === id);
  return v ? v.name : id;
}

// Für Import in app.js (klassische Skript-Einbindung ohne Module).
window.STIKO = {
  GROUPS,
  STIKO_SCHEDULE,
  COMBINATIONS,
  INFANT_ONLY,
  CATCHUP_NOTES,
  VALID_YEARS,
  vaccineNameById,
  MONTH,
  YEAR,
};
