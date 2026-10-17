// Relatório "Minha evolução" (N9): o resumo de um mês da pessoa em PDF (A4), para guardar ou levar à
// consulta. Junta água, hábitos, humor com a comida, metas, diário, consultas, a trilha e, fora do
// modo sem números, as medidas. Educativo e gentil: sem calorias e sem notas; mostra constância,
// não perfeição.
import { supabase } from "@/integrations/supabase/client";
import { pickName, type Names } from "@/lib/appearance-data";
import { listAppointments } from "@/lib/clinical/api";
import { listDiary } from "@/lib/clinical/care";
import { adherence } from "@/lib/clinical/goals";
import { listAnthropometrics, listCheckins, listGoals } from "@/lib/clinical/records";
import { HABIT_CATALOG } from "@/lib/habits";
import type { Locale } from "@/lib/i18n";
import { FEELINGS, HUNGER_WORDS, SATIETY_WORDS } from "@/lib/no-numbers";
import type { TrailProgress } from "@/lib/trail-types";
import { DEFAULT_GOAL } from "@/lib/water";

const n = (pt: string, en: string, es: string, fr: string): Names => [pt, en, es, fr];
const pad = (v: number) => String(v).padStart(2, "0");

/** Mês do relatório (month de 0 a 11). */
export interface MonthKey {
  year: number;
  month: number;
}

export const monthKeyOf = (d = new Date()): MonthKey => ({
  year: d.getFullYear(),
  month: d.getMonth(),
});

/** Os últimos `count` meses, do atual para trás. */
export function recentMonths(count = 6): MonthKey[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) =>
    monthKeyOf(new Date(now.getFullYear(), now.getMonth() - i, 1)),
  );
}

const LOCALE_TAG: Record<string, string> = {
  "pt-BR": "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

export function monthLabel(m: MonthKey, locale: Locale) {
  const s = new Date(m.year, m.month, 1).toLocaleDateString(LOCALE_TAG[locale] ?? "pt-BR", {
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function range(m: MonthKey) {
  const days = new Date(m.year, m.month + 1, 0).getDate();
  const first = `${m.year}-${pad(m.month + 1)}-01`;
  const last = `${m.year}-${pad(m.month + 1)}-${pad(days)}`;
  const today = new Date();
  const current = today.getFullYear() === m.year && today.getMonth() === m.month;
  // No mês atual, conta só até hoje.
  const counted = current ? today.getDate() : days;
  return {
    days,
    counted,
    first,
    last,
    fromIso: new Date(m.year, m.month, 1).toISOString(),
    toIso: new Date(m.year, m.month + 1, 1).toISOString(),
    dayKeys: Array.from({ length: days }, (_, i) => `${m.year}-${pad(m.month + 1)}-${pad(i + 1)}`),
  };
}

/** Hábitos do catálogo, na ordem em que aparecem no relatório (só os marcados no mês). */
export const HABIT_IDS = HABIT_CATALOG.map((h) => h.id);

export interface MonthlyReport {
  month: MonthKey;
  days: number;
  /** Dias do mês já vividos (o mês atual ainda não acabou). */
  counted: number;
  water: { perDay: number[]; goal: number; daysLogged: number; daysAtGoal: number };
  habits: Record<string, number>;
  /** Dias com 3 ou mais hábitos marcados. */
  habitDays: number;
  moods: [number, number, number, number];
  mindfulMeals: number;
  pledgeDays: number;
  goals: { title: string; days: number; pct: number }[];
  diary: {
    entries: number;
    photos: number;
    followedPlan: number;
    answeredPlan: number;
    hunger: number | null;
    satiety: number | null;
    feelings: { id: string; count: number }[];
    alerts: number;
  };
  body: { from: number; to: number; count: number } | null;
  appointments: number;
  trail: { xp: number; streak: number; achievements: number; levels: number } | null;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Junta os dados do mês da pessoa logada. */
export async function collectMonthlyReport(
  userId: string,
  m: MonthKey,
  trail: TrailProgress | null,
): Promise<MonthlyReport> {
  const r = range(m);
  const [waterDays, waterSettings, checkins, goals, goalCheckins, diary, body, appts] =
    await Promise.all([
      supabase
        .from("water_days")
        .select("day, glasses")
        .eq("user_id", userId)
        .gte("day", r.first)
        .lte("day", r.last)
        .then(({ data }) => data ?? []),
      supabase
        .from("water_settings")
        .select("goal_glasses")
        .eq("user_id", userId)
        .maybeSingle()
        .then(({ data }) => data),
      supabase
        .from("daily_checkins")
        .select("*")
        .eq("user_id", userId)
        .gte("day", r.first)
        .lte("day", r.last)
        .then(({ data }) => data ?? []),
      listGoals(userId).catch(() => []),
      listCheckins(userId, r.first).catch(() => []),
      listDiary(userId, 400).catch(() => []),
      listAnthropometrics(userId).catch(() => []),
      listAppointments({ role: "patient", from: r.fromIso, to: r.toIso }).catch(() => []),
    ]);

  const goal = waterSettings?.goal_glasses ?? DEFAULT_GOAL;
  const glassesOn = new Map(waterDays.map((d) => [d.day, d.glasses]));
  const perDay = r.dayKeys.map((d) => glassesOn.get(d) ?? 0);

  const habits: Record<string, number> = Object.fromEntries(HABIT_IDS.map((id) => [id, 0]));
  const moods: [number, number, number, number] = [0, 0, 0, 0];
  let habitDays = 0;
  let mindfulMeals = 0;
  let pledgeDays = 0;
  for (const c of checkins) {
    for (const h of c.habits) if (h in habits) habits[h] += 1;
    if (c.habits.length >= 3) habitDays += 1;
    if (c.mood != null && c.mood >= 0 && c.mood <= 3) moods[c.mood] += 1;
    mindfulMeals += c.mindful_meals;
    if (c.pledge) pledgeDays += 1;
  }

  const monthCheckins = goalCheckins.filter((c) => c.day <= r.last);
  const lived = r.dayKeys.slice(0, r.counted);
  const goalRows = goals
    .filter((g) => g.active)
    .map((g) => ({
      title: g.title,
      days: monthCheckins.filter((c) => c.goal_id === g.id && Number(c.value) > 0).length,
      pct: lived.length ? adherence(g, monthCheckins, lived) : 0,
    }));

  const entries = diary.filter((e) => e.eaten_at >= r.fromIso && e.eaten_at < r.toIso);
  const feelingCount = new Map<string, number>();
  for (const e of entries)
    for (const f of e.feelings ?? []) feelingCount.set(f, (feelingCount.get(f) ?? 0) + 1);
  const alertIds = new Set(FEELINGS.filter((f) => f.alert).map((f) => f.id as string));
  const answered = entries.filter((e) => e.followed_plan != null);

  const weights = body
    .filter((b) => b.weight_kg != null && b.measured_at >= r.first && b.measured_at <= r.last)
    .map((b) => Number(b.weight_kg));

  return {
    month: m,
    days: r.days,
    counted: r.counted,
    water: {
      perDay,
      goal,
      daysLogged: perDay.filter((g) => g > 0).length,
      daysAtGoal: perDay.filter((g) => g >= goal).length,
    },
    habits,
    habitDays,
    moods,
    mindfulMeals,
    pledgeDays,
    goals: goalRows,
    diary: {
      entries: entries.length,
      photos: entries.filter((e) => e.photo_path).length,
      followedPlan: answered.filter((e) => e.followed_plan).length,
      answeredPlan: answered.length,
      hunger: avg(entries.flatMap((e) => (e.hunger_before ? [e.hunger_before] : []))),
      satiety: avg(entries.flatMap((e) => (e.satiety_after ? [e.satiety_after] : []))),
      feelings: [...feelingCount.entries()]
        .filter(([id]) => !alertIds.has(id))
        .map(([id, count]) => ({ id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 4),
      alerts: [...feelingCount.entries()]
        .filter(([id]) => alertIds.has(id))
        .reduce((s, [, c]) => s + c, 0),
    },
    body: weights.length
      ? { from: weights[0], to: weights[weights.length - 1], count: weights.length }
      : null,
    appointments: appts.filter((a) => a.status === "realizada").length,
    trail: trail
      ? {
          xp: trail.totalXP,
          streak: trail.streak,
          achievements: trail.achievements.length,
          levels: Object.values(trail.stops).reduce((s, p) => s + p.done, 0),
        }
      : null,
  };
}

/** Teve algum registro no mês? (para avisar antes de gerar um PDF vazio) */
export const hasAnyData = (r: MonthlyReport) =>
  r.water.daysLogged > 0 ||
  Object.values(r.habits).some((v) => v > 0) ||
  r.moods.some((v) => v > 0) ||
  r.goals.some((g) => g.days > 0) ||
  r.diary.entries > 0 ||
  r.appointments > 0 ||
  !!r.body;

/* ──────────────────────────────── Textos ──────────────────────────────── */

const L = {
  title: n("Minha evolução", "My progress", "Mi evolución", "Mon évolution"),
  intro: n(
    "Um retrato do seu mês: o que você cuidou, como se sentiu e o que aprendeu. Constância vale mais do que perfeição.",
    "A snapshot of your month: what you took care of, how you felt and what you learned. Consistency matters more than perfection.",
    "Un retrato de tu mes: lo que cuidaste, cómo te sentiste y lo que aprendiste. La constancia vale más que la perfección.",
    "Un portrait de votre mois : ce dont vous avez pris soin, ce que vous avez ressenti et appris. La régularité compte plus que la perfection.",
  ),
  water: n("Água", "Water", "Agua", "Eau"),
  waterText: n(
    "Registrou água em {logged} dias e bateu a meta de {goal} copos em {hit}.",
    "Logged water on {logged} days and reached the {goal}-glass goal on {hit}.",
    "Registró agua en {logged} días y alcanzó la meta de {goal} vasos en {hit}.",
    "Eau notée {logged} jours ; objectif de {goal} verres atteint {hit} jours.",
  ),
  habits: n("Hábitos do dia", "Daily habits", "Hábitos del día", "Habitudes du jour"),
  habitDays: n(
    "Dias com 3 ou mais hábitos: {n}",
    "Days with 3 or more habits: {n}",
    "Días con 3 o más hábitos: {n}",
    "Jours avec 3 habitudes ou plus : {n}",
  ),
  feelings: n(
    "Como me senti com a comida",
    "How I felt about food",
    "Cómo me sentí con la comida",
    "Mon ressenti avec la nourriture",
  ),
  moodNames: [
    n("Ótima", "Great", "Genial", "Super"),
    n("Boa", "Good", "Buena", "Bien"),
    n("Normal", "Okay", "Normal", "Moyenne"),
    n("Pesada", "Heavy", "Pesada", "Difficile"),
  ],
  calm: n(
    "Refeições com calma: {n}  ·  Dias do compromisso da semana: {p}",
    "Mindful meals: {n}  ·  Weekly pledge days: {p}",
    "Comidas con calma: {n}  ·  Días del compromiso semanal: {p}",
    "Repas en conscience : {n}  ·  Jours d'engagement : {p}",
  ),
  goals: n("Metas", "Goals", "Metas", "Objectifs"),
  goalLine: n(
    "{days} dias praticados · {pct}% de cumprimento",
    "{days} days practiced · {pct}% completion",
    "{days} días practicados · {pct}% de cumplimiento",
    "{days} jours pratiqués · {pct} % atteint",
  ),
  diary: n("Diário alimentar", "Food diary", "Diario alimentario", "Journal alimentaire"),
  diaryLine: n(
    "{n} registros, {p} com foto.",
    "{n} entries, {p} with a photo.",
    "{n} registros, {p} con foto.",
    "{n} entrées, dont {p} avec photo.",
  ),
  planLine: n(
    "Seguiu o plano em {a} de {b} refeições em que respondeu.",
    "Followed the plan in {a} of {b} meals you answered.",
    "Siguió el plan en {a} de {b} comidas respondidas.",
    "Plan suivi pour {a} repas sur {b} renseignés.",
  ),
  hungerLine: n(
    "Antes de comer, em geral: {h}. Depois: {s}.",
    "Before eating, usually: {h}. After: {s}.",
    "Antes de comer, en general: {h}. Después: {s}.",
    "Avant de manger, en général : {h}. Après : {s}.",
  ),
  feelingsLine: n(
    "Sentimentos mais frequentes: {f}.",
    "Most frequent feelings: {f}.",
    "Sentimientos más frecuentes: {f}.",
    "Ressentis les plus fréquents : {f}.",
  ),
  alertNote: n(
    "Alguns registros falaram de sentimentos difíceis com a comida. Você não precisa passar por isso sozinho(a): conversar com um(a) profissional ajuda.",
    "Some entries mentioned difficult feelings around food. You don't have to go through this alone: talking to a professional helps.",
    "Algunos registros hablaron de sentimientos difíciles con la comida. No tienes que pasar por esto solo(a): hablar con un(a) profesional ayuda.",
    "Certaines entrées parlent de ressentis difficiles avec la nourriture. Vous n'êtes pas seul(e) : en parler à un(e) professionnel(le) aide.",
  ),
  body: n("Medidas", "Measurements", "Medidas", "Mesures"),
  bodyLine: n(
    "Peso no mês: {a} kg no primeiro registro e {b} kg no último ({c} medições).",
    "Weight this month: {a} kg at the first entry and {b} kg at the last ({c} measurements).",
    "Peso en el mes: {a} kg en el primer registro y {b} kg en el último ({c} mediciones).",
    "Poids du mois : {a} kg à la première mesure et {b} kg à la dernière ({c} mesures).",
  ),
  care: n("Acompanhamento", "Care", "Seguimiento", "Suivi"),
  apptLine: n(
    "Consultas realizadas no mês: {n}.",
    "Consultations this month: {n}.",
    "Consultas realizadas en el mes: {n}.",
    "Consultations du mois : {n}.",
  ),
  trail: n(
    "Trilha de aprendizado",
    "Learning trail",
    "Ruta de aprendizaje",
    "Parcours d'apprentissage",
  ),
  trailLine: n(
    "{xp} XP no total · {l} níveis concluídos · {a} conquistas · sequência de {s} dias.",
    "{xp} XP in total · {l} levels completed · {a} achievements · {s}-day streak.",
    "{xp} XP en total · {l} niveles completados · {a} logros · racha de {s} días.",
    "{xp} XP au total · {l} niveaux terminés · {a} succès · série de {s} jours.",
  ),
  empty: n(
    "Sem registros nesta parte do mês.",
    "No entries for this part of the month.",
    "Sin registros en esta parte del mes.",
    "Aucune donnée pour cette partie du mois.",
  ),
  footer: n(
    "Relatório educativo, gerado pela pessoa no NutriConnect. Não substitui o acompanhamento de um(a) profissional de saúde.",
    "Educational report generated by the user on NutriConnect. It does not replace care from a health professional.",
    "Informe educativo generado por la persona en NutriConnect. No sustituye el seguimiento de un(a) profesional de la salud.",
    "Rapport éducatif généré par l'utilisateur sur NutriConnect. Il ne remplace pas le suivi d'un(e) professionnel(le) de santé.",
  ),
  page: n("Página {a} de {b}", "Page {a} of {b}", "Página {a} de {b}", "Page {a} sur {b}"),
};

const fill = (s: string, vars: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

/* ──────────────────────────────── PDF ──────────────────────────────── */

const BRAND = [85, 95, 54] as const;
const ACCENT = [180, 83, 42] as const;
const MUTED = [109, 99, 85] as const;
const INK = [52, 45, 36] as const;
const SOFT = [240, 236, 226] as const;
const WATER = [59, 123, 191] as const;
const MOOD_COLORS = [
  [79, 138, 75],
  [125, 170, 90],
  [197, 138, 18],
  [214, 69, 107],
] as const;

export async function exportMonthlyReportPdf(
  report: MonthlyReport,
  opts: { name: string; locale: Locale; noNumbers: boolean },
) {
  const { jsPDF } = await import("jspdf");
  const tr = (names: Names) => pickName(names, opts.locale);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  let y = 0;

  const color = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const fillC = (c: readonly number[]) => doc.setFillColor(c[0], c[1], c[2]);
  const ensure = (space: number) => {
    if (y + space > H - 20) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (text: string) => {
    ensure(22);
    y += 4;
    fillC(ACCENT);
    doc.rect(M, y - 4, 1.4, 6, "F");
    color(INK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(text, M + 4, y + 0.6);
    y += 7;
  };
  const para = (text: string, size = 10, c: readonly number[] = INK) => {
    y += 1;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    color(c);
    const lines = doc.splitTextToSize(text, W - 2 * M);
    ensure(lines.length * 5);
    doc.text(lines, M, y);
    y += lines.length * (size * 0.45) + 1.5;
  };
  /** Barra horizontal com rótulo e valor. */
  const hbar = (label: string, value: number, max: number, c: readonly number[], right: string) => {
    ensure(9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    color(INK);
    doc.text(label, M, y + 3.6);
    const x = M + 52;
    const w = W - M - x - 22;
    fillC(SOFT);
    doc.roundedRect(x, y, w, 5, 2.5, 2.5, "F");
    if (max > 0 && value > 0) {
      fillC(c);
      doc.roundedRect(x, y, Math.max(5, (w * Math.min(value, max)) / max), 5, 2.5, 2.5, "F");
    }
    color(MUTED);
    doc.text(right, W - M, y + 3.6, { align: "right" });
    y += 8;
  };

  // Cabeçalho
  fillC(BRAND);
  doc.rect(0, 0, W, 34, "F");
  doc.setTextColor(252, 251, 247);
  doc.setFont("times", "bold");
  doc.setFontSize(19);
  doc.text("NutriConnect", M, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`${tr(L.title)} - ${monthLabel(report.month, opts.locale)}`, M, 22);
  doc.setFontSize(9.5);
  doc.text(opts.name, M, 28.5);
  doc.text(new Date().toLocaleDateString(LOCALE_TAG[opts.locale] ?? "pt-BR"), W - M, 14, {
    align: "right",
  });
  y = 44;
  para(tr(L.intro), 10, MUTED);

  // Água: um gráfico de colunas do mês, com a linha da meta.
  heading(tr(L.water));
  if (report.water.daysLogged) {
    ensure(40);
    const chartH = 26;
    const x0 = M;
    const cw = (W - 2 * M) / report.days;
    const peak = Math.max(report.water.goal, ...report.water.perDay, 1);
    report.water.perDay.forEach((g, i) => {
      const h = (chartH * g) / peak;
      fillC(g >= report.water.goal ? WATER : [150, 186, 222]);
      if (g > 0)
        doc.roundedRect(x0 + i * cw + cw * 0.18, y + chartH - h, cw * 0.64, h, 0.8, 0.8, "F");
    });
    const gy = y + chartH - (chartH * report.water.goal) / peak;
    doc.setDrawColor(ACCENT[0], ACCENT[1], ACCENT[2]);
    doc.setLineDashPattern([1.2, 1.2], 0);
    doc.line(x0, gy, W - M, gy);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7.5);
    color(MUTED);
    [1, 10, 20, report.days].forEach((d) =>
      doc.text(String(d), x0 + (d - 0.5) * cw, y + chartH + 4, { align: "center" }),
    );
    y += chartH + 9;
    para(
      fill(tr(L.waterText), {
        logged: report.water.daysLogged,
        goal: report.water.goal,
        hit: report.water.daysAtGoal,
      }),
    );
  } else para(tr(L.empty), 9.5, MUTED);

  // Hábitos
  heading(tr(L.habits));
  if (Object.values(report.habits).some((v) => v > 0)) {
    HABIT_CATALOG.filter((h) => (report.habits[h.id] ?? 0) > 0).forEach((h) =>
      hbar(
        tr(h.name),
        report.habits[h.id],
        report.counted,
        h.rgb,
        `${report.habits[h.id]}/${report.counted}`,
      ),
    );
    para(fill(tr(L.habitDays), { n: report.habitDays }), 9.5, MUTED);
  } else para(tr(L.empty), 9.5, MUTED);

  // Humor com a comida
  heading(tr(L.feelings));
  const moodTotal = report.moods.reduce((a, b) => a + b, 0);
  if (moodTotal) {
    report.moods.forEach((v, i) =>
      hbar(tr(L.moodNames[i]), v, moodTotal, MOOD_COLORS[i], String(v)),
    );
  } else para(tr(L.empty), 9.5, MUTED);
  para(fill(tr(L.calm), { n: report.mindfulMeals, p: report.pledgeDays }), 9.5, MUTED);

  // Metas
  if (report.goals.length) {
    heading(tr(L.goals));
    report.goals.forEach((g) =>
      hbar(
        doc.splitTextToSize(g.title, 50)[0] as string,
        g.pct,
        100,
        BRAND,
        opts.noNumbers ? "" : `${g.pct}%`,
      ),
    );
    if (!opts.noNumbers)
      para(
        report.goals
          .map((g) => `${g.title}: ${fill(tr(L.goalLine), { days: g.days, pct: g.pct })}`)
          .join("\n"),
        9,
        MUTED,
      );
  }

  // Diário
  heading(tr(L.diary));
  const d = report.diary;
  if (d.entries) {
    para(fill(tr(L.diaryLine), { n: d.entries, p: d.photos }));
    if (d.answeredPlan) para(fill(tr(L.planLine), { a: d.followedPlan, b: d.answeredPlan }));
    if (d.hunger != null && d.satiety != null) {
      const word = (list: Names[], v: number) =>
        tr(list[Math.min(list.length - 1, Math.max(0, Math.round(v) - 1))]).toLowerCase();
      para(
        fill(tr(L.hungerLine), {
          h: word(HUNGER_WORDS, d.hunger),
          s: word(SATIETY_WORDS, d.satiety),
        }),
      );
    }
    if (d.feelings.length) {
      const label = (id: string) => {
        const f = FEELINGS.find((x) => x.id === id);
        return f ? tr(f.label).toLowerCase() : id;
      };
      para(fill(tr(L.feelingsLine), { f: d.feelings.map((f) => label(f.id)).join(", ") }));
    }
    if (d.alerts > 0) para(tr(L.alertNote), 9.5, ACCENT);
  } else para(tr(L.empty), 9.5, MUTED);

  // Medidas (nunca no modo sem números)
  if (report.body && !opts.noNumbers) {
    heading(tr(L.body));
    const f1 = (v: number) =>
      v.toLocaleString(LOCALE_TAG[opts.locale] ?? "pt-BR", { maximumFractionDigits: 1 });
    para(
      fill(tr(L.bodyLine), {
        a: f1(report.body.from),
        b: f1(report.body.to),
        c: report.body.count,
      }),
    );
  }

  // Consultas e trilha
  heading(tr(L.care));
  para(fill(tr(L.apptLine), { n: report.appointments }));
  if (report.trail) {
    heading(tr(L.trail));
    para(
      fill(tr(L.trailLine), {
        xp: report.trail.xp,
        l: report.trail.levels,
        a: report.trail.achievements,
        s: report.trail.streak,
      }),
    );
  }

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(SOFT[0], SOFT[1], SOFT[2]);
    doc.line(M, H - 15, W - M, H - 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    color(MUTED);
    doc.text(doc.splitTextToSize(tr(L.footer), W - 2 * M - 30), M, H - 10);
    doc.text(fill(tr(L.page), { a: p, b: pages }), W - M, H - 10, { align: "right" });
  }

  const file = `nutriconnect-evolucao-${report.month.year}-${pad(report.month.month + 1)}.pdf`;
  doc.save(file);
  return file;
}
