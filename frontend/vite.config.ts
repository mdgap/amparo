import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: mode === "demo" ? 550 : 500 },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3333" },
  },
}));
