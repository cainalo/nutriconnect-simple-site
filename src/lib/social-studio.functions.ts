// Estúdio de redes sociais (S1): a IA analisa os perfis do NutriConnect a partir do que a equipe
// colou/enviou (bio, legendas, números, print), sugere posts e ações de engajamento, transforma as
// tendências internas da rede em oportunidades e reescreve textos. Só para quem tem acesso ao
// estúdio (social_studio_allowed). Cota própria de IA ("social"); enquanto a Edge Function ai-chat
// não conhecer esse tipo, usa a cota "summary".
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AiChatResult } from "@/lib/ai-gateway.server";
import { parseJson, strList } from "@/lib/fridge.functions";
import { upcomingHealthDates } from "@/lib/social-calendar";
import { seasonNamesPt } from "@/lib/season-data";

export const SOCIAL_DAILY_LIMIT = 40;

export const NETWORKS = [
  "instagram",
  "tiktok",
  "facebook",
  "linkedin",
  "youtube",
  "x",
  "outro",
] as const;
export type Network = (typeof NETWORKS)[number];
export const FORMATS = ["post", "carrossel", "reels", "story", "video", "texto"] as const;
export type PostFormat = (typeof FORMATS)[number];
export const GOALS = ["engajamento", "alcance", "autoridade", "conversao", "comunidade"] as const;
export type Goal = (typeof GOALS)[number];

export type StudioError = "forbidden" | "limit" | "unavailable" | "failed";

export interface SocialAnalysis {
  resumo: string;
  tom_atual: string;
  publico: string;
  pilares: string[];
  pontos_fortes: string[];
  melhorar: string[];
  formatos_recomendados: string[];
  frequencia: string;
  melhores_horarios: string;
  acoes_engajamento: string[];
  bio_sugerida: string;
  metas_30_dias: string[];
}

export interface PostIdea {
  format: PostFormat;
  title: string;
  hook: string;
  caption: string;
  slides: { title: string; text: string }[];
  script: string;
  hashtags: string[];
  cta: string;
  visual_idea: string;
  pillar: string;
  best_time: string;
}

export interface TrendOpportunity {
  titulo: string;
  por_que: string;
  ideia: string;
  formato: string;
  quando: string;
}

const NETWORK_PT: Record<Network, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  x: "X (Twitter)",
  outro: "rede social",
};
const GOAL_PT: Record<Goal, string> = {
  engajamento: "ENGAJAMENTO (comentários, salvamentos, compartilhamentos, respostas nos stories)",
  alcance: "ALCANCE (atrair gente nova: conteúdo compartilhável, tendências, Reels)",
  autoridade:
    "AUTORIDADE (conteúdo educativo confiável, com base científica, desmistificando mitos)",
  conversao:
    "CONVERSÃO (levar pessoas a criar conta no NutriConnect e a conhecer os profissionais)",
  comunidade:
    "COMUNIDADE (fazer as pessoas se sentirem parte: histórias, bastidores, participação)",
};

const BRAND = `O NutriConnect é uma rede social brasileira de educação alimentar: feed com receitas e
experiências, comunidades por tema, desafios, trilha de aprendizado gamificada (com perfis
infantis), a assistente de IA Nina, diário alimentar, leitor de rótulos, cardápio da semana, grupo
familiar ("Minha casa") e nutricionistas e profissionais verificados com consulta por vídeo.
Tom da marca: acolhedor, leve, científico sem ser chato, sem culpa e sem terrorismo nutricional;
"comida de verdade" no espírito do Guia Alimentar para a População Brasileira; inclusivo e
brasileiro. Mascotes: a Nina e os personagens da trilha.`;

const ETHICS = `Regras obrigatórias (ética do Código de Ética do Nutricionista, CFN, e do CONAR):
- Nada de fotos de "antes e depois", promessas de resultado, emagrecimento rápido ou garantias.
- Nada de prescrição individual (dieta, suplemento, quantidade) em post; oriente a procurar um(a)
  nutricionista. Sem citar marcas de suplementos ou remédios.
- Nada de terrorismo nutricional, demonização de alimentos, culpa ou corpo ideal; sem números de
  peso e calorias como chamariz.
- Informação correta e atual; na dúvida, seja conservador e convide para conversar com profissional.
- Linguagem inclusiva, sem gordofobia, adequada para todas as idades.`;

const locale = z.enum(["pt-BR", "en", "es", "fr"]).default("pt-BR");
const LANG: Record<string, string> = {
  "pt-BR": "português do Brasil",
  en: "English",
  es: "español",
  fr: "français",
};

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient };

async function allowed(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("social_studio_allowed");
  return !!data;
}

/** Chama a IA na cota "social" (ou "summary", enquanto a Edge Function não conhecer "social"). */
async function studioChat(opts: {
  system: string;
  user: string;
  temperature?: number;
  image?: string;
}): Promise<AiChatResult> {
  const { aiChat } = await import("./ai-gateway.server");
  const call = (kind: "social" | "summary") =>
    aiChat({
      kind,
      system: opts.system,
      messages: [{ role: "user", content: opts.user.slice(0, 7900) }],
      temperature: opts.temperature ?? 0.8,
      image: opts.image,
    });
  const first = await call("social");
  if (!first.ok && first.status === 400 && /tipo de uso/i.test(first.message ?? "")) {
    return call("summary");
  }
  return first;
}

function studioError(r: AiChatResult): StudioError {
  if (r.ok) return "failed";
  if (r.limit) return "limit";
  return [400, 402, 403, 503].includes(r.status) ? "unavailable" : "failed";
}

const str = (v: unknown, len: number) => (typeof v === "string" ? v.trim().slice(0, len) : "");

// ---------------------------------------------------------------------------
// Análise de um perfil
// ---------------------------------------------------------------------------

const analyzeSchema = z.object({
  profileId: z.string().uuid(),
  image: z
    .string()
    .regex(/^data:image\/(jpeg|png|webp);base64,/)
    .max(4_000_000)
    .optional(),
  locale,
});

export const analyzeSocialProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => analyzeSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<{ analysis: SocialAnalysis } | { error: StudioError }> => {
      if (!(await allowed(context))) return { error: "forbidden" };
      const { data: profile } = await context.supabase
        .from("social_profiles")
        .select("*")
        .eq("id", data.profileId)
        .maybeSingle();
      if (!profile) return { error: "forbidden" };
      const m = (profile.metrics ?? {}) as Record<string, unknown>;
      const metrics = Object.entries(m)
        .filter(([, v]) => v !== null && v !== "" && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ");

      const system = `Você é estrategista sênior de redes sociais para marcas de saúde e nutrição no Brasil.
${BRAND}
${ETHICS}
Analise o perfil a partir do que a equipe informou (e do print, se houver). Seja concreto e prático,
cite exemplos do próprio material. Não invente números que não foram informados.
Responda em ${LANG[data.locale]}, SOMENTE com um JSON neste formato:
{"resumo": "...", "tom_atual": "...", "publico": "...", "pilares": ["..."], "pontos_fortes": ["..."],
"melhorar": ["..."], "formatos_recomendados": ["..."], "frequencia": "...", "melhores_horarios": "...",
"acoes_engajamento": ["..."], "bio_sugerida": "...", "metas_30_dias": ["..."]}
Listas com 3 a 6 itens curtos.`;
      const user = [
        `Rede: ${NETWORK_PT[profile.network as Network] ?? profile.network}. Perfil: ${profile.handle}${profile.url ? ` (${profile.url})` : ""}.`,
        profile.notes ? `Sobre a conta (bio, público, objetivo): ${profile.notes}` : "",
        metrics ? `Números informados: ${metrics}.` : "Nenhum número informado.",
        profile.sample_posts
          ? `Legendas recentes:\n${profile.sample_posts}`
          : "Nenhuma legenda colada.",
        data.image ? "Há um print do perfil anexado." : "",
      ]
        .filter(Boolean)
        .join("\n");

      const result = await studioChat({ system, user, temperature: 0.5, image: data.image });
      if (!result.ok) return { error: studioError(result) };
      const p = parseJson(result.text) as Record<string, unknown> | null;
      if (!p) return { error: "failed" };
      const analysis: SocialAnalysis = {
        resumo: str(p.resumo, 1200),
        tom_atual: str(p.tom_atual, 400),
        publico: str(p.publico, 400),
        pilares: strList(p.pilares, 8, 120),
        pontos_fortes: strList(p.pontos_fortes, 8, 240),
        melhorar: strList(p.melhorar, 8, 240),
        formatos_recomendados: strList(p.formatos_recomendados, 8, 160),
        frequencia: str(p.frequencia, 240),
        melhores_horarios: str(p.melhores_horarios, 240),
        acoes_engajamento: strList(p.acoes_engajamento, 8, 240),
        bio_sugerida: str(p.bio_sugerida, 300),
        metas_30_dias: strList(p.metas_30_dias, 6, 200),
      };
      await context.supabase
        .from("social_profiles")
        .update({ analysis: analysis as never, analyzed_at: new Date().toISOString() })
        .eq("id", profile.id);
      return { analysis };
    },
  );

// ---------------------------------------------------------------------------
// Ideias de posts
// ---------------------------------------------------------------------------

const ideasSchema = z.object({
  profileId: z.string().uuid().optional(),
  network: z.enum(NETWORKS).default("instagram"),
  goal: z.enum(GOALS).default("engajamento"),
  formats: z.array(z.enum(FORMATS)).min(1).max(6).default(["post", "carrossel", "reels"]),
  count: z.number().int().min(1).max(8).default(4),
  theme: z.string().trim().max(300).default(""),
  useTrends: z.boolean().default(true),
  locale,
});

async function trendContext(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("social_trends", { p_days: 14 });
  const t = (data ?? {}) as Record<string, unknown>;
  const posts = (Array.isArray(t.top_posts) ? t.top_posts : []) as Record<string, unknown>[];
  const tags = (Array.isArray(t.top_tags) ? t.top_tags : []) as Record<string, unknown>[];
  const theme = t.theme as { title?: string } | null;
  const dates = upcomingHealthDates();
  const season = seasonNamesPt("SE").slice(0, 15);
  return {
    text: [
      theme?.title ? `Tema da semana na rede: ${theme.title}.` : "",
      posts.length
        ? `Publicações em alta na rede (últimas 2 semanas): ${posts
            .slice(0, 8)
            .map(
              (p) =>
                `"${String(p.title ?? "").slice(0, 80)}" (${p.reactions} apoios, ${p.comments} comentários)`,
            )
            .join("; ")}.`
        : "",
      tags.length ? `Assuntos mais marcados: ${tags.map((x) => x.tag).join(", ")}.` : "",
      dates.length
        ? `Datas próximas: ${dates.map((d) => `${d.day ? `${d.day}/${d.month} ` : `mês ${d.month}: `}${d.title} (${d.angle})`).join("; ")}.`
        : "",
      season.length ? `Da estação agora (Sudeste): ${season.join(", ")}.` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export const suggestSocialPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ideasSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ideas: PostIdea[] } | { error: StudioError }> => {
    if (!(await allowed(context))) return { error: "forbidden" };
    let profileText = "";
    if (data.profileId) {
      const { data: profile } = await context.supabase
        .from("social_profiles")
        .select("handle, notes, analysis")
        .eq("id", data.profileId)
        .maybeSingle();
      if (profile) {
        const a = (profile.analysis ?? {}) as Partial<SocialAnalysis>;
        profileText = [
          `Perfil: ${profile.handle}.`,
          profile.notes ? `Sobre a conta: ${profile.notes.slice(0, 800)}` : "",
          a.pilares?.length ? `Pilares definidos: ${a.pilares.join(", ")}.` : "",
          a.tom_atual ? `Tom atual: ${a.tom_atual}` : "",
          a.melhorar?.length ? `O que melhorar: ${a.melhorar.join("; ")}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }
    }
    const trends = data.useTrends ? (await trendContext(context)).text : "";

    const system = `Você é social media sênior de uma marca de saúde e nutrição no Brasil.
${BRAND}
${ETHICS}
Crie ${data.count} ideias de conteúdo prontas para publicar no ${NETWORK_PT[data.network]}, com objetivo de
${GOAL_PT[data.goal]}. Formatos permitidos: ${data.formats.join(", ")} (varie entre eles).
Cada ideia: título interno, gancho forte para os 2 primeiros segundos/linha, legenda completa no tom
da marca (com quebras de linha e emojis com moderação), slides do carrossel (5 a 8, só em
"carrossel"), roteiro com cenas e falas (só em "reels"/"video"/"story"), 5 a 12 hashtags relevantes
em português (sem #), chamada para ação, ideia visual e pilar de conteúdo. Para engajamento, inclua
perguntas, enquetes ou caixinhas. Use as tendências quando fizer sentido, sem forçar.
Responda em ${LANG[data.locale]}, SOMENTE com JSON:
{"ideas": [{"format": "carrossel", "title": "...", "hook": "...", "caption": "...",
"slides": [{"title": "...", "text": "..."}], "script": "...", "hashtags": ["..."], "cta": "...",
"visual_idea": "...", "pillar": "...", "best_time": "..."}]}`;
    const user =
      [
        profileText,
        data.theme ? `Pedido da equipe: ${data.theme}` : "",
        trends ? `Contexto do momento:\n${trends}` : "",
      ]
        .filter(Boolean)
        .join("\n\n") || "Crie ideias variadas para a marca.";

    const result = await studioChat({ system, user, temperature: 0.9 });
    if (!result.ok) return { error: studioError(result) };
    const p = parseJson(result.text) as { ideas?: unknown } | null;
    const list = Array.isArray(p?.ideas) ? (p.ideas as Record<string, unknown>[]) : [];
    const ideas = list
      .map((r): PostIdea | null => {
        const title = str(r.title, 160);
        if (!title) return null;
        const format = (FORMATS as readonly string[]).includes(String(r.format))
          ? (r.format as PostFormat)
          : data.formats[0];
        const slides = Array.isArray(r.slides)
          ? (r.slides as Record<string, unknown>[])
              .map((s) => ({ title: str(s?.title, 120), text: str(s?.text, 400) }))
              .filter((s) => s.title || s.text)
              .slice(0, 10)
          : [];
        return {
          format,
          title,
          hook: str(r.hook, 300),
          caption: str(r.caption, 5000),
          slides,
          script: str(r.script, 5000),
          hashtags: strList(r.hashtags, 30, 40).map((h) => h.replace(/^#/, "").replace(/\s+/g, "")),
          cta: str(r.cta, 300),
          visual_idea: str(r.visual_idea, 1000),
          pillar: str(r.pillar, 80),
          best_time: str(r.best_time, 120),
        };
      })
      .filter((x): x is PostIdea => !!x)
      .slice(0, data.count);
    if (!ideas.length) return { error: "failed" };
    return { ideas };
  });

// ---------------------------------------------------------------------------
// Tendências e oportunidades
// ---------------------------------------------------------------------------

const trendsSchema = z.object({ network: z.enum(NETWORKS).default("instagram"), locale });

export const socialTrendsBrief = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => trendsSchema.parse(data))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ opportunities: TrendOpportunity[] } | { error: StudioError }> => {
      if (!(await allowed(context))) return { error: "forbidden" };
      const ctx = await trendContext(context);
      const system = `Você é estrategista de conteúdo de uma marca de saúde e nutrição no Brasil.
${BRAND}
${ETHICS}
Com base no contexto (o que está em alta DENTRO da rede NutriConnect, datas do calendário de saúde e
alimentos da estação), aponte 6 oportunidades de conteúdo para o ${NETWORK_PT[data.network]} nas próximas
semanas. Para cada uma: título, por que agora, ideia de post concreta, formato e quando publicar.
Também considere formatos que costumam funcionar bem nessa rede. Não afirme tendências externas que
você não pode verificar.
Responda em ${LANG[data.locale]}, SOMENTE com JSON:
{"opportunities": [{"titulo": "...", "por_que": "...", "ideia": "...", "formato": "...", "quando": "..."}]}`;
      const result = await studioChat({
        system,
        user: ctx.text || "Sem dados internos suficientes: use o calendário de saúde e a estação.",
        temperature: 0.7,
      });
      if (!result.ok) return { error: studioError(result) };
      const p = parseJson(result.text) as { opportunities?: unknown } | null;
      const list = Array.isArray(p?.opportunities)
        ? (p.opportunities as Record<string, unknown>[])
        : [];
      const opportunities = list
        .map((o) => ({
          titulo: str(o.titulo, 160),
          por_que: str(o.por_que, 500),
          ideia: str(o.ideia, 800),
          formato: str(o.formato, 60),
          quando: str(o.quando, 120),
        }))
        .filter((o) => o.titulo)
        .slice(0, 8);
      return { opportunities };
    },
  );

// ---------------------------------------------------------------------------
// Reescrever / adaptar um texto
// ---------------------------------------------------------------------------

const rewriteSchema = z.object({
  text: z.string().trim().min(1).max(5000),
  instruction: z.string().trim().min(1).max(300),
  network: z.enum(NETWORKS).default("instagram"),
  locale,
});

export const rewriteSocialText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => rewriteSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ text: string } | { error: StudioError }> => {
    if (!(await allowed(context))) return { error: "forbidden" };
    const system = `Você é redator(a) de redes sociais de uma marca de saúde e nutrição no Brasil.
${BRAND}
${ETHICS}
Reescreva o texto para o ${NETWORK_PT[data.network]} seguindo a instrução. Responda em ${LANG[data.locale]}, só
com o texto final (sem aspas, sem comentários).`;
    const result = await studioChat({
      system,
      user: `Instrução: ${data.instruction}\n\nTexto:\n${data.text}`,
      temperature: 0.7,
    });
    if (!result.ok) return { error: studioError(result) };
    const text = result.text
      .replace(/^["“]|["”]$/g, "")
      .trim()
      .slice(0, 5000);
    return text ? { text } : { error: "failed" };
  });
