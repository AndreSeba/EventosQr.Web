import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const TAMANOS = [25, 50, 100];

/** Paginado en el cliente: las listas llegan completas del API (cientos de filas) y se muestran por tandas.
 *  `reinicio` cambia cuando cambia un filtro (evento, estado, búsqueda): vuelve a la página 1.
 *  Si la lista se recarga por una acción (aprobar, anular), la página actual se conserva. */
export function usePaginas<T>(lista: T[] | null, reinicio: string) {
  const [pagina, setPagina] = useState(1);
  const [tam, setTam] = useState(25);
  useEffect(() => setPagina(1), [reinicio, tam]);
  const total = lista?.length ?? 0;
  const paginas = Math.max(1, Math.ceil(total / tam));
  const actual = Math.min(pagina, paginas);
  const items = lista ? lista.slice((actual - 1) * tam, actual * tam) : null;
  return { items, total, tam, setTam, pagina: actual, paginas, ir: setPagina };
}

export default function Pager({ p }: { p: ReturnType<typeof usePaginas> }) {
  if (p.total <= TAMANOS[0]) return null;
  const desde = (p.pagina - 1) * p.tam + 1;
  const hasta = Math.min(p.pagina * p.tam, p.total);
  return (
    <nav className="pager" aria-label="Paginado">
      <span className="suave chico">{desde}–{hasta} de {p.total}</span>
      <div className="fila">
        <button className="mini sec" disabled={p.pagina <= 1} onClick={() => p.ir(p.pagina - 1)} aria-label="Página anterior"><ChevronLeft size={16} /></button>
        <span className="chico">Página {p.pagina} de {p.paginas}</span>
        <button className="mini sec" disabled={p.pagina >= p.paginas} onClick={() => p.ir(p.pagina + 1)} aria-label="Página siguiente"><ChevronRight size={16} /></button>
      </div>
      <label className="suave chico" style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
        Por página
        <select value={p.tam} onChange={(e) => p.setTam(Number(e.target.value))} style={{ width: "auto" }}>
          {TAMANOS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
    </nav>
  );
}