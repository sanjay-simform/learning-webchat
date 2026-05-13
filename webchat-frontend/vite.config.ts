import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    //  mkcert()
  ],
  // server: {
  //   host: true,
  //   https: true,
  // },
  // proxy: {
  //   api: {
  //     target: "https://172.16.4.239:4001",
  //     changeOrigin: true,
  //     secure: false, // ⚠️ Disables SSL verification (dev only!)
  //   },
  // },
});
