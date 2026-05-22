import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Elite Punch Invoice",
        short_name: "Elite Punch",
        description:
          "PWA mobile-first pour punch, factures, employés, payes, catalogue et comptabilité.",
        theme_color: "#090909",
        background_color: "#090909",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: []
      }
    })
  ]
});
