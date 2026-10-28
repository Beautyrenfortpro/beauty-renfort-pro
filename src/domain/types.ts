// Types du domaine. Les montants sont toujours en centimes d'euro (entiers)
// pour éviter les erreurs d'arrondi. Les dates sont des chaînes ISO.

export type Centimes = number;

/** Ce qu'une prestation exige de l'esthéticienne pour être réalisée légalement. */
export type Exigence =
  | "diplome" // soins esthétiques : CAP, BP, Bac pro, BTS, brevet de maîtrise ou 3 ans d'expérience reconnus
  | "formation_lumiere_pulsee" // épilation laser / lumière pulsée : décret 2024-470, arrêté du 19 février 2025
  | "declaration_ars"; // maquillage permanent : règles du tatouage (déclaration ARS + formation hygiène)

export type Domaine = "visage_corps" | "epilation" | "regard" | "mains_pieds" | "maquillage";

export interface Prestation {
  id: string;
  libelle: string;
  domaine: Domaine;
  exigences: Exigence[];
}

/** Un justificatif avec une date de fin de validité (null = sans expiration). */
export interface Justificatif {
  verifie: boolean;
  expireLe: string | null;
}

export interface Estheticienne {
  id: string;
  prenom: string;
  nomInitiale: string;
  distanceKm: number;
  note: number | null;
  missionsRealisees: number;
  annulations: number;
  specialites: string[]; // ids de prestations qu'elle souhaite recevoir
  disponible: boolean;
  justificatifs: {
    identite: Justificatif;
    siret: Justificatif;
    diplome: Justificatif | null;
    assurance: Justificatif | null;
    urssaf: Justificatif | null;
    formationLumierePulsee: Justificatif | null;
    declarationArs: Justificatif | null;
  };
}

export interface Institut {
  id: string;
  nom: string;
  ville: string;
}

export type Motif = "remplacement" | "renfort" | "evenement";

export type StatutMission =
  | "publiee"
  | "confirmee"
  | "realisee"
  | "validee"
  | "payee"
  | "litige"
  | "annulee"
  | "expiree";

export interface Proposition {
  estheticienneId: string;
  tarifHoraire: Centimes;
  creeeLe: string;
  retiree: boolean;
}

export interface Annulation {
  par: "institut" | "estheticienne";
  le: string;
  /** Montant versé à l'esthéticienne au titre de l'annulation tardive. */
  indemnite: Centimes;
}

export interface Mission {
  id: string;
  institutId: string;
  motif: Motif;
  /** Jours travaillés (dates ISO AAAA-MM-JJ). */
  jours: string[];
  heureDebut: string; // "09:00"
  heureFin: string; // "18:00"
  /** Pause non travaillée par jour, en minutes. */
  pauseMinutes: number;
  prestations: string[];
  materielFourni: boolean;
  budgetHoraire: Centimes;
  dateLimiteReponse: string;
  statut: StatutMission;
  propositions: Proposition[];
  estheticienneId: string | null;
  tarifRetenu: Centimes | null;
  creeeLe: string;
  confirmeeLe: string | null;
  declareeRealiseeLe: string | null;
  valideeLe: string | null;
  payeeLe: string | null;
  annulation: Annulation | null;
}
