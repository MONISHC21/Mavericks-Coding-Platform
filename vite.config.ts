import { defineConfig } from "vite";
<<<<<<< HEAD
import react from "@vitejs/plugin-react";
import path from "path";
=======
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
>>>>>>> ed5ff2e02c305546d75f4644439be3a6bd9bcbf7

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
<<<<<<< HEAD
  plugins: [react()],
=======
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
>>>>>>> ed5ff2e02c305546d75f4644439be3a6bd9bcbf7
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
}));
<<<<<<< HEAD

=======
>>>>>>> ed5ff2e02c305546d75f4644439be3a6bd9bcbf7
