// Cópia dos dados (LGPD) em versão legível: abre uma página para imprimir ou salvar em PDF, com
// cada categoria, quantos registros tem e os registros em lista. Feito no navegador, sem servidor.

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Nome legível da categoria (as chaves vêm do banco: "diario_alimentar" → "Diario alimentar"). */
const label = (key: string) => key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function valueText(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Monta o HTML do resumo; `title` e `intro` vêm no idioma da pessoa. */
export function buildDataSummaryHtml(
  data: Record<string, unknown>,
  {
    title,
    intro,
    empty,
    generated,
  }: { title: string; intro: string; empty: string; generated: string },
) {
  const sections = Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([key, v]) => {
      const rows = Array.isArray(v) ? v : [v];
      const items = rows
        .slice(0, 200)
        .map((row) =>
          typeof row === "object" && row
            ? `<dl>${Object.entries(row as Record<string, unknown>)
                .filter(([k]) => !/(^id$|_id$|path$)/.test(k))
                .map(([k, val]) => `<dt>${esc(label(k))}</dt><dd>${esc(valueText(val))}</dd>`)
                .join("")}</dl>`
            : `<p>${esc(valueText(row))}</p>`,
        )
        .join("");
      return `<section><h2>${esc(label(key))} <small>(${rows.length})</small></h2>${
        rows.length ? items : `<p class="muted">${esc(empty)}</p>`
      }</section>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
body{font:14px/1.5 system-ui,sans-serif;color:#222;max-width:820px;margin:32px auto;padding:0 16px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:28px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
small,.muted{color:#666}dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 12px;margin:0 0 10px;padding:8px 10px;border:1px solid #eee;border-radius:8px;break-inside:avoid}
dt{color:#555;font-weight:600}dd{margin:0;word-break:break-word}
@media print{body{margin:0}}
</style></head><body><h1>${esc(title)}</h1><p class="muted">${esc(intro)}</p><p class="muted">${esc(generated)}</p>${sections}</body></html>`;
}

/** Abre o resumo numa aba nova e chama a impressão (dá para escolher "Salvar como PDF"). */
export function openDataSummary(html: string) {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}

/**
 * Abre a aba já no clique (antes de buscar os dados), para o navegador do celular e o app
 * não bloquearem a janela. Mostra "carregando" até `writeDataSummary` preencher.
 */
export function preopenDataSummary(loading: string) {
  const win = window.open("", "_blank");
  if (!win) return null;
  win.document.open();
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(loading)}</title></head><body style="font:15px system-ui,sans-serif;margin:40px;color:#444">${esc(loading)}</body></html>`,
  );
  win.document.close();
  return win;
}

/** Escreve o resumo na aba aberta antes e chama a impressão. */
export function writeDataSummary(win: Window, html: string) {
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
