import { useSyncExternalStore } from "react";
import * as M from "../domain/missions";
import type { NouvelleMission } from "../domain/missions";
import { ajouterJours, isoJour } from "../domain/format";
import type { Centimes, Estheticienne, Mission } from "../domain/types";
import { etatInitial, type Etat } from "./seed";

// Stockage de la démo : tout reste dans le navigateur (localStorage).
// Quand Supabase sera branché, seules ces fonctions changeront : les écrans,
// eux, continueront d'appeler les mêmes actions.

const CLE = "beauty-renfort-pro:demo:v1";

function charger(): Etat {
  try {
    const brut = localStorage.getItem(CLE);
    if (brut) {
      const e = JSON.parse(brut) as Etat;
      if (e.version === 1) return e;
    }
  } catch {
    /* stockage indisponible : on repart de zéro */
  }
  return etatInitial(new Date());
}

let etat: Etat = typeof window === "undefined" ? etatInitial(new Date()) : charger();
const abonnes = new Set<() => void>();

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    /* navigation privée : la démo fonctionne sans sauvegarde */
  }
}

export function maintenant(e: Etat = etat): Date {
  return new Date(Date.now() + e.decalageHeures * 3_600_000);
}

/** Tâches automatiques : expiration, validation après 48 h, paiement simulé. */
function entretien(e: Etat): Etat {
  const t = maintenant(e);
  const missions = e.missions.map((m) => {
    let r = M.expirerSiBesoin(m, t);
    r = M.validationAutomatique(r, t);
    if (r.statut === "validee") r = M.marquerPayee(r, t); // virement simulé
    return r;
  });
  return { ...e, missions };
}

function changer(f: (e: Etat) => Etat) {
  etat = entretien(f(etat));
  sauver();
  abonnes.forEach((a) => a());
}

etat = entretien(etat);

export function useEtat(): Etat {
  return useSyncExternalStore(
    (cb) => {
      abonnes.add(cb);
      return () => abonnes.delete(cb);
    },
    () => etat,
  );
}

function majMission(id: string, f: (m: Mission, t: Date) => Mission) {
  changer((e) => {
    const t = maintenant(e);
    return { ...e, missions: e.missions.map((m) => (m.id === id ? f(m, t) : m)) };
  });
}

function esthe(e: Etat, id: string): Estheticienne {
  const r = e.estheticiennes.find((x) => x.id === id);
  if (!r) throw new Error("Esthéticienne introuvable");
  return r;
}

export const actions = {
  publier(d: Omit<NouvelleMission, "institutId">): string {
    const id = `mission-${Date.now().toString(36)}`;
    changer((e) => ({
      ...e,
      missions: [M.creerMission({ ...d, institutId: e.institut.id }, id, maintenant(e)), ...e.missions],
    }));
    return id;
  },
  proposer(missionId: string, tarif: Centimes) {
    majMission(missionId, (m, t) => M.proposer(m, esthe(etat, etat.moiId), tarif, t));
  },
  retirer(missionId: string) {
    majMission(missionId, (m) => M.retirerProposition(m, etat.moiId));
  },
  choisir(missionId: string, estheticienneId: string) {
    majMission(missionId, (m, t) => M.choisir(m, estheticienneId, t));
  },
  declarerRealisee(missionId: string) {
    majMission(missionId, (m, t) => M.declarerRealisee(m, etat.moiId, t));
  },
  valider(missionId: string) {
    majMission(missionId, (m, t) => M.valider(m, t));
  },
  contester(missionId: string) {
    majMission(missionId, (m) => M.contester(m));
  },
  annuler(missionId: string, par: "institut" | "estheticienne") {
    majMission(missionId, (m, t) => M.annuler(m, par, t));
  },
  basculerDisponibilite() {
    changer((e) => ({
      ...e,
      estheticiennes: e.estheticiennes.map((x) => (x.id === e.moiId ? { ...x, disponible: !x.disponible } : x)),
    }));
  },
  /** Démo : simule le dépôt d'une nouvelle attestation URSSAF, valable 6 mois. */
  renouvelerUrssaf() {
    changer((e) => ({
      ...e,
      estheticiennes: e.estheticiennes.map((x) =>
        x.id === e.moiId
          ? {
              ...x,
              justificatifs: {
                ...x.justificatifs,
                urssaf: { verifie: true, expireLe: isoJour(ajouterJours(maintenant(e), 182)) },
              },
            }
          : x,
      ),
    }));
  },
  avancerTemps(heures: number) {
    changer((e) => ({ ...e, decalageHeures: e.decalageHeures + heures }));
  },
  reinitialiser() {
    changer(() => etatInitial(new Date()));
  },
};

/** Exécute une action et renvoie le message d'erreur à afficher, le cas échéant. */
export function essayer(f: () => void): string | null {
  try {
    f();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Une erreur est survenue.";
  }
}
