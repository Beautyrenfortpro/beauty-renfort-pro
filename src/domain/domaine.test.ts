import { describe, expect, it } from "vitest";
import { dependanceEconomique, estEligible, manquesPourPrestations, vigilance } from "./conformite";
import {
  annuler,
  choisir,
  contester,
  creerMission,
  declarerRealisee,
  ErreurMission,
  expirerSiBesoin,
  marquerPayee,
  montantEstheticienne,
  proposer,
  validationAutomatique,
  type NouvelleMission,
} from "./missions";
import { decompte, heuresTotales, indemniteAnnulationInstitut } from "./prix";
import type { Estheticienne, Mission } from "./types";

const MAINTENANT = new Date("2026-10-28T10:00:00");
const ok = (expireLe: string | null = "2027-06-30") => ({ verifie: true, expireLe });

function esthe(surcharge: Partial<Estheticienne["justificatifs"]> = {}, autres: Partial<Estheticienne> = {}): Estheticienne {
  return {
    id: "ines",
    prenom: "Inès",
    nomInitiale: "M",
    distanceKm: 2.4,
    note: 4.9,
    missionsRealisees: 31,
    annulations: 0,
    specialites: [],
    disponible: true,
    justificatifs: {
      identite: ok(null),
      siret: ok(null),
      diplome: ok(null),
      assurance: ok(),
      urssaf: ok("2027-04-30"),
      formationLumierePulsee: null,
      declarationArs: null,
      ...surcharge,
    },
    ...autres,
  };
}

const base: NouvelleMission = {
  institutId: "belle-rive",
  motif: "remplacement",
  jours: ["2026-11-05", "2026-11-03", "2026-11-04"],
  heureDebut: "09:00",
  heureFin: "18:00",
  pauseMinutes: 60,
  prestations: ["manucure", "beaute-pieds"],
  materielFourni: true,
  budgetHoraire: 3200,
  dateLimiteReponse: "2026-11-02T18:00:00",
};

const plus = (h: number) => new Date(MAINTENANT.getTime() + h * 3_600_000);

describe("prix", () => {
  it("calcule les heures pause déduite et le décompte avec 15 % de frais payés par l'institut", () => {
    expect(heuresTotales(base)).toBe(24);
    expect(decompte(base, 3500)).toEqual({
      heures: 24,
      tarifHoraire: 3500,
      montantPrestation: 84_000,
      fraisService: 12_600,
      total: 96_600,
    });
  });

  it("refuse des horaires incohérents", () => {
    expect(() => decompte({ ...base, heureFin: "09:30" }, 3000)).toThrow();
  });

  it("applique les indemnités d'annulation selon le délai", () => {
    const debut = plus(72);
    expect(indemniteAnnulationInstitut(10_000, debut, MAINTENANT)).toBe(0);
    expect(indemniteAnnulationInstitut(10_000, debut, plus(30))).toBe(2_500); // 42 h avant
    expect(indemniteAnnulationInstitut(10_000, debut, plus(60))).toBe(5_000); // 12 h avant
  });
});

describe("conformité", () => {
  it("n'exige pas de diplôme pour les extensions de cils", () => {
    expect(manquesPourPrestations(esthe({ diplome: null }), ["extensions-cils"], MAINTENANT)).toEqual([]);
  });

  it("exige l'attestation de formation pour la lumière pulsée", () => {
    expect(manquesPourPrestations(esthe(), ["epilation-lumiere"], MAINTENANT)).toEqual(["formation_lumiere_pulsee"]);
    expect(manquesPourPrestations(esthe({ formationLumierePulsee: ok(null) }), ["epilation-lumiere"], MAINTENANT)).toEqual(
      [],
    );
  });

  it("exige la déclaration ARS pour le maquillage permanent", () => {
    expect(manquesPourPrestations(esthe(), ["maquillage-permanent"], MAINTENANT)).toContain("declaration_ars");
  });

  it("rend inéligible si l'attestation URSSAF expire avant la fin de la mission", () => {
    const e = esthe({ urssaf: ok("2026-11-04") });
    expect(estEligible(e, { prestations: ["manucure"], jours: ["2026-11-03"] }, MAINTENANT)).toBe(true);
    expect(estEligible(e, { prestations: ["manucure"], jours: ["2026-11-03", "2026-11-05"] }, MAINTENANT)).toBe(false);
  });

  it("ignore les justificatifs non vérifiés et les esthéticiennes indisponibles", () => {
    expect(estEligible(esthe({ assurance: { verifie: false, expireLe: null } }), base, MAINTENANT)).toBe(false);
    expect(estEligible(esthe({}, { disponible: false }), base, MAINTENANT)).toBe(false);
  });
});

describe("cycle de vie d'une mission", () => {
  it("trie les jours et suit le parcours complet jusqu'au paiement", () => {
    let m = creerMission(base, "m1", MAINTENANT);
    expect(m.jours).toEqual(["2026-11-03", "2026-11-04", "2026-11-05"]);
    m = proposer(m, esthe(), 3500, MAINTENANT);
    m = choisir(m, "ines", MAINTENANT);
    expect(m.statut).toBe("confirmee");
    expect(m.tarifRetenu).toBe(3500);
    m = declarerRealisee(m, "ines", new Date("2026-11-05T18:30:00"));
    expect(validationAutomatique(m, new Date("2026-11-06T18:00:00")).statut).toBe("realisee");
    m = validationAutomatique(m, new Date("2026-11-07T19:00:00"));
    expect(m.statut).toBe("validee");
    m = marquerPayee(m, new Date("2026-11-08T09:00:00"));
    expect(m.statut).toBe("payee");
    expect(montantEstheticienne(m)).toBe(84_000);
  });

  it("refuse une proposition d'une esthéticienne non éligible", () => {
    const m = creerMission({ ...base, prestations: ["epilation-lumiere"] }, "m2", MAINTENANT);
    expect(() => proposer(m, esthe(), 3500, MAINTENANT)).toThrow(ErreurMission);
  });

  it("remplace la proposition précédente de la même esthéticienne", () => {
    let m = creerMission(base, "m3", MAINTENANT);
    m = proposer(m, esthe(), 3200, MAINTENANT);
    m = proposer(m, esthe(), 3400, MAINTENANT);
    expect(m.propositions).toHaveLength(1);
    expect(m.propositions[0].tarifHoraire).toBe(3400);
  });

  it("republie la mission si l'esthéticienne annule, sans frais", () => {
    let m = choisir(proposer(creerMission(base, "m4", MAINTENANT), esthe(), 3200, MAINTENANT), "ines", MAINTENANT);
    m = annuler(m, "estheticienne", MAINTENANT);
    expect(m.statut).toBe("publiee");
    expect(m.estheticienneId).toBeNull();
    expect(m.propositions).toHaveLength(0);
  });

  it("calcule l'indemnité quand l'institut annule tard", () => {
    let m = choisir(proposer(creerMission(base, "m5", MAINTENANT), esthe(), 3500, MAINTENANT), "ines", MAINTENANT);
    m = annuler(m, "institut", new Date("2026-11-02T21:00:00")); // 12 h avant
    expect(m.annulation?.indemnite).toBe(42_000);
  });

  it("permet de contester et fait expirer les missions sans réponse", () => {
    let m = choisir(proposer(creerMission(base, "m6", MAINTENANT), esthe(), 3200, MAINTENANT), "ines", MAINTENANT);
    m = declarerRealisee(m, "ines", new Date("2026-11-05T19:00:00"));
    expect(contester(m).statut).toBe("litige");
    const sansReponse = creerMission(base, "m7", MAINTENANT);
    expect(expirerSiBesoin(sansReponse, new Date("2026-11-02T19:00:00")).statut).toBe("expiree");
  });
});

describe("alertes", () => {
  const payee = (id: string, institutId: string, montant: number, jour = "2026-10-01"): Mission => ({
    ...creerMission({ ...base, institutId, jours: ["2026-11-03"] }, id, MAINTENANT),
    jours: [jour],
    statut: "payee",
    estheticienneId: "ines",
    tarifRetenu: montant,
  });
  const montantFixe = (m: Mission) => m.tarifRetenu ?? 0;

  it("signale l'approche puis le dépassement du seuil de vigilance de 5 000 € HT", () => {
    const ms = [payee("a", "belle-rive", 250_000), payee("b", "belle-rive", 160_000)];
    expect(vigilance(ms, "belle-rive", "ines", 2026, montantFixe).niveau).toBe("approche");
    ms.push(payee("c", "belle-rive", 100_000));
    expect(vigilance(ms, "belle-rive", "ines", 2026, montantFixe)).toEqual({ cumul: 510_000, niveau: "atteint" });
  });

  it("détecte une dépendance économique à un seul institut", () => {
    const ms = ["1", "2", "3", "4"].map((i) => payee(i, "belle-rive", 50_000, "2026-10-0" + i));
    ms.push(payee("5", "autre", 5_000, "2026-10-05"));
    expect(dependanceEconomique(ms, "ines", MAINTENANT, montantFixe)?.alerte).toBe(true);
  });
});
