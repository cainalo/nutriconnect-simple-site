// Recursos nativos do app Android (A3/A4). O app (mobile/, Capacitor) abre o site publicado e
// injeta a ponte `window.Capacitor`, com os plugins instalados em mobile/package.json. Aqui cada
// recurso usa o plugin quando o site está dentro do app e o equivalente do navegador fora dele,
// então quem chama não precisa saber onde está.

/** Aberto pelo app Android, que se identifica no user agent (mesma regra de lib/push.ts). */
export function isNativeApp() {
  return typeof navigator !== "undefined" && /NutriConnectApp\//.test(navigator.userAgent);
}

interface PluginListener {
  remove: () => Promise<void> | void;
}

interface CapacitorBridge {
  isPluginAvailable?: (name: string) => boolean;
  Plugins?: Record<string, Record<string, (...args: never[]) => unknown> | undefined>;
}

function bridge(): CapacitorBridge | null {
  if (typeof window === "undefined" || !isNativeApp()) return null;
  return (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor ?? null;
}

/** O plugin nativo, se o site está no app e o plugin foi instalado nesta versão do app. */
function plugin<T>(name: string): T | null {
  const cap = bridge();
  if (!cap?.Plugins?.[name]) return null;
  if (cap.isPluginAvailable && !cap.isPluginAvailable(name)) return null;
  return cap.Plugins[name] as unknown as T;
}

// ─────────────────────────────── Vibração ───────────────────────────────

interface HapticsPlugin {
  vibrate: (o: { duration: number }) => Promise<void>;
  impact: (o: { style: "LIGHT" | "MEDIUM" | "HEAVY" }) => Promise<void>;
}

/** Vibra (um toque curto ou um padrão em ms, como em navigator.vibrate). */
export function vibrate(pattern: number | number[]) {
  const haptics = plugin<HapticsPlugin>("Haptics");
  if (haptics) {
    const list = Array.isArray(pattern) ? pattern : [pattern];
    // Padrão [vibra, pausa, vibra…]: no app, uma vibração por trecho ímpar.
    let wait = 0;
    list.forEach((ms, i) => {
      if (i % 2 === 0) {
        const at = wait;
        window.setTimeout(() => {
          if (ms <= 20) void haptics.impact({ style: "LIGHT" }).catch(() => undefined);
          else void haptics.vibrate({ duration: ms }).catch(() => undefined);
        }, at);
      }
      wait += ms;
    });
    return;
  }
  if (typeof navigator !== "undefined") navigator.vibrate?.(pattern);
}

// ─────────────────────────────── Compartilhar ───────────────────────────────

interface SharePlugin {
  share: (o: {
    title?: string;
    text?: string;
    url?: string;
    dialogTitle?: string;
  }) => Promise<unknown>;
}

/**
 * Abre o compartilhar do sistema (app ou navegador). Devolve false quando não há como compartilhar
 * aqui, para quem chamou copiar o link no lugar.
 */
export async function shareContent(data: { title?: string; text?: string; url?: string }) {
  const share = plugin<SharePlugin>("Share");
  if (share) {
    await share.share({ ...data, dialogTitle: data.title }).catch(() => undefined);
    return true;
  }
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share(data).catch(() => undefined);
    return true;
  }
  return false;
}

/** Há compartilhar do sistema aqui (app ou navegador)? */
export function canShare() {
  return !!plugin<SharePlugin>("Share") || (typeof navigator !== "undefined" && !!navigator.share);
}

// ─────────────────────────────── Código de barras ───────────────────────────────

interface BarcodePlugin {
  isSupported: () => Promise<{ supported: boolean }>;
  isGoogleBarcodeScannerModuleAvailable: () => Promise<{ available: boolean }>;
  installGoogleBarcodeScannerModule: () => Promise<void>;
  scan: (o: { formats?: string[] }) => Promise<{ barcodes: { rawValue?: string }[] }>;
}

/** O app tem o leitor nativo de código de barras (ML Kit)? */
export function hasNativeScanner() {
  return !!plugin<BarcodePlugin>("BarcodeScanner");
}

/**
 * Lê um código de barras com o leitor do Google (ML Kit) do app. Devolve o código, null se a
 * pessoa cancelou, ou lança erro se o leitor não está disponível (quem chama cai no leitor web).
 */
export async function scanBarcodeNative(): Promise<string | null> {
  const scanner = plugin<BarcodePlugin>("BarcodeScanner");
  if (!scanner) throw new Error("sem leitor nativo");
  const { supported } = await scanner.isSupported();
  if (!supported) throw new Error("leitor nativo sem suporte");
  // O leitor do Google vem pelo Play Services; na primeira vez pode precisar baixar.
  const { available } = await scanner.isGoogleBarcodeScannerModuleAvailable();
  if (!available) await scanner.installGoogleBarcodeScannerModule();
  try {
    const { barcodes } = await scanner.scan({ formats: ["EAN_13", "EAN_8", "UPC_A", "UPC_E"] });
    return barcodes[0]?.rawValue ?? null;
  } catch (err) {
    // Cancelar fecha o leitor com erro; não é falha.
    if (/cancel/i.test(String((err as Error)?.message ?? err))) return null;
    throw err;
  }
}

// ─────────────────────────────── Links que abrem o app ───────────────────────────────

interface AppPlugin {
  addListener: (
    event: "appUrlOpen",
    cb: (e: { url: string }) => void,
  ) => Promise<PluginListener> | PluginListener;
  getLaunchUrl: () => Promise<{ url?: string } | undefined>;
}

/**
 * Quando um link do site abre o app (App Links), leva o app para aquela página. Devolve a
 * função que desliga o ouvinte.
 */
export function listenAppLinks(go: (path: string) => void): () => void {
  const app = plugin<AppPlugin>("App");
  if (!app) return () => undefined;
  const open = (url?: string) => {
    if (!url) return;
    try {
      const u = new URL(url);
      if (u.host !== window.location.host) return;
      const path = `${u.pathname}${u.search}${u.hash}`;
      if (path !== `${window.location.pathname}${window.location.search}${window.location.hash}`)
        go(path);
    } catch {
      // Endereço inválido: ignora.
    }
  };
  let handle: PluginListener | null = null;
  let stopped = false;
  void Promise.resolve(app.addListener("appUrlOpen", (e) => open(e.url))).then((h) => {
    if (stopped) void h.remove();
    else handle = h;
  });
  // Aberto "frio" por um link: o app carregou a página inicial; vai para a do link.
  void app
    .getLaunchUrl()
    .then((r) => open(r?.url))
    .catch(() => undefined);
  return () => {
    stopped = true;
    void handle?.remove();
  };
}
