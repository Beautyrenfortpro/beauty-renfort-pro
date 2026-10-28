import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { actions, essayer, maintenant, useEtat } from "../../data/store";
import { CATALOGUE, libellesPrestations } from "../../domain/catalogue";
import { estEligible, joursAvantExpiration, justificatifValide, LIBELLES_MANQUES, manquesPourPrestations } from "../../domain/conformite";
import { formatEuros, formatHeures, formatHoraires, formatPlageJours, initiales } from "../../domain/format";
import { montantEstheticienne } from "../../domain/missions";
import { decompte } from "../../domain/prix";
import type { Estheticienne, Justificatif, Mission } from "../../domain/types";
import { Avatar, BandeauDemo, Entete, Erreur, Icone, Nav, Statut, Ticket } from "../../ui/composants";

function useMoi(): { moi: Estheticienne; t: Date; missions: Mission[]; institutNom: string } {
  const etat = useEtat();
  return {
    moi: etat.estheticiennes.find((e) => e.id === etat.moiId)!,
    t: maintenant(etat),
    missions: etat.missions,
    institutNom: etat.institut.nom,
  };
}

// ---------- Fil des missions ----------

export function EstheMissions() {
  const { moi, t, missions, institutNom } = useMoi();
  const [specialites, setSpecialites] = useState(true);
  const [proches, setProches] = useState(true);

  const ouvertes = missions.filter((m) => m.statut === "publiee");
  const eligibles = ouvertes.filter((m) => estEligible(moi, m, t));
  const nonEligibles = moi.disponible ? ouvertes.length - eligibles.length : 0;
  const visibles = eligibles
    .filter((m) => !specialites || m.prestations.some((p) => moi.specialites.includes(p)))
    .filter(() => !proches || moi.distanceKm <= 10) // un seul institut dans la démo
    .sort((a, b) => a.jours[0].localeCompare(b.jours[0]));

  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header className="entete" style={{ paddingTop: 18 }}>
        <h1 style={{ fontSize: 26, letterSpacing: -0.6 }}>Missions</h1>
        <label className={`pastille ${moi.disponible ? "p-vert" : "p-gris"}`} style={{ minHeight: 44, display: "inline-flex", alignItems: "center", gap: 8, padding: "0 12px", fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" role="switch" checked={moi.disponible} onChange={() => actions.basculerDisponibilite()} style={{ width: 18, height: 18, margin: 0, accentColor: "var(--vert)" }} />
          {moi.disponible ? "Disponible" : "Indisponible"}
        </label>
      </header>
      <main className="contenu">
        <div className="puces">
          <button type="button" className="puce" aria-pressed={proches} onClick={() => setProches(!proches)}>À moins de 10 km</button>
          <button type="button" className="puce" aria-pressed={specialites} onClick={() => setSpecialites(!specialites)}>Mes spécialités</button>
        </div>

        {!moi.disponible && (
          <div className="bandeau b-nuit"><Icone nom="horloge" taille={18} /><span>Vous êtes indisponible : vous ne recevez pas de nouvelles missions.</span></div>
        )}

        {visibles.map((m) => {
          const maProposition = m.propositions.find((p) => p.estheticienneId === moi.id && !p.retiree);
          return (
            <Link key={m.id} to={`/esthe/mission/${m.id}`} className="carte-lien">
              <Ticket
                haut={
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span className="attenue" style={{ fontSize: 13, fontWeight: 600 }}>{institutNom} · {moi.distanceKm.toLocaleString("fr-FR")} km</span>
                      <span className="grand">{formatPlageJours(m.jours)}</span>
                      <span className="attenue" style={{ fontSize: 14 }}>{formatHoraires(m.heureDebut, m.heureFin)} · {libellesPrestations(m.prestations)}</span>
                    </div>
                    {maProposition ? <span className="pastille p-nuit">Proposée</span> : <span className="pastille p-magenta">Nouvelle</span>}
                  </div>
                }
                bas={
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="petit">{maProposition ? "Votre tarif" : "Budget proposé"}</span>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>
                      {formatEuros(maProposition?.tarifHoraire ?? m.budgetHoraire)} / h{" "}
                      <span className="petit" style={{ fontWeight: 600 }}>· {formatHeures(decompte(m, m.budgetHoraire).heures)}</span>
                    </span>
                  </div>
                }
              />
            </Link>
          );
        })}

        {moi.disponible && visibles.length === 0 && (
          <div className="carte vide">
            <p style={{ fontWeight: 700 }}>Aucune mission pour ces critères</p>
            <p className="petit">Élargissez les filtres ou revenez plus tard : vous êtes prévenue dès qu'une mission arrive.</p>
          </div>
        )}

        {nonEligibles > 0 && (
          <Link to="/esthe/profil" className="bandeau b-ambre" style={{ textDecoration: "none" }}>
            <Icone nom="bouclier" taille={18} />
            <span style={{ flex: 1 }}>
              {nonEligibles} {nonEligibles > 1 ? "missions demandent" : "mission demande"} un justificatif que vous n'avez pas encore fourni.
            </span>
            <Icone nom="suivant" taille={18} />
          </Link>
        )}
      </main>
      <Nav role="esthe" />
    </div>
  );
}

// ---------- Détail et proposition ----------

export function EstheMission() {
  const { id } = useParams();
  const { moi, missions, institutNom } = useMoi();
  const naviguer = useNavigate();
  const m = missions.find((x) => x.id === id);
  const maProposition = m?.propositions.find((p) => p.estheticienneId === moi.id && !p.retiree);
  const [tarif, setTarif] = useState(maProposition?.tarifHoraire ?? m?.budgetHoraire ?? 3000);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  if (!m)
    return (
      <div className="app"><Entete titre="Mission" retour="/esthe" /><main className="contenu"><p>Cette mission n'est plus disponible.</p></main></div>
    );

  const manques = manquesPourPrestations(moi, m.prestations, new Date(`${m.jours[m.jours.length - 1]}T23:00:00`));
  const d = decompte(m, tarif);
  const ouverte = m.statut === "publiee";

  return (
    <div className="app avec-pied">
      <BandeauDemo />
      <Entete titre={`${institutNom} · ${moi.distanceKm.toLocaleString("fr-FR")} km`} retour="/esthe" />
      <main className="contenu">
        <div className="section" style={{ gap: 6 }}>
          <h1 className="titre-page" style={{ fontSize: 26 }}>{formatPlageJours(m.jours)}</h1>
          <p className="sous-titre">
            {formatHoraires(m.heureDebut, m.heureFin)}{m.jours.length > 1 ? " chaque jour" : ""} · {formatHeures(d.heures)} au total
            {m.pauseMinutes ? `, pause de ${m.pauseMinutes} min déduite` : ""}
          </p>
        </div>

        <div className="carte" style={{ padding: "4px 16px" }}>
          <dl className="recap">
            <div><dt>Prestations</dt><dd>{libellesPrestations(m.prestations)}</dd></div>
            <div><dt>Matériel</dt><dd>{m.materielFourni ? "Fourni, vos produits bienvenus" : "À apporter"}</dd></div>
            <div><dt>Adresse</dt><dd>Envoyée après confirmation</dd></div>
          </dl>
        </div>

        {manques.length > 0 ? (
          <div className="carte section">
            <p style={{ fontWeight: 800 }}>Il vous manque un justificatif pour cette mission</p>
            <ul className="liste">
              {manques.map((x) => (
                <li key={x}><Icone nom="attention" taille={18} couleur="var(--ambre)" /><span style={{ fontSize: 14, fontWeight: 600 }}>{LIBELLES_MANQUES[x]}</span></li>
              ))}
            </ul>
            <Link to="/esthe/profil" className="btn btn-nuit btn-moyen">Compléter mon profil</Link>
          </div>
        ) : (
          <section className="carte section" aria-labelledby="titre-tarif">
            <div className="ligne-titre">
              <h2 id="titre-tarif" className="titre-section" style={{ fontSize: 15 }}>Votre tarif</h2>
              <span className="petit">Budget de l'institut : {formatEuros(m.budgetHoraire)} / h</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <button type="button" className="rond" style={{ width: 48, height: 48, border: "1px solid var(--trait-fort)" }} aria-label="Baisser le tarif d'un euro" disabled={!ouverte} onClick={() => setTarif((x) => Math.max(1000, x - 100))}>
                <Icone nom="moins" epaisseur={2.4} />
              </button>
              <output aria-live="polite" style={{ fontSize: 34, fontWeight: 800, letterSpacing: -0.8 }}>
                {formatEuros(tarif)} <span className="petit" style={{ fontSize: 16, fontWeight: 600 }}>/ h</span>
              </output>
              <button type="button" className="rond" style={{ width: 48, height: 48, border: "1px solid var(--trait-fort)" }} aria-label="Augmenter le tarif d'un euro" disabled={!ouverte} onClick={() => setTarif((x) => Math.min(20000, x + 100))}>
                <Icone nom="plus" epaisseur={2.4} />
              </button>
            </div>
            <div className="bandeau b-vert" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span>Pour vous, {formatHeures(d.heures)} × {formatEuros(tarif)}</span>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{formatEuros(d.montantPrestation)}</span>
            </div>
            <p className="tres-petit">
              Vous recevez 100 % de votre tarif, versé 2 à 3 jours après la validation. Les frais de service sont payés par l'institut.
            </p>
          </section>
        )}

        {envoye && <div className="bandeau b-vert" role="status"><Icone nom="coche" taille={18} /><span>Proposition envoyée. L'institut vous répondra ici.</span></div>}
        {!ouverte && <div className="bandeau b-nuit"><Icone nom="horloge" taille={18} /><span>Cette mission n'accepte plus de propositions.</span></div>}
        <Erreur message={erreur} />
      </main>

      {ouverte && manques.length === 0 && (
        <div className="pied">
          <button type="button" className="btn btn-principal" onClick={() => {
            const err = essayer(() => actions.proposer(m.id, tarif));
            setErreur(err);
            setEnvoye(!err);
          }}>
            {maProposition ? `Mettre à jour : ${formatEuros(tarif)} / h` : tarif === m.budgetHoraire ? `Accepter à ${formatEuros(tarif)} / h` : `Proposer ${formatEuros(tarif)} / h`}
          </button>
          {maProposition ? (
            <button type="button" className="btn btn-discret" onClick={() => { setErreur(essayer(() => actions.retirer(m.id))); setEnvoye(false); }}>Retirer ma proposition</button>
          ) : (
            <button type="button" className="btn btn-discret" onClick={() => naviguer("/esthe")}>Pas cette fois, sans conséquence</button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Agenda ----------

export function EstheAgenda() {
  const { moi, t, missions, institutNom } = useMoi();
  const [erreur, setErreur] = useState<string | null>(null);
  const [annulation, setAnnulation] = useState<string | null>(null);
  const miennes = missions
    .filter((m) => m.estheticienneId === moi.id && ["confirmee", "realisee", "litige"].includes(m.statut))
    .sort((a, b) => a.jours[0].localeCompare(b.jours[0]));
  const enAttente = missions.filter((m) => m.statut === "publiee" && m.propositions.some((p) => p.estheticienneId === moi.id && !p.retiree));

  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header className="entete"><h1>Agenda</h1></header>
      <main className="contenu">
        <Erreur message={erreur} />
        {miennes.length === 0 && (
          <div className="carte vide"><p style={{ fontWeight: 700 }}>Aucune mission confirmée</p><p className="petit">Vos missions confirmées apparaîtront ici.</p></div>
        )}
        {miennes.map((m) => {
          const commencee = new Date(`${m.jours[0]}T${m.heureDebut}:00`) <= t;
          return (
            <Ticket
              key={m.id}
              variante="nuit"
              haut={
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <span className="attenue" style={{ fontSize: 13, fontWeight: 600 }}>{institutNom}</span>
                    <span className="grand">{formatPlageJours(m.jours)}</span>
                    <span className="attenue" style={{ fontSize: 14 }}>{formatHoraires(m.heureDebut, m.heureFin)} · {libellesPrestations(m.prestations)}</span>
                  </div>
                  <Statut statut={m.statut} />
                </div>
              }
              bas={
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span className="attenue" style={{ fontSize: 13 }}>Pour vous</span>
                    <span style={{ fontWeight: 800 }}>{formatEuros(montantEstheticienne(m))}</span>
                  </div>
                  {m.statut === "confirmee" && commencee && (
                    <button type="button" className="btn btn-principal btn-moyen" onClick={() => setErreur(essayer(() => actions.declarerRealisee(m.id)))}>
                      Déclarer la prestation réalisée
                    </button>
                  )}
                  {m.statut === "confirmee" && !commencee &&
                    (annulation === m.id ? (
                      <div className="grille-2">
                        <button type="button" className="btn btn-secondaire btn-moyen" onClick={() => setAnnulation(null)}>Garder</button>
                        <button type="button" className="btn btn-danger btn-moyen" onClick={() => { setErreur(essayer(() => actions.annuler(m.id, "estheticienne"))); setAnnulation(null); }}>Me désister</button>
                      </div>
                    ) : (
                      <button type="button" className="btn btn-discret" style={{ color: "var(--nuit-texte)" }} onClick={() => setAnnulation(m.id)}>
                        Je ne peux plus venir
                      </button>
                    ))}
                  {m.statut === "realisee" && <span className="attenue" style={{ fontSize: 13 }}>En attente de validation par l'institut (48 h maximum)</span>}
                </div>
              }
            />
          );
        })}
        {enAttente.length > 0 && (
          <section className="section">
            <h2 className="titre-section" style={{ fontSize: 15 }}>Propositions en attente</h2>
            {enAttente.map((m) => (
              <Link key={m.id} to={`/esthe/mission/${m.id}`} className="carte carte-lien" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{formatPlageJours(m.jours)}</span>
                <span className="pastille p-nuit">En attente</span>
              </Link>
            ))}
          </section>
        )}
      </main>
      <Nav role="esthe" />
    </div>
  );
}

// ---------- Revenus ----------

export function EstheRevenus() {
  const { moi, t, missions, institutNom } = useMoi();
  const payees = missions.filter((m) => m.estheticienneId === moi.id && m.statut === "payee").sort((a, b) => (b.payeeLe ?? "").localeCompare(a.payeeLe ?? ""));
  const annee = payees.filter((m) => new Date(m.payeeLe!).getFullYear() === t.getFullYear()).reduce((s, m) => s + montantEstheticienne(m), 0);
  const indemnites = missions.filter((m) => m.statut === "annulee" && m.annulation?.indemnite && m.estheticienneId === moi.id).reduce((s, m) => s + (m.annulation?.indemnite ?? 0), 0);

  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header className="entete"><h1>Revenus</h1></header>
      <main className="contenu">
        <div className="ticket ticket-nuit" style={{ padding: "16px 18px" }}>
          <span style={{ fontSize: 13, color: "var(--nuit-texte)" }}>Versé en {t.getFullYear()}</span>
          <p style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.6 }}>{formatEuros(annee + indemnites)}</p>
          <span style={{ fontSize: 12, color: "var(--nuit-texte)" }}>Récapitulatif annuel envoyé en janvier pour votre déclaration</span>
        </div>
        <section className="carte" aria-labelledby="titre-versements" style={{ paddingBottom: 8 }}>
          <h2 id="titre-versements" className="titre-section" style={{ fontSize: 15, marginBottom: 4 }}>Versements</h2>
          {payees.length === 0 ? (
            <p className="petit" style={{ padding: "12px 0" }}>Aucun versement pour le moment.</p>
          ) : (
            <ul className="liste">
              {payees.map((m) => (
                <li key={m.id}>
                  <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{institutNom}</span>
                    <span className="tres-petit">{formatPlageJours(m.jours)} · facture émise à votre nom</span>
                  </span>
                  <span style={{ fontWeight: 800 }}>{formatEuros(montantEstheticienne(m))}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="tres-petit">
          Paiements simulés dans cette démo. Dans la vraie application, ils passeront par un prestataire de paiement agréé, sur votre IBAN.
        </p>
      </main>
      <Nav role="esthe" />
    </div>
  );
}

// ---------- Profil ----------

function LigneJustificatif({ libelle, j, t, action, optionnel }: { libelle: string; j: Justificatif | null; t: Date; action?: ReactNode; optionnel?: boolean }) {
  const ok = justificatifValide(j, t);
  if (optionnel && !j)
    return (
      <li>
        <Icone nom="plus" taille={18} couleur="var(--encre-douce)" />
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{libelle}</span>
        <span className="tres-petit">Facultatif</span>
      </li>
    );
  const jours = joursAvantExpiration(j, t);
  const bientot = ok && jours !== null && jours <= 30;
  return (
    <li>
      <Icone nom={ok && !bientot ? "coche" : "attention"} taille={18} epaisseur={2.4} couleur={ok && !bientot ? "var(--vert)" : "var(--ambre)"} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{libelle}</span>
      {action ?? (
        <span className="tres-petit">
          {!j ? "À ajouter" : !ok ? "Expiré" : j.expireLe ? `jusqu'au ${new Date(j.expireLe).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })}` : "Vérifié"}
        </span>
      )}
    </li>
  );
}

export function EstheProfil() {
  const { moi, t } = useMoi();
  const j = moi.justificatifs;
  const joursUrssaf = joursAvantExpiration(j.urssaf, t);
  const urssafAction = joursUrssaf !== null && joursUrssaf <= 30;

  return (
    <div className="app avec-nav">
      <BandeauDemo />
      <header style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 16px 8px" }}>
        <Avatar texte={initiales(moi.prenom, moi.nomInitiale)} taille={60} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4 }}>{moi.prenom} {moi.nomInitiale}.</h1>
          <span className="petit">
            {moi.note ? `${moi.note.toLocaleString("fr-FR")} sur 5 · ` : ""}{moi.missionsRealisees} missions · {moi.annulations} annulation{moi.annulations > 1 ? "s" : ""}
          </span>
        </div>
      </header>
      <main className="contenu">
        {urssafAction && (
          <div className="bandeau b-ambre" role="status">
            <Icone nom="horloge" taille={18} />
            <span>
              {joursUrssaf! < 0 ? "Votre attestation URSSAF a expiré" : `Votre attestation URSSAF expire dans ${joursUrssaf} jour${joursUrssaf! > 1 ? "s" : ""}`}. Sans
              mise à jour, vous ne recevrez plus de missions.
            </span>
          </div>
        )}
        <section className="carte" aria-labelledby="titre-verif" style={{ paddingBottom: 8 }}>
          <h2 id="titre-verif" className="titre-section" style={{ fontSize: 15, marginBottom: 4 }}>Vérifications</h2>
          <ul className="liste">
            <LigneJustificatif libelle="Identité et SIRET" j={justificatifValide(j.identite, t) && justificatifValide(j.siret, t) ? j.identite : null} t={t} />
            <LigneJustificatif libelle="Diplôme d'esthétique" j={j.diplome} t={t} />
            <LigneJustificatif libelle="Assurance RC pro" j={j.assurance} t={t} />
            <LigneJustificatif
              libelle="Attestation URSSAF"
              j={j.urssaf}
              t={t}
              action={urssafAction ? (
                <button type="button" className="btn btn-nuit" style={{ minHeight: 40, fontSize: 13, padding: "0 14px", borderRadius: 10 }} onClick={() => actions.renouvelerUrssaf()}>
                  Mettre à jour
                </button>
              ) : undefined}
            />
            <LigneJustificatif libelle="Formation lumière pulsée" j={j.formationLumierePulsee} t={t} optionnel />
            <LigneJustificatif libelle="Déclaration ARS (maquillage permanent)" j={j.declarationArs} t={t} optionnel />
          </ul>
        </section>
        <section className="section" aria-labelledby="titre-spe">
          <h2 id="titre-spe" className="titre-section" style={{ fontSize: 15 }}>Spécialités</h2>
          <ul className="puces liste" style={{ display: "flex" }}>
            {moi.specialites.map((id) => (
              <li key={id} className="pastille p-gris" style={{ minHeight: 0, border: "none", fontSize: 13, padding: "8px 12px", background: "var(--surface)" }}>
                {CATALOGUE.find((p) => p.id === id)?.libelle}
              </li>
            ))}
          </ul>
        </section>
        <Link to="/esthe/revenus" className="ticket ticket-nuit" style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "#fff" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Mes revenus</span>
          <Icone nom="suivant" />
        </Link>
      </main>
      <Nav role="esthe" />
    </div>
  );
}
