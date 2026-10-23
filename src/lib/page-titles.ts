// Títulos da aba do navegador nos outros idiomas. As rotas declaram o título em português (é o que
// vai no HTML do servidor e para buscadores); no navegador, quando o idioma escolhido não é
// português, o título é trocado pela tradução daqui. Chave = parte antes de " — NutriConnect".
import type { Locale } from "@/lib/i18n";

type T = [en: string, es: string, fr: string];

export const PAGE_TITLES: Record<string, T> = {
  NutriConnect: ["NutriConnect", "NutriConnect", "NutriConnect"],
  "Uma rede social sobre alimentação": [
    "A social network about food",
    "Una red social sobre alimentación",
    "Un réseau social sur l'alimentation",
  ],
  "Leitor de rótulos": ["Label reader", "Lector de etiquetas", "Lecteur d'étiquettes"],
  "Meu acompanhamento": ["My care", "Mi seguimiento", "Mon suivi"],
  Administração: ["Administration", "Administración", "Administration"],
  Apresentação: ["Presentation", "Presentación", "Présentation"],
  "Virar membro": ["Become a member", "Hazte miembro", "Devenir membre"],
  "Criar conta": ["Create account", "Crear cuenta", "Créer un compte"],
  "Cardápio da semana": ["Weekly menu", "Menú de la semana", "Menu de la semaine"],
  "Entrar na casa": ["Join the household", "Unirse a la casa", "Rejoindre le foyer"],
  "Minha casa": ["My household", "Mi casa", "Mon foyer"],
  Comunidade: ["Community", "Comunidad", "Communauté"],
  Comunidades: ["Communities", "Comunidades", "Communautés"],
  Videoconsulta: ["Video appointment", "Videoconsulta", "Téléconsultation"],
  "Fale Conosco": ["Contact us", "Contáctanos", "Nous contacter"],
  "Convite de acompanhamento": [
    "Care invitation",
    "Invitación de seguimiento",
    "Invitation de suivi",
  ],
  "Convites de comunidades": [
    "Community invitations",
    "Invitaciones de comunidades",
    "Invitations de communautés",
  ],
  Desafio: ["Challenge", "Desafío", "Défi"],
  "Desafios & Aprendizado": [
    "Challenges & learning",
    "Desafíos y aprendizaje",
    "Défis et apprentissage",
  ],
  "Diretrizes da Comunidade": [
    "Community Guidelines",
    "Normas de la Comunidad",
    "Règles de la communauté",
  ],
  "Espaço de Hoje": ["Today's space", "Espacio de hoy", "Espace du jour"],
  "Evento ao vivo": ["Live event", "Evento en vivo", "Événement en direct"],
  Explorar: ["Explore", "Explorar", "Explorer"],
  "Calendário da feira": ["Market calendar", "Calendario del mercado", "Calendrier du marché"],
  Funções: ["Tools", "Funciones", "Fonctions"],
  "O que tem na geladeira?": [
    "What's in the fridge?",
    "¿Qué hay en la nevera?",
    "Qu'y a-t-il dans le frigo ?",
  ],
  "Lancheira da semana": [
    "Weekly lunchbox",
    "Lonchera de la semana",
    "Boîte à goûter de la semaine",
  ],
  Entrar: ["Sign in", "Iniciar sesión", "Se connecter"],
  Nina: ["Nina", "Nina", "Nina"],
  Notificações: ["Notifications", "Notificaciones", "Notifications"],
  "Pagamento da consulta": [
    "Appointment payment",
    "Pago de la consulta",
    "Paiement de la consultation",
  ],
  "Painel clínico": ["Clinical dashboard", "Panel clínico", "Tableau de bord clinique"],
  "Parceiro de jornada": ["Journey partner", "Compañero de camino", "Partenaire de parcours"],
  Perfil: ["Profile", "Perfil", "Profil"],
  "Conta e segurança": ["Account and security", "Cuenta y seguridad", "Compte et sécurité"],
  "Dados e histórico": ["Data and history", "Datos e historial", "Données et historique"],
  "Idioma e região": ["Language and region", "Idioma y región", "Langue et région"],
  Configurações: ["Settings", "Ajustes", "Paramètres"],
  Privacidade: ["Privacy", "Privacidad", "Confidentialité"],
  "Editar perfil": ["Edit profile", "Editar perfil", "Modifier le profil"],
  Personalização: ["Personalization", "Personalización", "Personnalisation"],
  "Política de Privacidade": [
    "Privacy Policy",
    "Política de Privacidad",
    "Politique de confidentialité",
  ],
  "Agendar consulta": ["Book an appointment", "Agendar consulta", "Prendre rendez-vous"],
  "Profissionais verificados": [
    "Verified professionals",
    "Profesionales verificados",
    "Professionnels vérifiés",
  ],
  Programas: ["Programs", "Programas", "Programmes"],
  "Pontos e recompensas": ["Points and rewards", "Puntos y recompensas", "Points et récompenses"],
  "Recuperar senha": ["Reset password", "Recuperar contraseña", "Réinitialiser le mot de passe"],
  "Sobre Nós": ["About us", "Sobre nosotros", "À propos"],
  "Tema da Semana": ["Theme of the week", "Tema de la semana", "Thème de la semaine"],
  "O Pulso da Comunidade": [
    "The community pulse",
    "El pulso de la comunidad",
    "Le pouls de la communauté",
  ],
  "Termos de Uso": ["Terms of Use", "Términos de Uso", "Conditions d'utilisation"],
  "Verificação profissional": [
    "Professional verification",
    "Verificación profesional",
    "Vérification professionnelle",
  ],
};

const IDX: Partial<Record<Locale, 0 | 1 | 2>> = { en: 0, es: 1, fr: 2 };

/**
 * Traduz um título como "Cardápio da semana — NutriConnect" ou "Espaço de Hoje | NutriConnect",
 * parte por parte. Partes sem tradução ficam como estão (ex.: o nome de uma comunidade).
 */
export function translateTitle(title: string, locale: Locale): string {
  const i = IDX[locale];
  if (i === undefined) return title;
  return title
    .split(/(\s[—|]\s)/)
    .map((part) => PAGE_TITLES[part]?.[i] ?? part)
    .join("");
}

/**
 * Mantém o título da aba no idioma escolhido: observa as trocas de <title> feitas pelo roteador e
 * a troca de idioma. Retorna a limpeza.
 */
export function installTitleTranslation(getLocale: () => Locale, localeEvent: string) {
  let original = document.title;
  let applied = document.title;
  const apply = () => {
    if (document.title !== applied) original = document.title; // o roteador trocou de página
    applied = translateTitle(original, getLocale());
    if (document.title !== applied) document.title = applied;
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.head, { subtree: true, childList: true, characterData: true });
  window.addEventListener(localeEvent, apply);
  return () => {
    observer.disconnect();
    window.removeEventListener(localeEvent, apply);
  };
}
