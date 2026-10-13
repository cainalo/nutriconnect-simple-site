// Certificado de conclusão de uma trilha (M6): PDF A4 deitado, com o nome da pessoa, a trilha, os
// capítulos vencidos, as estrelas e um código de verificação. Educativo: não é título profissional.
import { pickName, type Names } from "@/lib/appearance-data";
import type { Locale } from "@/lib/i18n";
import type { Trail, TrailProgress } from "@/lib/trail-types";

const n = (pt: string, en: string, es: string, fr: string): Names => [pt, en, es, fr];
const LOCALE_TAG: Record<string, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

const L = {
  title: n(
    "Certificado de conclusão",
    "Certificate of completion",
    "Certificado de finalización",
    "Certificat de réussite",
  ),
  kidTitle: n(
    "Certificado de Campeão",
    "Champion Certificate",
    "Certificado de Campeón",
    "Certificat de Champion",
  ),
  intro: n("Certificamos que", "This certifies that", "Certificamos que", "Nous certifions que"),
  body: n(
    "concluiu todas as paradas e níveis da trilha de aprendizado",
    "has completed every stop and level of the learning trail",
    "completó todas las paradas y niveles de la ruta de aprendizaje",
    "a terminé toutes les étapes et tous les niveaux du parcours",
  ),
  chapters: n(
    "Capítulos vencidos",
    "Chapters completed",
    "Capítulos completados",
    "Chapitres terminés",
  ),
  stars: n(
    "{a} de {b} estrelas",
    "{a} of {b} stars",
    "{a} de {b} estrellas",
    "{a} étoiles sur {b}",
  ),
  issued: n("Emitido em {d}", "Issued on {d}", "Emitido el {d}", "Délivré le {d}"),
  code: n("Código", "Code", "Código", "Code"),
  note: n(
    "Certificado educativo da Trilha de Aprendizado NutriConnect. Não substitui formação ou registro profissional.",
    "Educational certificate from the NutriConnect Learning Trail. It is not a professional qualification.",
    "Certificado educativo de la Ruta de Aprendizaje NutriConnect. No sustituye formación ni registro profesional.",
    "Certificat éducatif du Parcours d'apprentissage NutriConnect. Il ne remplace pas un diplôme professionnel.",
  ),
  guide: n(
    "Nutri Nina e a turma",
    "Nutri Nina and the crew",
    "Nutri Nina y el equipo",
    "Nutri Nina et l'équipe",
  ),
};

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

/** Código curto e estável para a mesma pessoa e trilha. */
function codeFor(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

export async function exportTrailCertificate(input: {
  trail: Trail;
  progress: TrailProgress;
  name: string;
  userId: string;
  locale: Locale;
}) {
  const { jsPDF } = await import("jspdf");
  const { trail, progress, locale } = input;
  const tr = (names: Names) => pickName(names, locale);
  const kid = trail.kind === "kid";
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  const gold = [197, 138, 18] as const;
  const brand = kid ? ([217, 105, 42] as const) : ([85, 95, 54] as const);
  const ink = [52, 45, 36] as const;
  const muted = [109, 99, 85] as const;

  // Fundo e moldura dupla
  doc.setFillColor(253, 250, 242);
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(brand[0], brand[1], brand[2]);
  doc.setLineWidth(2.2);
  doc.rect(9, 9, W - 18, H - 18);
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.6);
  doc.rect(13, 13, W - 26, H - 26);
  // Cantos decorados
  for (const [x, y] of [
    [13, 13],
    [W - 13, 13],
    [13, H - 13],
    [W - 13, H - 13],
  ]) {
    doc.setFillColor(gold[0], gold[1], gold[2]);
    doc.circle(x, y, 2.4, "F");
  }

  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.setFont("times", "bold");
  doc.setFontSize(20);
  doc.text("NutriConnect", W / 2, 32, { align: "center" });

  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.text(tr(kid ? L.kidTitle : L.title), W / 2, 50, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(tr(L.intro), W / 2, 66, { align: "center" });

  doc.setFont("times", "bolditalic");
  doc.setFontSize(32);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(input.name, W / 2, 82, { align: "center" });
  doc.setDrawColor(gold[0], gold[1], gold[2]);
  doc.setLineWidth(0.4);
  doc.line(W / 2 - 70, 86, W / 2 + 70, 86);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(tr(L.body), W / 2, 98, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(brand[0], brand[1], brand[2]);
  doc.text(trail.title, W / 2, 110, { align: "center" });

  // Capítulos e estrelas
  const stars = trail.units
    .flatMap((u) => u.stops)
    .reduce(
      (s, st) => s + (progress.stops[st.id]?.stars ?? [0, 0, 0]).reduce((a, b) => a + b, 0),
      0,
    );
  const maxStars = trail.units.reduce((s, u) => s + u.stops.length * 9, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  const chapters = `${tr(L.chapters)}: ${trail.units.map((u) => u.title).join(" · ")}`;
  doc.text(doc.splitTextToSize(chapters, W - 80), W / 2, 122, { align: "center" });
  doc.setTextColor(gold[0], gold[1], gold[2]);
  doc.setFont("helvetica", "bold");
  doc.text(fill(tr(L.stars), { a: stars, b: maxStars }), W / 2, 134, { align: "center" });

  // Selo dourado
  const sx = W - 52;
  const sy = H - 58;
  doc.setFillColor(gold[0], gold[1], gold[2]);
  doc.circle(sx, sy, 17, "F");
  doc.setFillColor(246, 195, 67);
  doc.circle(sx, sy, 13.5, "F");
  doc.setTextColor(120, 75, 10);
  doc.setFont("times", "bold");
  doc.setFontSize(9);
  doc.text("NUTRI", sx, sy - 1.5, { align: "center" });
  doc.text("CONNECT", sx, sy + 3.5, { align: "center" });

  // Assinatura e data
  const date = new Date().toLocaleDateString(LOCALE_TAG[locale] ?? "pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  doc.setDrawColor(muted[0], muted[1], muted[2]);
  doc.line(40, H - 52, 110, H - 52);
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.setTextColor(ink[0], ink[1], ink[2]);
  doc.text(tr(L.guide), 75, H - 56, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(muted[0], muted[1], muted[2]);
  doc.text(fill(tr(L.issued), { d: date }), 75, H - 46, { align: "center" });
  const code = codeFor(`${input.userId}:${trail.id}`);
  doc.text(`${tr(L.code)}: NC-${code}`, 75, H - 41, { align: "center" });

  doc.setFontSize(8);
  doc.text(tr(L.note), W / 2, H - 20, { align: "center" });

  const file = `certificado-${trail.id}.pdf`;
  doc.save(file);
  return file;
}
