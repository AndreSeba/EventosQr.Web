const PASOS = ["Entradas", "Pago", "Comprobante", "Tu entrada"];

/** Guía 1·2·3·4 de la compra. Como no hay conexión con el banco, el avance lo marca lo que hace el comprador
 *  (elegir, llegar al comprobante, enviar), no la confirmación del pago.
 *  secciones: ids a los que lleva tocar cada paso (null = no se puede tocar). completo: también el último queda hecho. */
export default function Pasos({ actual, secciones = [], completo = false, etiquetaActual }: {
  actual: number; secciones?: (string | null)[]; completo?: boolean; etiquetaActual?: string;
}) {
  return (
    <ol className="pasos" aria-label="Pasos de la compra">
      {PASOS.map((t, i) => {
        const n = i + 1;
        const estado = n < actual || (completo && n === actual) ? "hecho" : n === actual ? "actual" : "";
        const destino = secciones[i];
        const texto = n === actual && etiquetaActual ? etiquetaActual : t;
        const contenido = <><span className="n" aria-hidden="true">{estado === "hecho" ? "✓" : n}</span>{texto}</>;
        return (
          <li key={t} className={estado} aria-current={estado === "actual" ? "step" : undefined}>
            {destino
              ? <button type="button" onClick={() => document.getElementById(destino)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{contenido}</button>
              : contenido}
          </li>
        );
      })}
    </ol>
  );
}
