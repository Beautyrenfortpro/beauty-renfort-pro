// Construit la version de démonstration en un seul fichier HTML (CSS et JS intégrés).
// Usage : node scripts/construire-demo.mjs <fichier-de-sortie.html>
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const sortie = process.argv[2] ?? "demo.html";
execSync("npx vite build --outDir dist-demo --emptyOutDir", {
  stdio: "inherit",
  env: { ...process.env, VITE_ROUTEUR_MEMOIRE: "1" },
});
const dossier = "dist-demo/assets";
const fichiers = readdirSync(dossier);
const css = readFileSync(join(dossier, fichiers.find((f) => f.endsWith(".css"))), "utf8");
const js = readFileSync(join(dossier, fichiers.find((f) => f.endsWith(".js"))), "utf8").replace(/<\/script/gi, "<\\/script");
const page = `<title>Beauty Renfort Pro</title>
<meta name="theme-color" content="#1A2747">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;
writeFileSync(sortie, page);
console.log(`Démo écrite dans ${sortie} (${Math.round(page.length / 1024)} Ko)`);
