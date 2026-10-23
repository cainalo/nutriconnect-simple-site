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

export async function checkParentPin(userId: string, pin: string) {
  try {
    const saved = localStorage.getItem(key(userId));
    return !!saved && saved === (await hash(userId, pin));
  } catch {
    return false;
  }
}

export function clearParentPin(userId: string) {
  try {
    localStorage.removeItem(key(userId));
  } catch {
    // sem armazenamento: nada a apagar
  }
}
