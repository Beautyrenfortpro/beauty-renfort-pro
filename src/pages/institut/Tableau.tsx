import { useState } from "react";
import { Link } from "react-router-dom";
import { maintenant, useEtat } from "../../data/store";
import { libellesPrestations } from "../../domain/catalogue";
import { joursAvantExpiration, justificatifValide, vigilance } from "../../domain/conformite";
import { formatEuros, formatHoraires, formatPlageJours, initiales } from "../../domain/format";
import { montantEstheticienne } from "../../domain/missions";
import type { Estheticienne, Mission } from "../../domain/types";
import { Avatar, BandeauDemo, Icone, Nav, Statut, Ticket } from "../../ui/composants";

const EN_COURS: Mission["statut"][] = ["publiee", "confirmee", "realisee", "litige"];

function CarteMission({ m, esthe }: { m: Mission; esthe?: Estheticienne }) {
  const propositions = m.propositions.filter((p) => !p.retiree).length;
  if (m.statut === "confirmee" && esthe) {
    return (
      <Link to={`/institut/mission/${m.id}`} className="carte-lien" aria-label={`Mission confirmée avec ${esthe.prenom}`}>
        <Ticket
          variante="nuit"
          haut={
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="attenue" style={{ fontSize: 13, fontWeight: 600 }}>{formatPlageJours(m.jours)}</span>
                <span className="grand">{formatHoraires(m.heureDebut, m.heureFin)}</span>
                <span className="attenue" style={{ fontSize: 13 }}>{libellesPrestations(m.prestations)}</span>
              </div>
              <Statut statut={m.statut} />
            </div>
          }
          bas={
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar texte={initiales(esthe.prenom, esthe.nomInitiale)} taille={36} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{esthe.prenom} {esthe.nomInitiale}.</span>
                <span className="attenue" style={{ fontSize: 12 }}>{formatEuros(m.tarifRetenu ?? 0)} / h</span>
              </span>
              <Icone nom="suivant" />
            </div>
          }
        />
      </Link>
    );
  }
  return (
    <Link to={`/institut/mission/${m.id}`} className="carte carte-lien" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span className="petit" style={{ fontWeight: 600 }}>{formatPlageJours(m.jours)}</span>
        <span style={{ fontSize: 16, fontWeight: 800 }}>{libellesPrestations(m.prestations)}</span>
        <span className="petit">{formatHoraires(m.heureDebut, m.heureFin)}</span>
      </div>
      {m.statut === "publiee" && propositions > 0 ? (
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 76, height: 64, borderRadius: 14, background: "var(--magenta-pale)", color: "var(--magenta-fonce)" }}>
          <span style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{propositions}</span>
          <span style={{ fontSize: 11, fontWeight: 700 }}>{propositions > 1 ? "propositions" : "proposition"}</span>
        </span>
      ) : (
        <Statut statut={m.statut} />
      )}
    </Link>
  );
}

export function InstitutAccueil() {
  const etat = useEtat();
  const t = maintenant(etat);
  const missions = etat.missions
    .filter((m) => m.institutId === etat.institut.id && EN_COURS.includes(m.statut))
    .sort((a, b) => a.jours[0].localeCompare(b.jours[0]));
  const aValider = missions.filter((m) => m.statut === "realisee");

  // Conformité : attestations des esthéticiennes ayant une mission confirmée ou passée avec l'institut.
  const ids = [...new Set(etat.missions.filter((m) => m.institutId === etat.institut.id && m.estheticienneId).map((m) => m.estheticienneId!))];
  const alertes = ids.flatMap((id) => {
    const e = etat.estheticiennes.find((x) => x.id === id)!;
    const v = vigilance(etat.missions, etat.institut.id, id, t.getFullYear(), montantEstheticienne);
    const urssafOk = justificatifValide(e.justificatifs.urssaf, t);
    const jours = joursAvantExpiration(e.justificatifs.urssaf, t);
    if (v.niveau !== "aucun" && (!urssafOk || (jours !== null && jours < 30)))
      return [`Attestation URSSAF de ${e.prenom} à renouveler : vous lui avez versé ${formatEuros(v.cumul)} cette année.`];
    return [];
  });

  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 4px" }}>
        <span className="marque"><span>Renfort</span><span>PRO</span></span>
        <Link to="/institut/compte" className="btn btn-secondaire" style={{ minHeight: 44, borderRadius: 22, padding: "0 12px 0 6px", fontSize: 13, gap: 8 }}>
          <Avatar texte="BR" taille={32} teinte="nuit" />
          {etat.institut.nom.replace("Institut ", "")}
        </Link>
      </header>
      <main className="contenu">
        <section className="section" style={{ gap: 14 }}>
          <h1 className="titre-page">Une absence, un rush ?<br />Trouvez une esthéticienne vérifiée.</h1>
          <p className="sous-titre">Diplôme, assurance et attestation URSSAF contrôlés avant chaque mission.</p>
          <Link to="/institut/publier" className="btn btn-principal">
            <Icone nom="plus" epaisseur={2.4} />
            Publier une mission
          </Link>
        </section>

        {aValider.map((m) => (
          <Link key={m.id} to={`/institut/mission/${m.id}`} className="bandeau b-ambre" style={{ textDecoration: "none" }}>
            <Icone nom="horloge" taille={18} />
            <span style={{ flex: 1 }}>Prestation du {formatPlageJours(m.jours).toLowerCase()} à valider sous 48 h</span>
            <Icone nom="suivant" taille={18} />
          </Link>
        ))}

        <section className="section" aria-labelledby="titre-missions">
          <div className="ligne-titre">
            <h2 id="titre-missions" className="titre-section">Vos missions</h2>
            <Link to="/institut/missions" className="lien-fort">Tout voir</Link>
          </div>
          {missions.length === 0 ? (
            <div className="carte vide">
              <p style={{ fontWeight: 700 }}>Aucune mission en cours</p>
              <p className="petit">Publiez une mission : les esthéticiennes vérifiées près de chez vous la reçoivent aussitôt.</p>
            </div>
          ) : (
            missions.map((m) => (
              <CarteMission key={m.id} m={m} esthe={etat.estheticiennes.find((e) => e.id === m.estheticienneId)} />
            ))
          )}
        </section>

        {alertes.length > 0 ? (
          alertes.map((a) => (
            <div key={a} className="bandeau b-ambre"><Icone nom="attention" taille={18} /><span>{a}</span></div>
          ))
        ) : (
          <div className="bandeau b-vert">
            <Icone nom="bouclierCoche" taille={18} />
            <span>Attestations à jour pour toutes vos esthéticiennes</span>
          </div>
        )}
      </main>
      <Nav role="institut" />
    </div>
  );
}

export function InstitutMissions() {
  const etat = useEtat();
  const [onglet, setOnglet] = useState<"cours" | "terminees">("cours");
  const toutes = etat.missions.filter((m) => m.institutId === etat.institut.id);
  const liste = toutes
    .filter((m) => (onglet === "cours" ? EN_COURS.includes(m.statut) : !EN_COURS.includes(m.statut)))
    .sort((a, b) => (onglet === "cours" ? a.jours[0].localeCompare(b.jours[0]) : b.jours[0].localeCompare(a.jours[0])));
  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header className="entete"><h1>Missions</h1></header>
      <main className="contenu">
        <div className="segments" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <button type="button" aria-pressed={onglet === "cours"} onClick={() => setOnglet("cours")}>En cours</button>
          <button type="button" aria-pressed={onglet === "terminees"} onClick={() => setOnglet("terminees")}>Terminées</button>
        </div>
        {liste.length === 0 && <p className="petit vide">Rien ici pour le moment.</p>}
        {liste.map((m) => (
          <CarteMission key={m.id} m={m} esthe={etat.estheticiennes.find((e) => e.id === m.estheticienneId)} />
        ))}
      </main>
      <Nav role="institut" />
    </div>
  );
}

export function InstitutFavorites() {
  const etat = useEtat();
  const ids = new Set(etat.missions.filter((m) => m.institutId === etat.institut.id && m.estheticienneId).map((m) => m.estheticienneId));
  const liste = etat.estheticiennes.filter((e) => ids.has(e.id));
  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header className="entete"><h1>Vos esthéticiennes</h1></header>
      <main className="contenu">
        <p className="petit">Celles qui ont déjà travaillé chez vous. Vous pourrez leur envoyer une mission en priorité.</p>
        {liste.map((e) => (
          <div key={e.id} className="carte" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar texte={initiales(e.prenom, e.nomInitiale)} />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 800 }}>{e.prenom} {e.nomInitiale}.</span>
              <span className="petit">{e.note ? `${e.note.toLocaleString("fr-FR")} sur 5 · ` : ""}{e.missionsRealisees} missions</span>
            </span>
          </div>
        ))}
      </main>
      <Nav role="institut" />
    </div>
  );
}

export function InstitutCompte() {
  const etat = useEtat();
  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header className="entete"><h1>Compte</h1></header>
      <main className="contenu">
        <div className="carte">
          <dl className="recap">
            <div><dt>Établissement</dt><dd>{etat.institut.nom}</dd></div>
            <div><dt>Ville</dt><dd>{etat.institut.ville}</dd></div>
            <div><dt>SIRET</dt><dd>Vérifié (démo)</dd></div>
            <div><dt>Moyen de paiement</dt><dd>Prélèvement SEPA (simulé)</dd></div>
          </dl>
        </div>
        <div className="carte">
          <h2 className="titre-section" style={{ fontSize: 15, marginBottom: 6 }}>Documents</h2>
          <ul className="liste">
            <li><Icone nom="document" taille={18} /><span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Conditions générales</span><span className="tres-petit">à rédiger avec l'avocat</span></li>
            <li><Icone nom="document" taille={18} /><span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Charte de bonnes pratiques</span><span className="tres-petit">à rédiger avec l'avocat</span></li>
            <li><Icone nom="document" taille={18} /><span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Factures</span><span className="tres-petit">dans chaque mission payée</span></li>
          </ul>
        </div>
      </main>
      <Nav role="institut" />
    </div>
  );
}
