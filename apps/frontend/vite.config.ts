import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://http-backend:80", // http://localhost:3000 for local without k8s
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://ws-backend:80", // ws://localhost:8080 for local without k8s
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
