import { ajouterJours, isoJour } from "../domain/format";
import type { Estheticienne, Institut, Mission } from "../domain/types";

// Données de démonstration : toutes les personnes et tous les lieux sont fictifs.
// Les dates sont calculées à partir d'aujourd'hui pour que la démo reste cohérente.

export interface Etat {
  version: 1;
  /** Décalage appliqué à l'horloge réelle, pour simuler le passage du temps dans la démo. */
  decalageHeures: number;
  institut: Institut;
  estheticiennes: Estheticienne[];
  missions: Mission[];
  /** Esthéticienne connectée côté esthéticienne (démo). */
  moiId: string;
}

const verifie = (expireLe: string | null = null) => ({ verifie: true, expireLe });

export function etatInitial(maintenant: Date): Etat {
  const j = (n: number) => isoJour(ajouterJours(maintenant, n));
  const prochainSamedi = (() => {
    const ecart = (6 - maintenant.getDay() + 7) % 7 || 7;
    return ecart;
  })();

  const estheticiennes: Estheticienne[] = [
    {
      id: "ines",
      prenom: "Inès",
      nomInitiale: "M",
      distanceKm: 2.4,
      note: 4.9,
      missionsRealisees: 31,
      annulations: 0,
      specialites: ["manucure", "beaute-pieds", "soin-visage", "epilation-cire"],
      disponible: true,
      justificatifs: {
        identite: verifie(),
        siret: verifie(),
        diplome: verifie(),
        assurance: verifie(j(160)),
        urssaf: verifie(j(12)),
        formationLumierePulsee: null,
        declarationArs: null,
      },
    },
    {
      id: "laura",
      prenom: "Laura",
      nomInitiale: "B",
      distanceKm: 5.1,
      note: 4.8,
      missionsRealisees: 12,
      annulations: 1,
      specialites: ["manucure", "beaute-pieds", "epilation-lumiere", "epilation-cire"],
      disponible: true,
      justificatifs: {
        identite: verifie(),
        siret: verifie(),
        diplome: verifie(),
        assurance: verifie(j(300)),
        urssaf: verifie(j(120)),
        formationLumierePulsee: verifie(),
        declarationArs: null,
      },
    },
    {
      id: "camille",
      prenom: "Camille",
      nomInitiale: "R",
      distanceKm: 3.8,
      note: 5,
      missionsRealisees: 8,
      annulations: 0,
      specialites: ["soin-visage", "epilation-cire", "manucure", "beaute-pieds"],
      disponible: true,
      justificatifs: {
        identite: verifie(),
        siret: verifie(),
        diplome: verifie(),
        assurance: verifie(j(200)),
        urssaf: verifie(j(90)),
        formationLumierePulsee: null,
        declarationArs: null,
      },
    },
    {
      id: "sarah",
      prenom: "Sarah",
      nomInitiale: "K",
      distanceKm: 3.1,
      note: null,
      missionsRealisees: 0,
      annulations: 0,
      specialites: ["extensions-cils", "gel-capsules", "nail-art"],
      disponible: true,
      justificatifs: {
        identite: verifie(),
        siret: verifie(),
        diplome: null, // pas de diplôme : uniquement des prestations qui n'en exigent pas
        assurance: verifie(j(250)),
        urssaf: verifie(j(150)),
        formationLumierePulsee: null,
        declarationArs: null,
      },
    },
  ];

  const commun = {
    institutId: "belle-rive",
    heureDebut: "09:00",
    heureFin: "18:00",
    pauseMinutes: 60,
    materielFourni: true,
    creeeLe: maintenant.toISOString(),
    declareeRealiseeLe: null,
    valideeLe: null,
    payeeLe: null,
    annulation: null,
  };

  const missions: Mission[] = [
    {
      ...commun,
      id: "remplacement-novembre",
      motif: "remplacement",
      jours: [j(6), j(7), j(8)],
      prestations: ["manucure", "beaute-pieds"],
      budgetHoraire: 3200,
      dateLimiteReponse: `${j(5)}T18:00:00`,
      statut: "publiee",
      propositions: [
        { estheticienneId: "laura", tarifHoraire: 3500, creeeLe: maintenant.toISOString(), retiree: false },
        { estheticienneId: "camille", tarifHoraire: 3200, creeeLe: maintenant.toISOString(), retiree: false },
      ],
      estheticienneId: null,
      tarifRetenu: null,
      confirmeeLe: null,
    },
    {
      ...commun,
      id: "samedi-renfort",
      motif: "renfort",
      jours: [j(prochainSamedi)],
      prestations: ["soin-visage", "epilation-cire"],
      budgetHoraire: 3400,
      dateLimiteReponse: `${j(prochainSamedi - 1)}T12:00:00`,
      statut: "confirmee",
      propositions: [{ estheticienneId: "camille", tarifHoraire: 3400, creeeLe: maintenant.toISOString(), retiree: false }],
      estheticienneId: "camille",
      tarifRetenu: 3400,
      confirmeeLe: maintenant.toISOString(),
    },
    {
      ...commun,
      id: "fetes",
      motif: "evenement",
      jours: [j(45)],
      heureDebut: "10:00",
      heureFin: "19:00",
      prestations: ["maquillage-jour", "soin-visage"],
      budgetHoraire: 3600,
      dateLimiteReponse: `${j(40)}T18:00:00`,
      statut: "publiee",
      propositions: [],
      estheticienneId: null,
      tarifRetenu: null,
      confirmeeLe: null,
    },
    {
      ...commun,
      id: "octobre-payee",
      motif: "renfort",
      jours: [j(-20), j(-19)],
      prestations: ["manucure", "soin-visage"],
      budgetHoraire: 3300,
      dateLimiteReponse: `${j(-22)}T18:00:00`,
      statut: "payee",
      propositions: [{ estheticienneId: "ines", tarifHoraire: 3300, creeeLe: maintenant.toISOString(), retiree: false }],
      estheticienneId: "ines",
      tarifRetenu: 3300,
      confirmeeLe: ajouterJours(maintenant, -25).toISOString(),
      declareeRealiseeLe: ajouterJours(maintenant, -19).toISOString(),
      valideeLe: ajouterJours(maintenant, -18).toISOString(),
      payeeLe: ajouterJours(maintenant, -16).toISOString(),
    },
  ];

  return {
    version: 1,
    decalageHeures: 0,
    institut: { id: "belle-rive", nom: "Institut Belle Rive", ville: "Lyon" },
    estheticiennes,
    missions,
    moiId: "ines",
  };
}
