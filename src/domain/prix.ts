import type { Centimes, Mission } from "./types";

/** Frais de service payés par l'institut, en pourcentage du montant de la prestation. */
export const TAUX_FRAIS_SERVICE = 0.15;

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) throw new Error(`Heure invalide : ${hhmm}`);
  return h * 60 + m;
}

/** Minutes travaillées par jour, pause déduite. */
export function minutesParJour(m: Pick<Mission, "heureDebut" | "heureFin" | "pauseMinutes">): number {
  const duree = minutes(m.heureFin) - minutes(m.heureDebut) - m.pauseMinutes;
  if (duree <= 0) throw new Error("L'heure de fin doit être après l'heure de début, pause comprise.");
  return duree;
}

export function heuresTotales(m: Pick<Mission, "jours" | "heureDebut" | "heureFin" | "pauseMinutes">): number {
  return (minutesParJour(m) * m.jours.length) / 60;
}

export interface Decompte {
  heures: number;
  tarifHoraire: Centimes;
  /** Ce que reçoit l'esthéticienne : 100 % de son tarif. */
  montantPrestation: Centimes;
  /** Commission de la plateforme, payée par l'institut. */
  fraisService: Centimes;
  /** Total débité à l'institut. */
  total: Centimes;
}

export function decompte(
  m: Pick<Mission, "jours" | "heureDebut" | "heureFin" | "pauseMinutes">,
  tarifHoraire: Centimes,
): Decompte {
  if (!Number.isInteger(tarifHoraire) || tarifHoraire <= 0) throw new Error("Tarif horaire invalide.");
  const heures = heuresTotales(m);
  const montantPrestation = Math.round(heures * tarifHoraire);
  const fraisService = Math.round(montantPrestation * TAUX_FRAIS_SERVICE);
  return { heures, tarifHoraire, montantPrestation, fraisService, total: montantPrestation + fraisService };
}

/**
 * Indemnité due à l'esthéticienne quand l'institut annule une mission confirmée.
 * Plus de 48 h avant : gratuit. Entre 48 h et 24 h : 25 %. Moins de 24 h : 50 %.
 * Montants à valider (cahier des charges, section 4).
 */
export function indemniteAnnulationInstitut(montantPrestation: Centimes, debutMission: Date, maintenant: Date): Centimes {
  const heuresAvant = (debutMission.getTime() - maintenant.getTime()) / 3_600_000;
  if (heuresAvant > 48) return 0;
  if (heuresAvant > 24) return Math.round(montantPrestation * 0.25);
  return Math.round(montantPrestation * 0.5);
}
