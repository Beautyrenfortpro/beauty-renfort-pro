import { prestation } from "./catalogue";
import type { Centimes, Estheticienne, Exigence, Justificatif, Mission } from "./types";

export function justificatifValide(j: Justificatif | null, a: Date): boolean {
  if (!j || !j.verifie) return false;
  if (j.expireLe === null) return true;
  return new Date(j.expireLe).getTime() >= a.getTime();
}

/** Jours restants avant expiration (négatif si expiré, null si sans expiration ou absent). */
export function joursAvantExpiration(j: Justificatif | null, a: Date): number | null {
  if (!j || j.expireLe === null) return null;
  return Math.floor((new Date(j.expireLe).getTime() - a.getTime()) / 86_400_000);
}

export type Manque =
  | "identite"
  | "siret"
  | "assurance"
  | "urssaf"
  | "diplome"
  | "formation_lumiere_pulsee"
  | "declaration_ars";

export const LIBELLES_MANQUES: Record<Manque, string> = {
  identite: "Identité vérifiée",
  siret: "SIRET actif",
  assurance: "Assurance RC professionnelle",
  urssaf: "Attestation de vigilance URSSAF",
  diplome: "Diplôme d'esthétique",
  formation_lumiere_pulsee: "Attestation de formation lumière pulsée et laser",
  declaration_ars: "Déclaration ARS et formation à l'hygiène",
};

/** Justificatifs obligatoires pour toute mission, quelles que soient les prestations. */
export function manquesDeBase(e: Estheticienne, a: Date): Manque[] {
  const j = e.justificatifs;
  const manques: Manque[] = [];
  if (!justificatifValide(j.identite, a)) manques.push("identite");
  if (!justificatifValide(j.siret, a)) manques.push("siret");
  if (!justificatifValide(j.assurance, a)) manques.push("assurance");
  if (!justificatifValide(j.urssaf, a)) manques.push("urssaf");
  return manques;
}

function justificatifPour(e: Estheticienne, ex: Exigence): Justificatif | null {
  switch (ex) {
    case "diplome":
      return e.justificatifs.diplome;
    case "formation_lumiere_pulsee":
      return e.justificatifs.formationLumierePulsee;
    case "declaration_ars":
      return e.justificatifs.declarationArs;
  }
}

/** Tout ce qui manque pour réaliser ces prestations à cette date. Vide = éligible. */
export function manquesPourPrestations(e: Estheticienne, prestations: string[], a: Date): Manque[] {
  const manques = new Set<Manque>(manquesDeBase(e, a));
  for (const id of prestations) {
    for (const ex of prestation(id).exigences) {
      if (!justificatifValide(justificatifPour(e, ex), a)) manques.add(ex);
    }
  }
  return [...manques];
}

/**
 * Une esthéticienne ne voit une mission que si ses justificatifs couvrent toutes
 * les prestations, sont valides jusqu'au dernier jour, et qu'elle est disponible.
 */
export function estEligible(e: Estheticienne, m: Pick<Mission, "prestations" | "jours">, maintenant: Date): boolean {
  if (!e.disponible) return false;
  const dernierJour = new Date(`${m.jours[m.jours.length - 1]}T23:59:59`);
  const reference = dernierJour > maintenant ? dernierJour : maintenant;
  return manquesPourPrestations(e, m.prestations, reference).length === 0;
}

/** Seuil de l'obligation de vigilance du donneur d'ordre (article L8222-1 du Code du travail). */
export const SEUIL_VIGILANCE: Centimes = 500_000;

export type NiveauVigilance = "aucun" | "approche" | "atteint";

/**
 * Montant HT versé par un institut à une esthéticienne sur l'année civile.
 * Au-delà de 5 000 € HT, l'institut doit détenir son attestation URSSAF (renouvelée tous les 6 mois).
 */
export function vigilance(
  missions: Mission[],
  institutId: string,
  estheticienneId: string,
  annee: number,
  montantDe: (m: Mission) => Centimes,
): { cumul: Centimes; niveau: NiveauVigilance } {
  const cumul = missions
    .filter(
      (m) =>
        m.institutId === institutId &&
        m.estheticienneId === estheticienneId &&
        (m.statut === "payee" || m.statut === "validee") &&
        new Date(m.jours[0]).getFullYear() === annee,
    )
    .reduce((s, m) => s + montantDe(m), 0);
  const niveau: NiveauVigilance = cumul >= SEUIL_VIGILANCE ? "atteint" : cumul >= SEUIL_VIGILANCE * 0.8 ? "approche" : "aucun";
  return { cumul, niveau };
}

/**
 * Indice de dépendance économique (risque de requalification en salariat) :
 * part des revenus d'une esthéticienne venant d'un même institut sur les 90 derniers jours.
 * Alerte interne au-delà de 80 % avec au moins 4 missions.
 */
export function dependanceEconomique(
  missions: Mission[],
  estheticienneId: string,
  maintenant: Date,
  montantDe: (m: Mission) => Centimes,
): { institutId: string; part: number; alerte: boolean } | null {
  const depuis = maintenant.getTime() - 90 * 86_400_000;
  const recentes = missions.filter(
    (m) =>
      m.estheticienneId === estheticienneId &&
      (m.statut === "payee" || m.statut === "validee") &&
      new Date(m.jours[0]).getTime() >= depuis,
  );
  if (recentes.length === 0) return null;
  const parInstitut = new Map<string, { montant: number; nombre: number }>();
  let total = 0;
  for (const m of recentes) {
    const v = parInstitut.get(m.institutId) ?? { montant: 0, nombre: 0 };
    v.montant += montantDe(m);
    v.nombre += 1;
    parInstitut.set(m.institutId, v);
    total += montantDe(m);
  }
  let max: { institutId: string; montant: number; nombre: number } | null = null;
  for (const [institutId, v] of parInstitut) if (!max || v.montant > max.montant) max = { institutId, ...v };
  if (!max || total === 0) return null;
  const part = max.montant / total;
  return { institutId: max.institutId, part, alerte: part > 0.8 && max.nombre >= 4 };
}
