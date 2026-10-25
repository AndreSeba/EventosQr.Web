// Acciones de las páginas públicas: compartir, calendario y WhatsApp. Sin librerías: todo con lo que trae el navegador.

/** Menú de compartir del celular; si no existe (escritorio), copia el link. Devuelve qué pasó para avisarle al usuario. */
export async function compartir(titulo: string, url: string): Promise<"compartido" | "copiado" | null> {
  try {
    if (navigator.share) {
      await navigator.share({ title: titulo, url });
      return "compartido";
    }
    await navigator.clipboard.writeText(url);
    return "copiado";
  } catch {
    return null; // el usuario cerró el menú o el navegador no dejó copiar
  }
}

export async function copiar(texto: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(texto); return true; } catch { return false; }
}

export const linkWhatsapp = (numero: string, texto: string) => `https://wa.me/${numero.replace(/\D/g, "")}?text=${encodeURIComponent(texto)}`;

const escIcs = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");
const fechaIcs = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Descarga un .ics: en el celular abre la app de calendario. Duración supuesta de 5 horas (el evento no guarda hora de fin). */
export function agregarAlCalendario(ev: { slug: string; nombre: string; fechaInicio: string; lugar: string | null }, url: string) {
  const inicio = new Date(ev.fechaInicio);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EventosQr//ES", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${ev.slug}@eventosqr`, `DTSTAMP:${fechaIcs(new Date())}`, `DTSTART:${fechaIcs(inicio)}`,
    `DTEND:${fechaIcs(new Date(inicio.getTime() + 5 * 3600_000))}`, `SUMMARY:${escIcs(ev.nombre)}`,
    ...(ev.lugar ? [`LOCATION:${escIcs(ev.lugar)}`] : []), `URL:${url}`, `DESCRIPTION:${escIcs(`Tu entrada: ${url}`)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  a.download = `${ev.slug}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}
