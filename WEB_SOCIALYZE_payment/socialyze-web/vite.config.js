import { defineConfig } from "vite";
import { resolve } from "node:path";

// Situs multi-halaman: index.html dan checkout.html sama-sama harus ikut di-build.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        checkout: resolve(__dirname, "checkout.html"),
      },
    },
  },
});
