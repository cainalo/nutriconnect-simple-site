// Arquivo de calendário (.ics) de uma consulta, para a pessoa salvar na agenda do celular.
import type { Appointment } from "./api";

/** Data em UTC no formato do iCalendar (20261018T143000Z). */
const icsDate = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

/** Escapa vírgula, ponto e vírgula, barra e quebra de linha (RFC 5545). */
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\r?\n/g, "\\n");

export function appointmentIcs(
  appt: Pick<Appointment, "id" | "starts_at" | "ends_at" | "modality" | "location">,
  title: string,
  description: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const where =
    appt.modality === "online" ? `${origin}/consulta/${appt.id}` : (appt.location ?? "").trim();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//NutriConnect//Consultas//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${appt.id}@nutriconnect`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(appt.starts_at)}`,
    `DTEND:${icsDate(appt.ends_at)}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(description)}`,
    ...(where ? [`LOCATION:${esc(where)}`] : []),
    // Lembrete 1 h antes, como o aviso do próprio site.
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

/** Baixa o .ics; no celular o sistema oferece abrir na agenda. */
export function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
