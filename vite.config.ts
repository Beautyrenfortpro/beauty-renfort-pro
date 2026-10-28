import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// base "./" : l'application fonctionne aussi hébergée dans un sous-dossier
// (version de démonstration). Les routes utilisent le hash (#/...).
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
