// Catálogo de tudo o que o NutriConnect faz: cada página, função e funcionalidade, com para que
// serve, o que dá para fazer e como usar. É a fonte única de Admin → Documentação e da lista de
// itens avaliados em Admin → Qualidade (docs/QUALIDADE.md). Página nova no site = item novo aqui.
import type { Area, CatalogItem } from "@/lib/quality/catalog-types";
import { CATALOG_A } from "@/lib/quality/catalog-a";
import { CATALOG_B } from "@/lib/quality/catalog-b";
import { CATALOG_C } from "@/lib/quality/catalog-c";

export const AREAS: Area[] = [
  {
    id: "entrada",
    name: "Entrada e apresentação",
    text: "O que a pessoa vê antes de entrar: página inicial, apresentação, cadastro e login.",
  },
  {
    id: "social",
    name: "Rede social",
    text: "Espaço, Explorar, Comunidades, eventos, perfis e notificações.",
  },
  {
    id: "dia",
    name: "Funções do dia",
    text: "Ferramentas rápidas da página Funções: água, hábitos, humor, quiz, dicas e mais.",
  },
  {
    id: "cozinha",
    name: "Cozinha e compras",
    text: "Lista de compras, Minha casa, Geladeira, Cardápio, Feira, Lancheira e receitas.",
  },
  {
    id: "trilha",
    name: "Trilha e desafios",
    text: "Trilhas de aprendizado, desafios em grupo, Tema da semana e Parceiro de jornada.",
  },
  {
    id: "cuidado",
    name: "Cuidado e saúde",
    text: "Profissionais, consultas, acompanhamento, rótulos, programas e a Nina.",
  },
  {
    id: "profissional",
    name: "Painel do profissional",
    text: "O consultório dentro do NutriConnect: pacientes, agenda, planos, finanças e loja.",
  },
  {
    id: "conta",
    name: "Conta e personalização",
    text: "Perfil, configurações, idioma, privacidade, notificações e aparência.",
  },
  {
    id: "admin",
    name: "Administração",
    text: "O console da equipe: pessoas, conteúdo, site, negócio e sistema.",
  },
  {
    id: "institucional",
    name: "Páginas institucionais",
    text: "Sobre, contato, termos, privacidade e diretrizes da comunidade.",
  },
  {
    id: "app",
    name: "App Android",
    text: "O app instalável e os recursos nativos do celular.",
  },
];

/** Na ordem do menu da documentação: entrada, social, dia e cozinha (A); trilha e cuidado (B);
 * painel do profissional, conta, admin, institucional e app (C). */
export const CATALOG: CatalogItem[] = [...CATALOG_A, ...CATALOG_B, ...CATALOG_C];

export const CATALOG_BY_ID = Object.fromEntries(CATALOG.map((i) => [i.id, i])) as Record<
  string,
  CatalogItem
>;
