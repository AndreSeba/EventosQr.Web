export const dinero = (n: number, moneda: string) => `${moneda === "BOB" ? "Bs" : moneda} ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const fechaHora = (s: string) => new Date(s).toLocaleString("es-BO", { dateStyle: "medium", timeStyle: "short" });
export const fechaLarga = (s: string) => new Date(s).toLocaleString("es-BO", { dateStyle: "full", timeStyle: "short" });
/** "jue, 31 dic" y "21:00": para las fichas de la portada. */
export const fechaCorta = (s: string) => new Date(s).toLocaleDateString("es-BO", { weekday: "short", day: "numeric", month: "short" });
export const hora = (s: string) => new Date(s).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false });

/** ISO → valor para <input type="datetime-local"> en hora local. */
export const aInputFecha = (iso: string) => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};
export const deInputFecha = (v: string) => new Date(v).toISOString();
