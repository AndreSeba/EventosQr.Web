import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, msgError } from "../api";
import SelectorEvento from "../components/SelectorEvento";
import { dinero } from "../format";
import { useSesion } from "../session";
import type { Resumen } from "../types";

export default function Panel() {
  const { usuario, evento, eventos } = useSesion();
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const admin = usuario?.rol === "admin";

  useEffect(() => {
    setR(null);
    setError("");
    if (evento) api<Resumen>(`/eventos/${evento.id}/resumen`).then(setR).catch((e) => setError(msgError(e)));
  }, [evento?.id]);

  async function copiar() {
    if (!evento) return;
    try {
      if (navigator.share) await navigator.share({ title: evento.nombre, url: evento.linkVenta });
      else { await navigator.clipboard.writeText(evento.linkVenta); setCopiado(true); setTimeout(() => setCopiado(false), 2000); }
    } catch { /* usuario canceló */ }
  }

  return (
    <>
      <h1>Panel</h1>
      <SelectorEvento />
      {!eventos.length && (
        <div className="vacio" style={{ marginTop: 14 }}>
          <p>{admin ? "Todavía no hay eventos." : "No tenés eventos asignados todavía."}</p>
          {admin && <Link className="btn" to="/eventos/nuevo">Crear mi primer evento</Link>}
        </div>
      )}
      {evento && (
        <>
          {admin && (
            <div className="card">
              <div className="chico suave">TU LINK DE VENTA</div>
              <div className="fila" style={{ marginTop: 6 }}>
                <input readOnly value={evento.linkVenta} onFocus={(e) => e.currentTarget.select()} style={{ flex: 1 }} />
                <button className="mini" onClick={copiar}>{copiado ? "¡Copiado!" : "Compartir"}</button>
              </div>
            </div>
          )}
          {error && <div className="msg err">{error}</div>}
          {r && (
            <div className="stats">
              {admin && <div className="stat grande"><div className="chico suave">VENTAS</div><div className="n">{dinero(r.ventas, evento.moneda)}</div><div className="chico suave">{r.ordenesAprobadas} compras aprobadas</div></div>}
              <div className="stat"><div className="chico suave">TICKETS EMITIDOS</div><div className="n">{r.ticketsEmitidos}</div></div>
              <div className="stat"><div className="chico suave">YA INGRESARON</div><div className="n">{r.ticketsUsados}<span className="suave chico"> / {r.ticketsEmitidos}</span></div></div>
              {admin && <div className="stat"><div className="chico suave">POR APROBAR</div><div className="n">{r.ordenesPendientes}</div></div>}
              <div className="stat"><div className="chico suave">ANULADOS</div><div className="n">{r.ticketsAnulados}</div></div>
            </div>
          )}
          {r && r.porTipo.length > 0 && (
            <div className="card">
              <h2>Por tipo de ticket</h2>
              {r.porTipo.map((t) => (
                <div key={t.id} className="fila entre" style={{ padding: "6px 0" }}>
                  <span>{t.nombre}</span>
                  <span className="suave">{t.emitidas}{t.cupo ? ` / ${t.cupo}` : ""}</span>
                </div>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 18 }}>Acciones rápidas</h2>
          <div className="acciones">
            {(admin || usuario?.rol === "rrpp") && <Link className="btn" to="/tickets?nuevo=1">＋ Nuevo ticket</Link>}
            {admin && <Link className="btn sec" to="/ordenes">Revisar órdenes</Link>}
            {usuario?.rol !== "rrpp" && <Link className="btn sec" to="/escaner">Escanear</Link>}
            {admin && <Link className="btn sec" to="/usuarios">Gestionar equipo</Link>}
          </div>
        </>
      )}
    </>
  );
}
