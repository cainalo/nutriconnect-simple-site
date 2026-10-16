import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
const H = path.resolve(import.meta.dirname);
const ROOT = path.resolve(H, "..");
const SRC = path.resolve(ROOT, "src");
export default defineConfig({
  root: H, base: "./", plugins: [react(), tailwindcss()], publicDir: path.resolve(ROOT, "public"),
  define: { "import.meta.env.VITE_SUPABASE_URL": '"x"' },
  resolve: { alias: [
    { find: "@/integrations/supabase/client", replacement: H + "/stub-supabase.ts" },
    { find: "@/lib/social-studio.functions", replacement: H + "/stub-fns.ts" },
    { find: "@/hooks/use-auth", replacement: H + "/stub-auth.ts" },
    { find: "@/hooks/use-i18n", replacement: H + "/stub-i18n.ts" },
    { find: /^@\//, replacement: SRC + "/" },
  ] },
  build: { outDir: H + "/out", emptyOutDir: true, modulePreload: false, chunkSizeWarningLimit: 99999 },
});
