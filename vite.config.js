import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" — sayt GitHub Pages'da (/hisobla/) ham, Android ilova ichida ham ishlashi uchun
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", target: "es2020", assetsInlineLimit: 0 }
});
