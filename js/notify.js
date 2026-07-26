/*
 * Impf-Erinnerungen — eine Schnittstelle, zwei Wege.
 *
 * NATIV (Android-App): @capacitor/local-notifications. Die App PLANT echte
 *   Benachrichtigungen im Voraus auf die bekannten Fälligkeitstermine. Sie
 *   kommen deshalb auch, wenn die App monatelang nicht geöffnet wurde — das
 *   ist der eigentliche Zweck einer Impf-Erinnerung.
 *
 * WEB (GitHub Pages): wie bisher Service Worker + Periodic Background Sync
 *   (nur installierte Chromium-PWAs) plus Hinweis beim Öffnen der App.
 *
 * WICHTIG: In der nativen App gibt es KEINEN Service Worker. Früher wurde hier
 * `navigator.serviceWorker.ready` abgewartet — das löst sich ohne Registrierung
 * NIE auf und ließ die Aktivierung hängen. Alle SW-Zugriffe laufen daher jetzt
 * über readyRegistration() mit Zeitlimit.
 */
(function () {
  "use strict";

  // Uhrzeit der geplanten Erinnerungen (lokal).
  const HOUR = 9;
  // Android/AlarmManager: nicht unbegrenzt viele Alarme planen.
  const MAX_SCHEDULED = 32;
  /*
   * Planungshorizont in Monaten. Termine, die weiter in der Zukunft liegen
   * (z. B. die Ab-60-Impfungen eines Kleinkinds — über 50 Jahre!), werden
   * NICHT eingeplant: So weit reichende Alarme überleben kein Gerät und
   * würden nur Plätze belegen. Die App plant bei jedem Start neu, dadurch
   * rutschen ferne Termine automatisch rechtzeitig in den Horizont.
   */
  const HORIZON_MONTHS = 24;

  function isNative() {
    return !!(window.NativeBridge && window.NativeBridge.isNative());
  }
  function plugin() {
    return (
      (window.Capacitor &&
        window.Capacitor.Plugins &&
        window.Capacitor.Plugins.LocalNotifications) ||
      null
    );
  }

  // Service-Worker-Registrierung mit Zeitlimit — verhindert das alte Hängen.
  async function readyRegistration(timeoutMs) {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const existing = await navigator.serviceWorker.getRegistration();
      if (!existing) return null; // nativ: gar kein SW → sofort raus
      return await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((r) => setTimeout(() => r(null), timeoutMs || 3000)),
      ]);
    } catch (e) {
      return null;
    }
  }

  const Notify = {
    /* ---------------------------------------------------------------- Start */

    // Legt den Android-Benachrichtigungskanal an (ab Android 8 Pflicht, damit
    // Meldungen überhaupt erscheinen und Nutzer sie gezielt einstellen können).
    async init() {
      if (!isNative()) return;
      const LN = plugin();
      if (!LN || !LN.createChannel) return;
      try {
        await LN.createChannel({
          id: "impf-erinnerungen",
          name: "Impf-Erinnerungen",
          description: "Erinnert an fällige Impfungen",
          importance: 4, // hoch — erscheint als Einblendung
          visibility: 1,
        });
      } catch (e) {
        /* Kanal evtl. schon vorhanden — nicht kritisch */
      }
    },

    /* ------------------------------------------------------- Berechtigung */

    // Fragt die Berechtigung an. Liefert "granted" | "denied" | "unsupported".
    async requestPermission() {
      if (isNative()) {
        const LN = plugin();
        if (!LN) return "unsupported";
        try {
          const res = await LN.requestPermissions();
          return res && res.display === "granted" ? "granted" : "denied";
        } catch (e) {
          return "denied";
        }
      }
      if (!("Notification" in window)) return "unsupported";
      try {
        const perm = await Notification.requestPermission();
        return perm === "granted" ? "granted" : "denied";
      } catch (e) {
        return "denied";
      }
    },

    async hasPermission() {
      if (isNative()) {
        const LN = plugin();
        if (!LN) return false;
        try {
          const res = await LN.checkPermissions();
          return !!res && res.display === "granted";
        } catch (e) {
          return false;
        }
      }
      return "Notification" in window && Notification.permission === "granted";
    },

    /* ------------------------------------------------- Erinnerungen planen */

    /*
     * Plant alle Erinnerungen neu.
     * `items`: [{ profile, vaccine, dueDate:"YYYY-MM-DD", status }]
     * Rückgabe: { scheduled:Anzahl, mode:"geplant"|"beim Öffnen"|"aus" }
     */
    async schedule(items) {
      if (isNative()) return this.scheduleNative(items || []);
      const bg = await this.registerPeriodicSync();
      return { scheduled: 0, mode: bg ? "geplant" : "beim Öffnen" };
    },

    async scheduleNative(items) {
      const LN = plugin();
      if (!LN) return { scheduled: 0, mode: "aus" };
      try {
        // Erst alle bisherigen Planungen der App entfernen (Datenstand kann
        // sich geändert haben), dann frisch planen.
        await this.cancelAll();

        const groups = groupByDate(items);
        const list = [];
        let id = 1000;
        for (const g of groups.slice(0, MAX_SCHEDULED)) {
          list.push({
            id: id++,
            title: "Impfbuch — Impfung fällig",
            body: bodyFor(g),
            schedule: { at: g.at, allowWhileIdle: true },
            smallIcon: "ic_launcher",
            channelId: "impf-erinnerungen",
          });
        }
        if (!list.length) return { scheduled: 0, mode: "geplant" };
        await LN.schedule({ notifications: list });
        return { scheduled: list.length, mode: "geplant" };
      } catch (e) {
        console.warn("Erinnerungen planen fehlgeschlagen:", e);
        return { scheduled: 0, mode: "aus" };
      }
    },

    async cancelAll() {
      if (isNative()) {
        const LN = plugin();
        if (!LN) return;
        try {
          const pending = await LN.getPending();
          if (pending && pending.notifications && pending.notifications.length) {
            await LN.cancel({ notifications: pending.notifications });
          }
        } catch (e) {
          /* nicht kritisch */
        }
        return;
      }
      // Web: geplante Sync-Registrierung entfernen
      try {
        const reg = await readyRegistration(2000);
        if (reg && reg.periodicSync) await reg.periodicSync.unregister("impf-check");
      } catch (e) {
        /* nicht kritisch */
      }
    },

    // Nur Web: Periodic Background Sync (installierte Chromium-PWA).
    async registerPeriodicSync() {
      try {
        const reg = await readyRegistration(3000);
        if (!reg || !("periodicSync" in reg)) return false;
        const status = await navigator.permissions.query({
          name: "periodic-background-sync",
        });
        if (status.state !== "granted") return false;
        await reg.periodicSync.register("impf-check", {
          minInterval: 24 * 60 * 60 * 1000,
        });
        return true;
      } catch (e) {
        return false;
      }
    },

    /* --------------------------------------------------- Sofortige Meldung */

    // Zeigt jetzt eine Meldung (z. B. überfällige Impfungen beim App-Start).
    async showNow(title, body) {
      if (isNative()) {
        const LN = plugin();
        if (!LN) return false;
        try {
          await LN.schedule({
            notifications: [
              {
                id: 1,
                title: title,
                body: body,
                channelId: "impf-erinnerungen",
                smallIcon: "ic_launcher",
              },
            ],
          });
          return true;
        } catch (e) {
          return false;
        }
      }
      // Web: über den Service Worker (Notification-Konstruktor ist auf
      // Android-Chrome nicht erlaubt).
      try {
        if (!("Notification" in window) || Notification.permission !== "granted")
          return false;
        const reg = await readyRegistration(2000);
        const opts = {
          body: body,
          icon: "icons/icon-192.png",
          badge: "icons/icon-192.png",
          tag: "impf-due",
        };
        if (reg && reg.showNotification) {
          await reg.showNotification(title, opts);
          return true;
        }
        new Notification(title, opts);
        return true;
      } catch (e) {
        return false;
      }
    },
  };

  /* ------------------------------------------------------------- Helfer */

  // Fällige Impfungen nach Datum bündeln → eine Meldung pro Tag statt Spam.
  function groupByDate(items) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const map = new Map();

    for (const it of items) {
      if (!it || !it.dueDate) continue;
      const at = atHour(it.dueDate);
      if (!at) continue;
      // Vergangene Termine: nicht in die Vergangenheit planen. Überfällige
      // werden gesammelt auf morgen gelegt (einmalige Nachfassung).
      const key = at.getTime() <= Date.now() ? tomorrowKey() : it.dueDate;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(it);
    }

    const horizon = new Date();
    horizon.setMonth(horizon.getMonth() + HORIZON_MONTHS);

    return [...map.entries()]
      .map(([date, list]) => ({ date, at: atHour(date), list }))
      .filter(
        (g) =>
          g.at && g.at.getTime() > Date.now() && g.at.getTime() <= horizon.getTime()
      )
      .sort((a, b) => a.at - b.at);
  }

  function atHour(isoDate) {
    const parts = String(isoDate).split("-");
    if (parts.length !== 3) return null;
    const d = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2]),
      HOUR,
      0,
      0,
      0
    );
    return isNaN(d.getTime()) ? null : d;
  }

  function tomorrowKey() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  function bodyFor(group) {
    const names = group.list
      .map((i) => `${i.vaccine} (${i.profile})`)
      .slice(0, 3)
      .join(", ");
    const more = group.list.length > 3 ? " …" : "";
    return group.list.length === 1
      ? `${names} ist fällig.`
      : `${group.list.length} Impfungen anstehend: ${names}${more}`;
  }

  window.Notify = Notify;
})();
