import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["elite-punch-icon.svg"],
      manifest: {
        name: "Elite Punch Invoice",
        short_name: "Elite Punch",
        description: "PWA mobile-first pour punch, factures, employés, payes, catalogue et comptabilité.",
        theme_color: "#090909",
        background_color: "#090909",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        categories: ["business", "productivity", "finance"],
        icons: [
          {
            src: "/elite-punch-icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ]
});
