import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Accueil from "./pages/Accueil";
import { EstheAgenda, EstheMission, EstheMissions, EstheProfil, EstheRevenus } from "./pages/esthe/Esthe";
import MissionInstitut from "./pages/institut/MissionInstitut";
import Publier from "./pages/institut/Publier";
import { InstitutAccueil, InstitutCompte, InstitutFavorites, InstitutMissions } from "./pages/institut/Tableau";
import "./styles.css";

function RetourEnHaut() {
  const { pathname } = useLocation();
  // Accolades obligatoires : certains navigateurs renvoient une promesse depuis scrollTo,
  // que React prendrait pour une fonction de nettoyage.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <RetourEnHaut />
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/institut" element={<InstitutAccueil />} />
        <Route path="/institut/publier" element={<Publier />} />
        <Route path="/institut/missions" element={<InstitutMissions />} />
        <Route path="/institut/mission/:id" element={<MissionInstitut />} />
        <Route path="/institut/favorites" element={<InstitutFavorites />} />
        <Route path="/institut/compte" element={<InstitutCompte />} />
        <Route path="/esthe" element={<EstheMissions />} />
        <Route path="/esthe/mission/:id" element={<EstheMission />} />
        <Route path="/esthe/agenda" element={<EstheAgenda />} />
        <Route path="/esthe/revenus" element={<EstheRevenus />} />
        <Route path="/esthe/profil" element={<EstheProfil />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
