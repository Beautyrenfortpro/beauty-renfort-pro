import { Link } from "react-router-dom";
import { Icone } from "../ui/composants";

export default function Accueil() {
  return (
    <div className="app">
      <main className="contenu" style={{ paddingTop: 40, gap: 28 }}>
        <div className="marque" aria-label="Beauty Renfort Pro">
          <span>Renfort</span>
          <span>PRO</span>
        </div>
        <div className="section" style={{ gap: 14 }}>
          <h1 className="titre-page">Des esthéticiennes vérifiées, quand l'institut en a besoin.</h1>
          <p className="sous-titre">
            Version de démonstration : les instituts, esthéticiennes et paiements sont fictifs. Essayez les deux côtés
            de l'application, les actions de l'un apparaissent chez l'autre.
          </p>
        </div>
        <div className="accueil-roles">
          <Link to="/institut" className="role nuit">
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>Je gère un institut</span>
              <span style={{ fontSize: 14, color: "var(--nuit-texte)" }}>Institut Belle Rive, Lyon</span>
            </span>
            <Icone nom="suivant" />
          </Link>
          <Link to="/esthe" className="role">
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>Je suis esthéticienne indépendante</span>
              <span className="petit">Inès M., à son compte</span>
            </span>
            <Icone nom="suivant" />
          </Link>
        </div>
        <div className="bandeau b-vert">
          <Icone nom="bouclierCoche" taille={18} />
          <span>Diplôme, assurance et attestation URSSAF contrôlés pour chaque esthéticienne.</span>
        </div>
      </main>
    </div>
  );
}
