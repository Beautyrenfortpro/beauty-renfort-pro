import { prestation } from "./catalogue";
import { estEligible } from "./conformite";
import { decompte, indemniteAnnulationInstitut } from "./prix";
import type { Centimes, Estheticienne, Mission, Motif } from "./types";

// Cycle de vie d'une mission (cahier des charges, section 4).
// Chaque fonction renvoie une NOUVELLE mission ou lève une erreur explicite :
// l'interface affiche ces messages tels quels.

export class ErreurMission extends Error {}

/** Délai laissé à l'institut pour contester une prestation déclarée réalisée. */
export const DELAI_CONTESTATION_HEURES = 48;

export interface NouvelleMission {
  institutId: string;
  motif: Motif;
  jours: string[];
  heureDebut: string;
  heureFin: string;
  pauseMinutes: number;
  prestations: string[];
  materielFourni: boolean;
  budgetHoraire: Centimes;
  dateLimiteReponse: string;
}

function debutMission(m: Pick<Mission, "jours" | "heureDebut">): Date {
  return new Date(`${m.jours[0]}T${m.heureDebut}:00`);
}

export function creerMission(d: NouvelleMission, id: string, maintenant: Date): Mission {
  if (d.jours.length === 0) throw new ErreurMission("Choisissez au moins un jour.");
  if (d.prestations.length === 0) throw new ErreurMission("Choisissez au moins une prestation.");
  d.prestations.forEach(prestation); // lève une erreur si une prestation est hors catalogue
  const jours = [...d.jours].sort();
  if (debutMission({ jours, heureDebut: d.heureDebut }) <= maintenant)
    throw new ErreurMission("La mission doit commencer dans le futur.");
  if (d.budgetHoraire <= 0) throw new ErreurMission("Indiquez un budget horaire.");
  decompte({ ...d, jours }, d.budgetHoraire); // vérifie la cohérence des horaires
  return {
    ...d,
    jours,
    id,
    statut: "publiee",
    propositions: [],
    estheticienneId: null,
    tarifRetenu: null,
    creeeLe: maintenant.toISOString(),
    confirmeeLe: null,
    declareeRealiseeLe: null,
    valideeLe: null,
    payeeLe: null,
    annulation: null,
  };
}

/**
 * L'esthéticienne accepte le budget ou contre-propose son propre tarif.
 * Elle reste libre : aucune obligation de répondre, aucune sanction en cas de refus.
 */
export function proposer(m: Mission, e: Estheticienne, tarifHoraire: Centimes, maintenant: Date): Mission {
  if (m.statut !== "publiee") throw new ErreurMission("Cette mission n'accepte plus de propositions.");
  if (new Date(m.dateLimiteReponse) < maintenant) throw new ErreurMission("La date limite de réponse est passée.");
  if (!estEligible(e, m, maintenant))
    throw new ErreurMission("Vos justificatifs ne couvrent pas toutes les prestations de cette mission.");
  if (!Number.isInteger(tarifHoraire) || tarifHoraire < 1000 || tarifHoraire > 20000)
    throw new ErreurMission("Le tarif doit être compris entre 10 € et 200 € de l'heure.");
  const autres = m.propositions.filter((p) => p.estheticienneId !== e.id);
  return {
    ...m,
    propositions: [...autres, { estheticienneId: e.id, tarifHoraire, creeeLe: maintenant.toISOString(), retiree: false }],
  };
}

export function retirerProposition(m: Mission, estheticienneId: string): Mission {
  if (m.statut !== "publiee") throw new ErreurMission("La mission est déjà attribuée.");
  return {
    ...m,
    propositions: m.propositions.map((p) => (p.estheticienneId === estheticienneId ? { ...p, retiree: true } : p)),
  };
}

/** L'institut choisit une proposition : le contrat de prestation est accepté par les deux parties. */
export function choisir(m: Mission, estheticienneId: string, maintenant: Date): Mission {
  if (m.statut !== "publiee") throw new ErreurMission("Cette mission est déjà attribuée ou terminée.");
  const p = m.propositions.find((x) => x.estheticienneId === estheticienneId && !x.retiree);
  if (!p) throw new ErreurMission("Cette proposition n'existe plus.");
  if (debutMission(m) <= maintenant) throw new ErreurMission("La mission a déjà commencé.");
  return { ...m, statut: "confirmee", estheticienneId, tarifRetenu: p.tarifHoraire, confirmeeLe: maintenant.toISOString() };
}

export function declarerRealisee(m: Mission, estheticienneId: string, maintenant: Date): Mission {
  if (m.statut !== "confirmee") throw new ErreurMission("Seule une mission confirmée peut être déclarée réalisée.");
  if (m.estheticienneId !== estheticienneId) throw new ErreurMission("Cette mission ne vous est pas attribuée.");
  if (debutMission(m) > maintenant) throw new ErreurMission("La mission n'a pas encore commencé.");
  return { ...m, statut: "realisee", declareeRealiseeLe: maintenant.toISOString() };
}

export function valider(m: Mission, maintenant: Date): Mission {
  if (m.statut !== "realisee") throw new ErreurMission("Rien à valider pour cette mission.");
  return { ...m, statut: "validee", valideeLe: maintenant.toISOString() };
}

/** Sans contestation dans les 48 h, la prestation est validée automatiquement. */
export function validationAutomatique(m: Mission, maintenant: Date): Mission {
  if (m.statut !== "realisee" || !m.declareeRealiseeLe) return m;
  const limite = new Date(m.declareeRealiseeLe).getTime() + DELAI_CONTESTATION_HEURES * 3_600_000;
  return maintenant.getTime() >= limite ? valider(m, maintenant) : m;
}

export function contester(m: Mission): Mission {
  if (m.statut !== "realisee") throw new ErreurMission("Seule une prestation déclarée réalisée peut être contestée.");
  return { ...m, statut: "litige" };
}

/** Paiement simulé dans la démo ; branché sur Stripe Connect plus tard. */
export function marquerPayee(m: Mission, maintenant: Date): Mission {
  if (m.statut !== "validee") throw new ErreurMission("La mission doit être validée avant le paiement.");
  return { ...m, statut: "payee", payeeLe: maintenant.toISOString() };
}

export function annuler(m: Mission, par: "institut" | "estheticienne", maintenant: Date): Mission {
  if (m.statut === "publiee") {
    if (par === "estheticienne") throw new ErreurMission("Retirez simplement votre proposition.");
    return { ...m, statut: "annulee", annulation: { par, le: maintenant.toISOString(), indemnite: 0 } };
  }
  if (m.statut !== "confirmee") throw new ErreurMission("Cette mission ne peut plus être annulée.");
  if (par === "estheticienne") {
    // Gratuit pour l'esthéticienne ; la mission est republiée en priorité pour l'institut.
    return {
      ...m,
      statut: "publiee",
      estheticienneId: null,
      tarifRetenu: null,
      confirmeeLe: null,
      propositions: m.propositions.filter((p) => p.estheticienneId !== m.estheticienneId),
    };
  }
  const montant = decompte(m, m.tarifRetenu!).montantPrestation;
  const indemnite = indemniteAnnulationInstitut(montant, debutMission(m), maintenant);
  return { ...m, statut: "annulee", annulation: { par, le: maintenant.toISOString(), indemnite } };
}

export function expirerSiBesoin(m: Mission, maintenant: Date): Mission {
  if (m.statut === "publiee" && (new Date(m.dateLimiteReponse) < maintenant || debutMission(m) <= maintenant))
    return { ...m, statut: "expiree" };
  return m;
}

/** Ce que l'esthéticienne touche (ou a touché) pour cette mission. */
export function montantEstheticienne(m: Mission): Centimes {
  if (m.tarifRetenu === null) return 0;
  return decompte(m, m.tarifRetenu).montantPrestation;
}

export const LIBELLES_STATUT: Record<Mission["statut"], string> = {
  publiee: "Publiée",
  confirmee: "Confirmée",
  realisee: "À valider",
  validee: "Validée",
  payee: "Payée",
  litige: "En litige",
  annulee: "Annulée",
  expiree: "Expirée",
};
