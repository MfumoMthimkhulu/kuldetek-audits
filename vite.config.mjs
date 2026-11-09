import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const path = relative => fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/utils/supabase/client", replacement: path("./spa/data.js") },
      { find: "next/navigation", replacement: path("./spa/navigation.js") },
      { find: "next/link", replacement: path("./spa/Link.jsx") },
      { find: "@", replacement: dirname(fileURLToPath(import.meta.url)) },
    ],
  },
  define: {
    "process.env.NEXT_PUBLIC_ORION_DEMO": JSON.stringify("true"),
    "process.env.NEXT_PUBLIC_SUPABASE_URL": "undefined",
    "process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY": "undefined",
  },
  server: { port: 3000, strictPort: true },
});
