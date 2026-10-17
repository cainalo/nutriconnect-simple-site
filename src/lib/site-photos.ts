// Versão do site com fotos (faixas de título, cards da Feira e da Geladeira, temas da Trilha,
// atalhos da Casa, cards altos de Funções e telas vazias) ou a versão anterior, com menos imagens.
// O admin escolhe em Admin → Design do site (chave "site_photos" em platform_settings); sem
// configuração, as fotos ficam ligadas. "Testar" vale só neste navegador, por cima do publicado.
import { useSyncExternalStore } from "react";
import { useSiteConfig } from "@/lib/site-config";

const TEST_KEY = "nc_site_photos_test";
const EVENT = "nc-site-photos-test";

export function readSitePhotos(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return true;
  return (raw as { on?: unknown }).on !== false;
}

function readTest(): "on" | "off" | null {
  try {
    const v = window.localStorage.getItem(TEST_KEY);
    return v === "on" || v === "off" ? v : null;
  } catch {
    return null;
  }
}

/** Teste local do admin: "on"/"off" sobrepõe o publicado neste navegador; null volta ao publicado. */
export function setSitePhotosTest(v: "on" | "off" | null) {
  try {
    if (v) window.localStorage.setItem(TEST_KEY, v);
    else window.localStorage.removeItem(TEST_KEY);
  } catch {
    // Sem armazenamento local (aba anônima etc.): o teste só não fica guardado.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSitePhotosTest(): "on" | "off" | null {
  return useSyncExternalStore(subscribe, readTest, () => null);
}

/** true = site com fotos. */
export function useSitePhotos(): boolean {
  const published = readSitePhotos(useSiteConfig("site_photos"));
  const test = useSitePhotosTest();
  return test ? test === "on" : published;
}
