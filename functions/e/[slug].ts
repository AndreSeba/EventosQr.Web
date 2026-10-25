// Cloudflare Pages Function para /e/<slug> (la página de compra).
// La web es una app de una sola página: sin esto, al compartir el link por WhatsApp se ve solo «EventosQr».
// Acá se pide el evento al API y se ponen en el HTML el nombre, la fecha y la imagen (Open Graph), que es lo que
// leen WhatsApp, Instagram y Facebook para armar la vista previa. Si el API no responde, se sirve la página tal cual.
// Variable en Cloudflare Pages (Settings > Environment variables): API_URL, o se reutiliza VITE_API_URL.

type Env = { API_URL?: string; VITE_API_URL?: string };
type Contexto = { request: Request; env: Env; params: { slug?: string | string[] }; next: () => Promise<Response> };
type EventoOg = { nombre: string; descripcion: string | null; lugar: string | null; fechaInicio: string; imagenUrl: string | null };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Pone título y etiquetas Open Graph del evento en el index.html. Exportada para poder probarla sin Cloudflare. */
export function conVistaPrevia(html: string, ev: EventoOg, url: string): string {
  const fecha = new Date(ev.fechaInicio).toLocaleString("es-BO", { dateStyle: "full", timeStyle: "short", timeZone: "America/La_Paz" });
  const descripcion = `${fecha}${ev.lugar ? ` · ${ev.lugar}` : ""}. ${ev.descripcion ? ev.descripcion.slice(0, 140) : "Comprá tu entrada."}`;
  const meta = [
    ["og:type", "website"], ["og:title", ev.nombre], ["og:description", descripcion], ["og:url", url],
    ...(ev.imagenUrl ? [["og:image", ev.imagenUrl]] : []),
  ].map(([p, c]) => `<meta property="${p}" content="${esc(c)}" />`);
  meta.push(`<meta name="description" content="${esc(descripcion)}" />`);
  meta.push(`<meta name="twitter:card" content="${ev.imagenUrl ? "summary_large_image" : "summary"}" />`);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(`${ev.nombre} · Entradas`)}</title>`)
    .replace("</head>", `    ${meta.join("\n    ")}\n  </head>`);
}

export async function onRequest(ctx: Contexto): Promise<Response> {
  const pagina = await ctx.next(); // el index.html de siempre (ver public/_redirects)
  const api = (ctx.env.API_URL ?? ctx.env.VITE_API_URL ?? "").replace(/\/$/, "");
  const slug = Array.isArray(ctx.params.slug) ? ctx.params.slug[0] : ctx.params.slug;
  if (!api || !slug || !/^[a-z0-9-]{3,70}$/.test(slug) || !pagina.headers.get("content-type")?.includes("text/html")) return pagina;
  try {
    const r = await fetch(`${api}/api/public/eventos/${slug}`, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return pagina;
    const html = conVistaPrevia(await pagina.text(), (await r.json()) as EventoOg, ctx.request.url.split("?")[0]);
    const headers = new Headers(pagina.headers);
    headers.delete("content-length");
    headers.set("cache-control", "public, max-age=300"); // 5 minutos: si cambia el evento, la vista previa se actualiza pronto
    return new Response(html, { status: 200, headers });
  } catch {
    return pagina;
  }
}
