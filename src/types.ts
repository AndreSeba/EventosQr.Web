export type Rol = "superadmin" | "admin" | "rrpp" | "staff";
/** orgId/orgNombre: la organización (cliente) a la que pertenece; null solo para el superadmin. */
export type Usuario = { id: string; email: string; nombre: string; rol: Rol; orgId: string | null; orgNombre: string | null };
export type UsuarioFila = Omit<Usuario, "orgNombre"> & { activo: boolean; creadoEn: string; organizacion: string | null };
export type Organizacion = { id: string; nombre: string; slug: string; activa: boolean; creadaEn: string; eventos: number; usuarios: number };

export type Tipo = { id: string; nombre: string; precio: number; precioRegular: number | null; cupo: number | null; categoria: "venta" | "invitacion" | "vip"; activo: boolean };
export type Evento = {
  id: string; orgId: string; organizacion: string | null; slug: string; nombre: string; descripcion: string | null; lugar: string | null; direccionUrl: string | null;
  fechaInicio: string; moneda: string; archivado: boolean; imagenUrl: string | null; qrPagoUrl: string | null; linkVenta: string;
  edadMinima: number | null; whatsapp: string | null;
};
export type EventoDetalle = Evento & { tipos: Tipo[]; equipoIds: string[] };

export type Resumen = {
  ventas: number; ordenesPendientes: number; ordenesAprobadas: number;
  ticketsEmitidos: number; ticketsUsados: number; ticketsAnulados: number;
  porTipo: { id: string; nombre: string; cupo: number | null; emitidas: number; disponibles: number | null }[];
};

export type Orden = {
  id: string; numero: number; eventoId: string; tipo: string; nombre: string; telefono: string; email: string; cantidad: number; monto: number;
  estado: "Pendiente" | "Aprobada" | "Rechazada"; motivoRechazo: string | null; creadaEn: string; correoEnviadoEn: string | null; correoError: string | null;
  acceso: string; ref: string | null; // acceso: token del link de la orden; ref: promotor que trajo la venta
};

/** Lo que ve el comprador en el link de su orden (/o/:acceso). */
export type OrdenPublica = {
  numero: number; nombre: string; correo: string; cantidad: number; monto: number; tipo: string;
  estado: "Pendiente" | "Aprobada" | "Rechazada"; motivoRechazo: string | null; creadaEn: string;
  evento: {
    slug: string; nombre: string; fechaInicio: string; lugar: string | null; direccionUrl: string | null; moneda: string;
    imagenUrl: string | null; whatsapp: string | null; edadMinima: number | null;
  };
  entradas: EntradaDeOrden[];
};

/** Una entrada vista desde el link de la orden. `n` es su posición (1..N) dentro de la orden. */
export type EntradaDeOrden = {
  n: number; tipo: string; estado: "valida" | "usada" | "anulada"; qr: string | null;
  nombre: string; titularDefinido: boolean; ciParcial: string | null; transferencias: number;
  /** true mientras la entrada esté vigente y el evento no haya empezado. */
  editable: boolean;
};

export type Entrada = {
  id: string; nombre: string; email: string | null; estado: "valida" | "usada" | "anulada"; usadaEn: string | null;
  anuladaMotivo: string | null; creadaEn: string; tipo: string; categoria: string; deOrden: boolean;
  ci: string | null; titularDefinido: boolean; transferencias: number;
  ordenNumero: number | null; numeroEnOrden: number | null; totalOrden: number | null;
};

export type EventoPublico = {
  slug: string; nombre: string; descripcion: string | null; lugar: string | null; direccionUrl: string | null; fechaInicio: string;
  moneda: string; imagenUrl: string | null; qrPagoUrl: string | null; maxPorOrden: number; maxComprobanteMb: number;
  edadMinima: number | null; whatsapp: string | null;
  tipos: { id: string; nombre: string; precio: number; precioRegular: number | null; disponibles: number | null }[];
};

/** Para que la puerta compare con la persona: «Entrada 2 de 3», cédula (si la dio) y si el nombre es el suyo o el del comprador. */
export type DatosTitular = { ci?: string | null; numeroEnOrden?: number | null; totalOrden?: number | null; titularDefinido?: boolean };

export type ResultadoEscaneo =
  | ({ estado: "VALIDA"; nombre: string; tipo: string } & DatosTitular)
  | ({ estado: "YA_USADA"; nombre: string; tipo: string; usadaEn: string } & DatosTitular)
  | { estado: "ANULADA"; nombre: string }
  | { estado: "INVALIDA" };
