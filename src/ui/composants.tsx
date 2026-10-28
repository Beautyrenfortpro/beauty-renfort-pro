import type { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { actions, maintenant, useEtat } from "../data/store";
import { LIBELLES_STATUT } from "../domain/missions";
import type { StatutMission } from "../domain/types";

// Icônes dessinées à la main, trait de 2 px, cohérentes sur toute l'application.
const CHEMINS = {
  retour: <path d="M15 18l-6-6 6-6" />,
  suivant: <path d="M9 18l6-6-6-6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  moins: <path d="M5 12h14" />,
  coche: <path d="M5 12l5 5L20 7" />,
  bouclier: <path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />,
  bouclierCoche: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  maison: <path d="M3 10.5L12 3l9 7.5V21H3z" />,
  calendrier: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>
  ),
  coeur: <path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z" />,
  personne: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  loupe: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  carte: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 10h20M6 15h4" />
    </>
  ),
  horloge: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  attention: (
    <>
      <path d="M12 3l9 16H3z" />
      <path d="M12 10v4M12 17h.01" />
    </>
  ),
  cadenas: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  document: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6" />
    </>
  ),
};

export type NomIcone = keyof typeof CHEMINS;

export function Icone({ nom, taille = 20, epaisseur = 2, couleur = "currentColor" }: {
  nom: NomIcone;
  taille?: number;
  epaisseur?: number;
  couleur?: string;
}) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={epaisseur}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      {CHEMINS[nom]}
    </svg>
  );
}

export function BandeauDemo() {
  const etat = useEtat();
  const t = maintenant(etat);
  const date = t.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="demo" role="region" aria-label="Contrôles de la démonstration">
      <span><strong>Démo</strong> · {etat.decalageHeures ? date : "fictive"}</span>
      <span className="espace" />
      <button type="button" aria-label="Avancer le temps d'un jour" onClick={() => actions.avancerTemps(24)}>+1 jour</button>
      <button type="button" aria-label="Réinitialiser la démo" onClick={() => actions.reinitialiser()}>Réinit.</button>
      <Link to="/" aria-label="Changer de rôle">Rôle</Link>
    </div>
  );
}

export function Entete({ titre, retour, droite }: { titre: string; retour?: string; droite?: ReactNode }) {
  const naviguer = useNavigate();
  return (
    <header className="entete">
      {retour !== undefined && (
        <button type="button" className="rond" aria-label="Retour" onClick={() => (retour ? naviguer(retour) : naviguer(-1))}>
          <Icone nom="retour" epaisseur={2.2} />
        </button>
      )}
      <h1>{titre}</h1>
      {droite}
    </header>
  );
}

export function Nav({ role }: { role: "institut" | "esthe" }) {
  const liens =
    role === "institut"
      ? ([
          ["/institut", "Accueil", "maison"],
          ["/institut/missions", "Missions", "calendrier"],
          ["/institut/favorites", "Favorites", "coeur"],
          ["/institut/compte", "Compte", "personne"],
        ] as const)
      : ([
          ["/esthe", "Missions", "loupe"],
          ["/esthe/agenda", "Agenda", "calendrier"],
          ["/esthe/revenus", "Revenus", "carte"],
          ["/esthe/profil", "Profil", "personne"],
        ] as const);
  return (
    <nav className="nav" aria-label="Navigation principale">
      {liens.map(([to, libelle, icone]) => (
        <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "actif" : "")}>
          <Icone nom={icone} taille={22} />
          {libelle}
        </NavLink>
      ))}
    </nav>
  );
}

export function Avatar({ texte, taille = 44, teinte = "magenta" }: { texte: string; taille?: number; teinte?: "magenta" | "nuit" | "vert" }) {
  const couleurs = {
    magenta: { background: "#f4d9e6", color: "#6e0039" },
    nuit: { background: "#e6eaf4", color: "#1a2747" },
    vert: { background: "#e3f3ec", color: "#0b5b41" },
  }[teinte];
  return (
    <span className="avatar" aria-hidden="true" style={{ width: taille, height: taille, fontSize: Math.round(taille / 3), ...couleurs }}>
      {texte}
    </span>
  );
}

const TEINTE_STATUT: Record<StatutMission, string> = {
  publiee: "p-gris",
  confirmee: "p-vert",
  realisee: "p-ambre",
  validee: "p-vert",
  payee: "p-nuit",
  litige: "p-rouge",
  annulee: "p-gris",
  expiree: "p-gris",
};

export function Statut({ statut }: { statut: StatutMission }) {
  return <span className={`pastille ${TEINTE_STATUT[statut]}`}>{LIBELLES_STATUT[statut]}</span>;
}

export function Erreur({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="erreur" role="alert">
      <Icone nom="attention" taille={18} />
      <span>{message}</span>
    </div>
  );
}

export function Ticket({ variante = "clair", haut, bas }: { variante?: "clair" | "nuit"; haut: ReactNode; bas: ReactNode }) {
  return (
    <div className={`ticket ticket-${variante}`}>
      <div className="haut">{haut}</div>
      <div className="perforation" aria-hidden="true" />
      <div className="bas">{bas}</div>
    </div>
  );
}
