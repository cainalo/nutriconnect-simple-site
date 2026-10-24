// PIN do responsável para sair do perfil infantil. Fica só neste aparelho (como os perfis
// infantis), guardado como hash. Não é uma senha forte: serve para a criança não voltar sozinha
// ao perfil do adulto (e à rede social). Esqueceu? Sair da conta e entrar de novo apaga o PIN.
const key = (userId: string) => `nutriconnect_parent_pin:${userId}`;

export const PIN_LENGTH = 4;

export function isValidPin(pin: string) {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

async function hash(userId: string, pin: string) {
  const data = new TextEncoder().encode(`${userId}:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function hasParentPin(userId: string) {
  try {
    return !!localStorage.getItem(key(userId));
  } catch {
    return false;
  }
}

export async function setParentPin(userId: string, pin: string) {
  if (!isValidPin(pin)) throw new Error("PIN inválido");
  localStorage.setItem(key(userId), await hash(userId, pin));
}

const triesKey = (userId: string) => `nutriconnect_parent_pin_tries:${userId}`;
export const MAX_TRIES = 5;
export const LOCK_MS = 5 * 60 * 1000;

/** Até quando o PIN está bloqueado depois de muitos erros (0 = livre). */
export function pinLockedUntil(userId: string, now = Date.now()): number {
  try {
    const t = JSON.parse(localStorage.getItem(triesKey(userId)) ?? "null") as {
      n: number;
      until: number;
    } | null;
    return t && t.until > now ? t.until : 0;
  } catch {
    return 0;
  }
}

/**
 * Confere o PIN. Depois de MAX_TRIES erros seguidos, fica bloqueado por LOCK_MS (nem o PIN certo
 * passa nesse tempo); acertar zera a contagem.
 */
export async function checkParentPin(userId: string, pin: string, now = Date.now()) {
  try {
    if (pinLockedUntil(userId, now)) return false;
    const saved = localStorage.getItem(key(userId));
    const ok = !!saved && saved === (await hash(userId, pin));
    if (ok) {
      localStorage.removeItem(triesKey(userId));
      return true;
    }
    const prev = JSON.parse(localStorage.getItem(triesKey(userId)) ?? "null") as {
      n: number;
    } | null;
    const n = (prev?.n ?? 0) + 1;
    localStorage.setItem(
      triesKey(userId),
      JSON.stringify(n >= MAX_TRIES ? { n: 0, until: now + LOCK_MS } : { n, until: 0 }),
    );
    return false;
  } catch {
    return false;
  }
}

export function clearParentPin(userId: string) {
  try {
    localStorage.removeItem(key(userId));
    localStorage.removeItem(triesKey(userId));
  } catch {
    // sem armazenamento: nada a apagar
  }
}
