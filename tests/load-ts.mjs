// Carrega módulos TypeScript do projeto (com o atalho "@/") nos testes do Node, pelo próprio Vite.
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let server;

export async function loadTs(file) {
  server ??= await createServer({
    root,
    configFile: false,
    logLevel: "error",
    resolve: { alias: { "@": path.join(root, "src") } },
    server: { middlewareMode: true, hmr: false },
    appType: "custom",
  });
  return server.ssrLoadModule(path.join(root, file));
}

export async function closeTs() {
  await server?.close();
  server = undefined;
}
