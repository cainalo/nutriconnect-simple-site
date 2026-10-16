// Holofote do motor 3D: enquanto uma cena de tela inteira estiver aberta, só os personagens dentro
// dela são desenhados (os que ficam escondidos por baixo param de gastar o aparelho).
let spotlight: Element | null = null;

export function setSpotlight(el: Element | null) {
  spotlight = el;
}

/** O personagem deste elemento deve ser desenhado agora? */
export const inSpotlight = (el: Element) => !spotlight || spotlight.contains(el);
