import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { actions, essayer, maintenant, useEtat } from "../../data/store";
import { libellesPrestations } from "../../domain/catalogue";
import { justificatifValide, vigilance } from "../../domain/conformite";
import { formatEuros, formatHeures, formatHoraires, formatJourLong, formatPlageJours, initiales } from "../../domain/format";
import { DELAI_CONTESTATION_HEURES, montantEstheticienne } from "../../domain/missions";
import { decompte, indemniteAnnulationInstitut } from "../../domain/prix";
import type { Estheticienne, Mission } from "../../domain/types";
import { Avatar, BandeauDemo, Entete, Erreur, Icone, Statut, Ticket } from "../../ui/composants";

const MOTIFS = { remplacement: "Remplacement", renfort: "Renfort", evenement: "Événement" } as const;

function Verifications({ e, a }: { e: Estheticienne; a: Date }) {
  const lignes: [string, boolean, string | null][] = [
    ["Diplôme d'esthétique", justificatifValide(e.justificatifs.diplome, a), null],
    ["Assurance RC professionnelle", justificatifValide(e.justificatifs.assurance, a), e.justificatifs.assurance?.expireLe ?? null],
    ["Attestation de vigilance URSSAF", justificatifValide(e.justificatifs.urssaf, a), e.justificatifs.urssaf?.expireLe ?? null],
  ];
  if (e.justificatifs.formationLumierePulsee) lignes.push(["Formation lumière pulsée", justificatifValide(e.justificatifs.formationLumierePulsee, a), null]);
  return (
    <ul className="liste">
      {lignes.map(([libelle, ok, expire]) => (
        <li key={libelle}>
          <Icone nom={ok ? "coche" : "attention"} taille={18} epaisseur={2.4} couleur={ok ? "var(--vert)" : "var(--ambre)"} />
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{libelle}</span>
          <span className="tres-petit">
            {!ok ? "Non fourni" : expire ? `jusqu'au ${new Date(expire).toLocaleDateString("fr-FR", { month: "2-digit", year: "numeric" })}` : "Contrôlé"}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Propositions({ m }: { m: Mission }) {
  const etat = useEtat();
  const [choix, setChoix] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const actives = m.propositions.filter((p) => !p.retiree).sort((a, b) => a.tarifHoraire - b.tarifHoraire);
  const dejaVenues = new Set(etat.missions.filter((x) => x.institutId === m.institutId && x.statut === "payee").map((x) => x.estheticienneId));

  if (actives.length === 0)
    return (
      <div className="carte vide">
        <Icone nom="horloge" taille={28} couleur="var(--encre-douce)" />
        <p style={{ fontWeight: 700 }}>En attente de propositions</p>
        <p className="petit">La mission a été envoyée aux esthéticiennes vérifiées dont les justificatifs couvrent ces prestations.</p>
      </div>
    );

  return (
    <section className="section" aria-labelledby="titre-prop">
      <h2 id="titre-prop" className="titre-section">{actives.length} {actives.length > 1 ? "propositions" : "proposition"}</h2>
      {actives.map((p) => {
        const e = etat.estheticiennes.find((x) => x.id === p.estheticienneId)!;
        const selection = choix === e.id;
        const d = decompte(m, p.tarifHoraire);
        return (
          <article key={e.id} className={`carte ${selection ? "carte-selection" : ""}`} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Avatar texte={initiales(e.prenom, e.nomInitiale)} taille={48} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{e.prenom} {e.nomInitiale}.</span>
                <span className="petit">
                  {e.note ? `${e.note.toLocaleString("fr-FR")} sur 5 · ${e.missionsRealisees} missions` : "Nouvelle"} · à {e.distanceKm.toLocaleString("fr-FR")} km
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <span style={{ fontSize: 20, fontWeight: 800 }}>{formatEuros(p.tarifHoraire)}</span>
                <span className="tres-petit" style={p.tarifHoraire !== m.budgetHoraire ? { color: "var(--ambre)", fontWeight: 700 } : undefined}>
                  {p.tarifHoraire !== m.budgetHoraire ? "contre-proposition" : "/ heure"}
                </span>
              </div>
            </div>
            {dejaVenues.has(e.id) && <span className="pastille p-nuit">Déjà venue chez vous</span>}
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--vert-fonce)" }}>
              <Icone nom="bouclierCoche" taille={16} /> Diplôme, assurance et URSSAF vérifiés
            </span>
            {selection ? (
              <>
                <dl className="recap" style={{ borderTop: "1px solid #eceef3" }}>
                  <div><dt>{formatHeures(d.heures)} × {formatEuros(p.tarifHoraire)}</dt><dd>{formatEuros(d.montantPrestation)}</dd></div>
                  <div><dt>Frais de service (15 %)</dt><dd>{formatEuros(d.fraisService)}</dd></div>
                  <div><dt style={{ color: "var(--encre)", fontWeight: 700 }}>Total, débité après validation</dt><dd>{formatEuros(d.total)}</dd></div>
                </dl>
                <p className="tres-petit">
                  En confirmant, vous acceptez le contrat de prestation avec {e.prenom}. Elle reste indépendante : elle organise
                  son travail et utilise ses méthodes.
                </p>
                <Erreur message={erreur} />
                <div className="grille-2">
                  <button type="button" className="btn btn-secondaire btn-moyen" onClick={() => setChoix(null)}>Retour</button>
                  <button type="button" className="btn btn-principal btn-moyen" onClick={() => setErreur(essayer(() => actions.choisir(m.id, e.id)))}>
                    Confirmer
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn-principal btn-moyen" onClick={() => { setChoix(e.id); setErreur(null); }}>
                Choisir {e.prenom}
              </button>
            )}
          </article>
        );
      })}
      <p className="tres-petit" style={{ display: "flex", gap: 8 }}>
        <Icone nom="cadenas" taille={16} /> Les coordonnées sont échangées après la confirmation.
      </p>
    </section>
  );
}

export default function MissionInstitut() {
  const { id } = useParams();
  const etat = useEtat();
  const t = maintenant(etat);
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const m = etat.missions.find((x) => x.id === id);

  if (!m)
    return (
      <div className="app">
        <Entete titre="Mission" retour="/institut" />
        <main className="contenu"><p>Cette mission n'existe pas ou a été supprimée.</p><Link to="/institut">Retour à l'accueil</Link></main>
      </div>
    );

  const e = etat.estheticiennes.find((x) => x.id === m.estheticienneId);
  const d = m.tarifRetenu ? decompte(m, m.tarifRetenu) : null;
  const debut = new Date(`${m.jours[0]}T${m.heureDebut}:00`);
  const indemnite = d ? indemniteAnnulationInstitut(d.montantPrestation, debut, t) : 0;
  const v = e ? vigilance(etat.missions, m.institutId, e.id, t.getFullYear(), montantEstheticienne) : null;

  return (
    <div className="app">
      <BandeauDemo />
      <Entete titre={MOTIFS[m.motif]} retour="/institut" droite={<Statut statut={m.statut} />} />
      <main className="contenu">
        {e && d && m.statut !== "annulee" ? (
          <Ticket
            variante="nuit"
            haut={
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar texte={initiales(e.prenom, e.nomInitiale)} taille={48} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 18, fontWeight: 800 }}>{e.prenom} {e.nomInitiale}.</span>
                    <span className="attenue" style={{ fontSize: 13 }}>Contrat de prestation accepté par vous deux</span>
                  </div>
                </div>
                <div className="grille-2" style={{ gap: "12px 16px" }}>
                  <Info libelle="Dates" valeur={formatPlageJours(m.jours)} />
                  <Info libelle="Horaires" valeur={formatHoraires(m.heureDebut, m.heureFin)} />
                  <Info libelle="Prestations" valeur={libellesPrestations(m.prestations)} />
                  <Info libelle={`Tarif de ${e.prenom}`} valeur={`${formatEuros(m.tarifRetenu!)} / h`} />
                </div>
              </div>
            }
            bas={
              <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                <Ligne libelle={`${formatHeures(d.heures)} × ${formatEuros(d.tarifHoraire)}`} valeur={formatEuros(d.montantPrestation)} />
                <Ligne libelle="Frais de service (15 %)" valeur={formatEuros(d.fraisService)} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 6 }}>
                  <dt style={{ fontSize: 14, fontWeight: 700 }}>{m.statut === "payee" ? "Total débité" : "Total, débité après validation"}</dt>
                  <dd style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{formatEuros(d.total)}</dd>
                </div>
              </dl>
            }
          />
        ) : (
          <Ticket
            haut={
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span className="attenue" style={{ fontSize: 13, fontWeight: 600 }}>{formatPlageJours(m.jours)}</span>
                <span className="grand">{formatHoraires(m.heureDebut, m.heureFin)}</span>
                <span className="attenue" style={{ fontSize: 14 }}>{libellesPrestations(m.prestations)}</span>
              </div>
            }
            bas={
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="petit">Budget proposé</span>
                <span style={{ fontWeight: 800 }}>{formatEuros(m.budgetHoraire)} / h</span>
              </div>
            }
          />
        )}

        {m.statut === "publiee" && <Propositions m={m} />}

        {m.statut === "realisee" && m.declareeRealiseeLe && (
          <div className="carte section">
            <p style={{ fontWeight: 800 }}>{e?.prenom} a déclaré la prestation réalisée.</p>
            <p className="petit">
              Validez pour déclencher le paiement. Sans réponse, la validation est automatique le{" "}
              {formatJourLong(new Date(new Date(m.declareeRealiseeLe).getTime() + DELAI_CONTESTATION_HEURES * 3_600_000).toISOString())}.
            </p>
            <button type="button" className="btn btn-principal" onClick={() => setErreur(essayer(() => actions.valider(m.id)))}>Valider la prestation</button>
            <button type="button" className="btn btn-discret" onClick={() => setErreur(essayer(() => actions.contester(m.id)))}>Signaler un problème</button>
          </div>
        )}

        {m.statut === "litige" && (
          <div className="bandeau b-ambre"><Icone nom="attention" taille={18} /><span>Problème signalé. Le paiement est bloqué et notre équipe vous contacte sous 48 h.</span></div>
        )}

        {m.statut === "payee" && e && (
          <div className="carte section" style={{ gap: 8 }}>
            <h2 className="titre-section" style={{ fontSize: 15 }}>Factures</h2>
            <ul className="liste">
              <li><Icone nom="document" taille={18} /><span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Prestation de {e.prenom} {e.nomInitiale}.</span><span className="tres-petit">{formatEuros(d!.montantPrestation)}</span></li>
              <li><Icone nom="document" taille={18} /><span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>Frais de service</span><span className="tres-petit">{formatEuros(d!.fraisService)}</span></li>
            </ul>
            <p className="tres-petit">Facture de prestation établie par Beauty Renfort Pro au nom et pour le compte de {e.prenom} {e.nomInitiale}. (démo)</p>
          </div>
        )}

        {e && (m.statut === "confirmee" || m.statut === "realisee" || m.statut === "payee") && (
          <section className="carte" aria-labelledby="titre-docs" style={{ paddingBottom: 8 }}>
            <h2 id="titre-docs" className="titre-section" style={{ fontSize: 15, marginBottom: 4 }}>Documents de {e.prenom}</h2>
            <Verifications e={e} a={t} />
          </section>
        )}

        {v && v.niveau !== "aucun" && (
          <div className="bandeau b-nuit">
            <Icone nom="bouclier" taille={18} />
            <span>
              Vous avez versé {formatEuros(v.cumul)} à {e?.prenom} cette année. Au-delà de 5 000 € HT, la loi vous impose de
              détenir son attestation URSSAF : elle est conservée ici et renouvelée tous les 6 mois.
            </span>
          </div>
        )}

        {m.statut === "annulee" && (
          <div className="bandeau b-nuit"><Icone nom="horloge" taille={18} />
            <span>Mission annulée{m.annulation?.indemnite ? `. Indemnité versée à l'esthéticienne : ${formatEuros(m.annulation.indemnite)}.` : ", sans frais."}</span>
          </div>
        )}
        {m.statut === "expiree" && <p className="petit">Aucune esthéticienne n'a été confirmée avant la date limite.</p>}

        <Erreur message={erreur} />

        {(m.statut === "publiee" || m.statut === "confirmee") &&
          (confirmerAnnulation ? (
            <div className="carte section">
              <p style={{ fontWeight: 700 }}>Annuler cette mission ?</p>
              <p className="petit">
                {m.statut === "publiee" || indemnite === 0
                  ? "L'annulation est gratuite."
                  : `Annulation tardive : ${formatEuros(indemnite)} seront versés à ${e?.prenom} pour le temps réservé.`}
              </p>
              <div className="grille-2">
                <button type="button" className="btn btn-secondaire btn-moyen" onClick={() => setConfirmerAnnulation(false)}>Garder</button>
                <button type="button" className="btn btn-danger btn-moyen" onClick={() => { setErreur(essayer(() => actions.annuler(m.id, "institut"))); setConfirmerAnnulation(false); }}>Annuler la mission</button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-discret" onClick={() => setConfirmerAnnulation(true)}>Annuler la mission</button>
          ))}
      </main>
    </div>
  );
}

function Info({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span className="attenue" style={{ fontSize: 12 }}>{libelle}</span>
      <span style={{ fontSize: 15, fontWeight: 700 }}>{valeur}</span>
    </div>
  );
}

function Ligne({ libelle, valeur }: { libelle: string; valeur: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
      <dt className="attenue">{libelle}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{valeur}</dd>
    </div>
  );
}
