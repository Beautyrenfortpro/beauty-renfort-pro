import type { Centimes } from "./types";

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
const eurosRonds = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function formatEuros(c: Centimes): string {
  return c % 100 === 0 ? eurosRonds.format(c / 100) : euros.format(c / 100);
}

const jourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const jourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

function d(iso: string): Date {
  return iso.length === 10 ? new Date(`${iso}T12:00:00`) : new Date(iso);
}

export function formatJourCourt(iso: string): string {
  return jourCourt.format(d(iso));
}

export function formatJourLong(iso: string): string {
  const s = jourLong.format(d(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « Mardi 3 novembre » ou « mar. 3 au jeu. 5 nov. » */
export function formatPlageJours(jours: string[]): string {
  if (jours.length === 1) return formatJourLong(jours[0]);
  const debut = formatJourCourt(jours[0]);
  const fin = formatJourCourt(jours[jours.length - 1]);
  const s = `${debut} au ${fin}`;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** « 9 h – 18 h » ou « 9 h 30 – 18 h » */
export function formatHoraires(debut: string, fin: string): string {
  const f = (hhmm: string) => {
    const [h, m] = hhmm.split(":");
    return m === "00" ? `${Number(h)} h` : `${Number(h)} h ${m}`;
  };
  return `${f(debut)} – ${f(fin)}`;
}

export function formatHeures(h: number): string {
  return Number.isInteger(h) ? `${h} h` : `${h.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`;
}

export function isoJour(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const j = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${j}`;
}

export function ajouterJours(date: Date, n: number): Date {
  const r = new Date(date);
  r.setDate(r.getDate() + n);
  return r;
}

export function initiales(prenom: string, nomInitiale: string): string {
  return `${prenom.charAt(0)}${nomInitiale.charAt(0)}`.toUpperCase();
}
