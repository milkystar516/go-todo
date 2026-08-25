import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, "..", "");
  const apiProxyTarget = process.env.API_PROXY_TARGET ?? env.API_PROXY_TARGET;

  if (command === "serve" && !apiProxyTarget) {
    throw new Error("API_PROXY_TARGET is required");
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    server: command === "serve"
      ? {
          proxy: {
            "/api": {
              target: apiProxyTarget,
            },
          },
        }
      : undefined,
  };
});
