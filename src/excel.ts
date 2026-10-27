import writeExcelFile from "write-excel-file/browser";

type Valor = string | number | null;
export type ColumnaExcel = { titulo: string; ancho: number };

/** Descarga un .xlsx de una hoja: encabezado en negrita que queda fijo al desplazarse y columnas con ancho.
 *  Los textos se guardan como texto (no como fórmulas), así que un nombre que empiece con «=» no se ejecuta. */
export async function descargarExcel(archivo: string, hoja: string, columnas: ColumnaExcel[], filas: Valor[][]) {
  const encabezado = columnas.map((c) => ({ value: c.titulo, fontWeight: "bold" as const, backgroundColor: "#E8E8E8" }));
  await writeExcelFile([encabezado, ...filas], {
    sheet: hoja,
    columns: columnas.map((c) => ({ width: c.ancho })),
    stickyRowsCount: 1,
  }).toFile(archivo.endsWith(".xlsx") ? archivo : `${archivo}.xlsx`);
}

/** «asistencia-jiwilin-2026-10-30.xlsx»: el nombre del evento sin acentos ni símbolos, y la fecha de hoy. */
export const nombreArchivo = (base: string, evento: string) => {
  const limpio = evento.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "evento";
  return `${base}-${limpio}-${new Date().toISOString().slice(0, 10)}.xlsx`;
};