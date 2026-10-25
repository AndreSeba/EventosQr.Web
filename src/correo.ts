// Dominios de correo más usados: si el escrito se parece a uno pero no es igual, probablemente es un error de tipeo
// (gmial.com, gmail.con, hotmal.com…). Los que existen de verdad van en la lista para no "corregirlos".
const DOMINIOS = [
  "gmail.com", "googlemail.com", "hotmail.com", "hotmail.es", "outlook.com", "outlook.es", "live.com", "msn.com",
  "yahoo.com", "yahoo.es", "ymail.com", "icloud.com", "me.com", "mail.com", "proton.me", "protonmail.com",
];

function distancia(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      // Dos letras invertidas (gmial) cuentan como un solo error
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

/** Devuelve el correo corregido si el dominio parece mal escrito, o null si está bien o no se reconoce. */
export function sugerirCorreo(email: string): string | null {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return null;
  const dominio = e.slice(at + 1);
  if (dominio.length < 4 || DOMINIOS.includes(dominio)) return null;
  let mejor: { d: string; n: number } | null = null;
  for (const d of DOMINIOS) {
    const n = distancia(dominio, d);
    if (n <= 2 && (!mejor || n < mejor.n)) mejor = { d, n };
  }
  return mejor ? `${e.slice(0, at)}@${mejor.d}` : null;
}
