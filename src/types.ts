export type Rol = "superadmin" | "admin" | "rrpp" | "staff";
/** orgId/orgNombre: la organización (cliente) a la que pertenece; null solo para el superadmin. */
export type Usuario = { id: string; email: string; nombre: string; rol: Rol; orgId: string | null; orgNombre: string | null };
export type UsuarioFila = Omit<Usuario, "orgNombre"> & { activo: boolean; creadoEn: string; organizacion: string | null };
export type Organizacion = { id: string; nombre: string; slug: string; activa: boolean; creadaEn: string; eventos: number; usuarios: number };

export type Tipo = { id: string; nombre: string; precio: number; precioRegular: number | null; cupo: number | null; categoria: "venta" | "invitacion" | "vip"; activo: boolean };
export type Evento = {
  id: string; orgId: string; organizacion: string | null; slug: string; nombre: string; descripcion: string | null; lugar: string | null; direccionUrl: string | null;
  fechaInicio: string; moneda: string; archivado: boolean; imagenUrl: string | null; qrPagoUrl: string | null; linkVenta: string;
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
};

export type Entrada = {
  id: string; nombre: string; email: string | null; estado: "valida" | "usada" | "anulada"; usadaEn: string | null;
  anuladaMotivo: string | null; creadaEn: string; tipo: string; categoria: string; deOrden: boolean;
};

export type EventoPublico = {
  slug: string; nombre: string; descripcion: string | null; lugar: string | null; direccionUrl: string | null; fechaInicio: string;
  moneda: string; imagenUrl: string | null; qrPagoUrl: string | null; maxPorOrden: number; maxComprobanteMb: number;
  tipos: { id: string; nombre: string; precio: number; precioRegular: number | null; disponibles: number | null }[];
};

export type ResultadoEscaneo =
  | { estado: "VALIDA"; nombre: string; tipo: string }
  | { estado: "YA_USADA"; nombre: string; tipo: string; usadaEn: string }
  | { estado: "ANULADA"; nombre: string }
  | { estado: "INVALIDA" };
