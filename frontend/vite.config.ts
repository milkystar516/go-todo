import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, "..", "");

  if (!env.API_PROXY_TARGET) {
    throw new Error("API_PROXY_TARGET is required");
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],

    server: {
      proxy: {
        "/api": {
          target: env.API_PROXY_TARGET,
        },
      },
    },
  };
});