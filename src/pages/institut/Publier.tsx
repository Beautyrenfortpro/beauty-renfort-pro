import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { actions, essayer, maintenant, useEtat } from "../../data/store";
import { CATALOGUE, DOMAINES, estEncadree } from "../../domain/catalogue";
import { ajouterJours, formatEuros, formatHeures, formatJourLong, isoJour } from "../../domain/format";
import { decompte } from "../../domain/prix";
import type { Motif } from "../../domain/types";
import { Entete, Erreur, Icone } from "../../ui/composants";

function joursEntre(du: string, au: string): string[] {
  if (!du || !au || au < du) return [];
  const r: string[] = [];
  for (let d = new Date(`${du}T12:00:00`); isoJour(d) <= au && r.length < 31; d = ajouterJours(d, 1)) r.push(isoJour(d));
  return r;
}

export default function Publier() {
  const etat = useEtat();
  const naviguer = useNavigate();
  const demain = isoJour(ajouterJours(maintenant(etat), 1));

  const [motif, setMotif] = useState<Motif>("remplacement");
  const [du, setDu] = useState(isoJour(ajouterJours(maintenant(etat), 4)));
  const [au, setAu] = useState(isoJour(ajouterJours(maintenant(etat), 5)));
  const [heureDebut, setHeureDebut] = useState("09:00");
  const [heureFin, setHeureFin] = useState("18:00");
  const [pause, setPause] = useState(60);
  const [prestations, setPrestations] = useState<string[]>([]);
  const [materiel, setMateriel] = useState(true);
  const [budget, setBudget] = useState("32");
  const [erreur, setErreur] = useState<string | null>(null);

  const jours = joursEntre(du, au);
  const budgetCentimes = Math.round(Number(budget.replace(",", ".")) * 100);
  const apercu = useMemo(() => {
    try {
      return jours.length && budgetCentimes > 0 ? decompte({ jours, heureDebut, heureFin, pauseMinutes: pause }, budgetCentimes) : null;
    } catch {
      return null;
    }
  }, [jours, heureDebut, heureFin, pause, budgetCentimes]);

  const basculer = (id: string) =>
    setPrestations((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  function publier() {
    if (au < du) return setErreur("La date de fin doit être après la date de début.");
    if (jours.length === 0) return setErreur("Choisissez les dates de la mission.");
    if (!(budgetCentimes > 0)) return setErreur("Indiquez un budget horaire en euros.");
    let id = "";
    const message = essayer(() => {
      id = actions.publier({
        motif,
        jours,
        heureDebut,
        heureFin,
        pauseMinutes: pause,
        prestations,
        materielFourni: materiel,
        budgetHoraire: budgetCentimes,
        // Réponses acceptées jusqu'à la veille du premier jour, 18 h.
        dateLimiteReponse: `${isoJour(ajouterJours(new Date(`${jours[0]}T12:00:00`), -1))}T18:00:00`,
      });
    });
    if (message) return setErreur(message);
    naviguer(`/institut/mission/${id}`, { replace: true });
  }

  return (
    <div className="app avec-pied">
      <Entete titre="Nouvelle mission" retour="/institut" />
      <main className="contenu">
        <div className="champ">
          <span className="etiquette" id="motif">Pourquoi ce besoin ?</span>
          <div className="segments" role="group" aria-labelledby="motif">
            {(
              [
                ["remplacement", "Remplacement"],
                ["renfort", "Renfort"],
                ["evenement", "Événement"],
              ] as const
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={motif === v} onClick={() => setMotif(v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="champ">
          <span className="etiquette">Dates et horaires</span>
          <div className="grille-2">
            <label className="champ">
              <span className="tres-petit">Du</span>
              <input className="saisie" type="date" min={demain} value={du} onChange={(e) => { setDu(e.target.value); if (e.target.value > au) setAu(e.target.value); }} />
            </label>
            <label className="champ">
              <span className="tres-petit">Au</span>
              <input className="saisie" type="date" min={du} value={au} onChange={(e) => setAu(e.target.value)} />
            </label>
            <label className="champ">
              <span className="tres-petit">Début</span>
              <input className="saisie" type="time" step={900} value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} />
            </label>
            <label className="champ">
              <span className="tres-petit">Fin</span>
              <input className="saisie" type="time" step={900} value={heureFin} onChange={(e) => setHeureFin(e.target.value)} />
            </label>
          </div>
          <label className="champ">
            <span className="tres-petit">Pause non travaillée par jour</span>
            <select className="saisie" value={pause} onChange={(e) => setPause(Number(e.target.value))}>
              <option value={0}>Aucune</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 heure</option>
              <option value={90}>1 h 30</option>
            </select>
          </label>
          {jours.length > 0 && (
            <span className="tres-petit">
              {jours.length > 1 ? `${jours.length} jours, du ${formatJourLong(jours[0]).toLowerCase()} au ${formatJourLong(jours[jours.length - 1]).toLowerCase()}` : formatJourLong(jours[0])}
            </span>
          )}
        </div>

        <div className="section" style={{ gap: 10 }}>
          <span className="etiquette">Prestations à réaliser</span>
          {DOMAINES.map((d) => (
            <fieldset key={d.id} style={{ border: "none", margin: 0, padding: 0 }}>
              <legend className="tres-petit" style={{ fontWeight: 800, padding: "0 2px", marginBottom: 6 }}>{d.libelle}</legend>
              <div className="puces">
                {CATALOGUE.filter((p) => p.domaine === d.id).map((p) => {
                  const actif = prestations.includes(p.id);
                  return (
                    <button key={p.id} type="button" className="puce" aria-pressed={actif} onClick={() => basculer(p.id)}>
                      {actif && <Icone nom="coche" taille={15} epaisseur={2.6} />}
                      {!actif && estEncadree(p) && <Icone nom="bouclier" taille={15} couleur="var(--ambre)" />}
                      {p.libelle}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <p className="tres-petit" style={{ display: "flex", gap: 6, color: "var(--ambre-fonce)" }}>
            <Icone nom="bouclier" taille={15} couleur="var(--ambre)" />
            Prestations encadrées : seules les esthéticiennes ayant la formation ou la déclaration requise recevront la mission.
          </p>
        </div>

        <label className="interrupteur">
          <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Matériel et produits fournis</span>
            <span className="tres-petit">L'esthéticienne reste libre d'apporter les siens</span>
          </span>
          <input type="checkbox" role="switch" checked={materiel} onChange={(e) => setMateriel(e.target.checked)} />
        </label>

        <div className="champ">
          <label className="etiquette" htmlFor="budget">Budget proposé</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input id="budget" className="saisie" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ width: 110, fontSize: 22, fontWeight: 800 }} />
            <span className="petit" style={{ fontWeight: 600 }}>€ par heure</span>
          </div>
          <span className="tres-petit">Indicatif : chaque esthéticienne fixe son propre tarif et peut faire une contre-proposition.</span>
        </div>

        {apercu && (
          <div className="carte" style={{ padding: "4px 16px" }}>
            <dl className="recap">
              <div><dt>{formatHeures(apercu.heures)} × {formatEuros(budgetCentimes)}</dt><dd>{formatEuros(apercu.montantPrestation)}</dd></div>
              <div><dt>Frais de service (15 %)</dt><dd>{formatEuros(apercu.fraisService)}</dd></div>
              <div><dt style={{ color: "var(--encre)", fontWeight: 700 }}>Estimation totale</dt><dd>{formatEuros(apercu.total)}</dd></div>
            </dl>
          </div>
        )}
        <Erreur message={erreur} />
      </main>
      <div className="pied">
        <button type="button" className="btn btn-principal" onClick={publier} disabled={prestations.length === 0}>
          Publier la mission
        </button>
        <span className="tres-petit note">
          {prestations.length === 0 ? "Choisissez au moins une prestation" : "Rien n'est débité avant la fin de la mission"}
        </span>
      </div>
    </div>
  );
}
