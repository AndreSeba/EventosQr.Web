import type { Rol } from "./types";

/** El superadmin (dueño del sistema) puede todo lo que puede un administrador, en todas las organizaciones. */
export const esAdmin = (u?: { rol: Rol } | null) => u?.rol === "admin" || u?.rol === "superadmin";

export const ETIQUETA_ROL: Record<Rol, string> = { superadmin: "Superadmin", admin: "Administrador", rrpp: "RRPP", staff: "Staff" };
