import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET ?? "http://http-backend:3000",
          changeOrigin: true,
        },
        "/ws": {
          target: env.WS_PROXY_TARGET ?? "ws://ws-backend:8080",
          ws: true,
          changeOrigin: true,
        },
      },
    },
  };
});