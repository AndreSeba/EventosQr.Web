import { useState } from "react";
import { Link } from "react-router-dom";
import { olvidarOrden, ordenesGuardadas } from "../comprador";
import { fechaLarga } from "../format";

/** Las órdenes abiertas en este teléfono. No hay cuenta ni contraseña: cada link es la llave de su orden. */
export default function MisEntradas() {
  const [lista, setLista] = useState(ordenesGuardadas);

  return (
    <main className="publica">
      <h1>Mis entradas</h1>
      <p className="suave">Las compras que hiciste o abriste en este teléfono. Si cambiás de teléfono, abrí el link del correo.</p>
      {lista.length === 0 && <div className="vacio">Todavía no hay entradas guardadas acá.</div>}
      {lista.map((o) => (
        <article key={o.acceso} className="card">
          <div className="fila entre">
            <Link to={`/o/${o.acceso}`}><strong>{o.evento}</strong></Link>
            <button className="mini sec" onClick={() => { olvidarOrden(o.acceso); setLista(ordenesGuardadas()); }}>Quitar</button>
          </div>
          <p className="suave chico" style={{ margin: "6px 0 0" }}>Orden #{o.numero} · {fechaLarga(o.fechaInicio)}</p>
        </article>
      ))}
    </main>
  );
}
