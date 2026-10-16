export const rewriteSocialText = async () => ({ text: "" });
export const suggestSocialPosts = async () => ({ ideas: [] });
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
export const socialTrendsBrief = async () => ({}); export const analyzeSocialProfile = async () => ({});
