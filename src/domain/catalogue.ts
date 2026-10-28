import type { Domaine, Prestation } from "./types";

// Catalogue fermé : seules ces prestations peuvent être publiées.
// Sources : DGCCRF (FAQ encadrement des soins esthétiques), loi du 5 juillet 1996,
// décret n° 2024-470 du 24 mai 2024 et arrêté du 19 février 2025 (lumière pulsée et laser).
// Les exigences sont volontairement prudentes ; à faire valider par un avocat
// (voir le cahier des charges, section 14, question 11).
export const CATALOGUE: Prestation[] = [
  { id: "soin-visage", libelle: "Soin du visage", domaine: "visage_corps", exigences: ["diplome"] },
  { id: "modelage", libelle: "Modelage esthétique", domaine: "visage_corps", exigences: ["diplome"] },
  { id: "gommage-enveloppement", libelle: "Gommage, enveloppement", domaine: "visage_corps", exigences: ["diplome"] },
  { id: "epilation-cire", libelle: "Épilation à la cire", domaine: "epilation", exigences: ["diplome"] },
  {
    id: "epilation-lumiere",
    libelle: "Épilation laser, lumière pulsée",
    domaine: "epilation",
    exigences: ["diplome", "formation_lumiere_pulsee"],
  },
  // Selon la DGCCRF, la pose de faux-cils n'est pas un soin esthétique : pas de diplôme exigé.
  { id: "extensions-cils", libelle: "Extensions de cils", domaine: "regard", exigences: [] },
  { id: "rehaussement-cils", libelle: "Rehaussement de cils", domaine: "regard", exigences: ["diplome"] },
  { id: "sourcils", libelle: "Sourcils", domaine: "regard", exigences: ["diplome"] },
  { id: "manucure", libelle: "Manucure", domaine: "mains_pieds", exigences: ["diplome"] },
  { id: "beaute-pieds", libelle: "Beauté des pieds", domaine: "mains_pieds", exigences: ["diplome"] },
  // La pose de faux ongles n'est pas un soin esthétique (DGCCRF), sans manucure préalable.
  { id: "gel-capsules", libelle: "Gel, capsules", domaine: "mains_pieds", exigences: [] },
  { id: "nail-art", libelle: "Nail art", domaine: "mains_pieds", exigences: [] },
  { id: "maquillage-jour", libelle: "Maquillage jour, soirée", domaine: "maquillage", exigences: ["diplome"] },
  { id: "maquillage-mariee", libelle: "Maquillage mariée", domaine: "maquillage", exigences: ["diplome"] },
  {
    id: "maquillage-permanent",
    libelle: "Maquillage permanent, microblading",
    domaine: "maquillage",
    exigences: ["declaration_ars"],
  },
];

export const DOMAINES: { id: Domaine; libelle: string }[] = [
  { id: "visage_corps", libelle: "Visage et corps" },
  { id: "epilation", libelle: "Épilation" },
  { id: "regard", libelle: "Regard" },
  { id: "mains_pieds", libelle: "Mains et pieds" },
  { id: "maquillage", libelle: "Maquillage" },
];

export function prestation(id: string): Prestation {
  const p = CATALOGUE.find((x) => x.id === id);
  if (!p) throw new Error(`Prestation inconnue : ${id}`);
  return p;
}

export function libellesPrestations(ids: string[]): string {
  return ids.map((id) => prestation(id).libelle).join(", ");
}

/** Une prestation est « encadrée » si elle exige plus qu'un simple diplôme. */
export function estEncadree(p: Prestation): boolean {
  return p.exigences.some((e) => e !== "diplome");
}
