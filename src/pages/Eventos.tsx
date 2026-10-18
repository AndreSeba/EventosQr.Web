import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, msgError } from "../api";
import { fechaHora } from "../format";
import { useSesion } from "../session";
import type { Evento } from "../types";

export default function Eventos() {
  const { elegirEvento, recargarEventos } = useSesion();
  const [archivados, setArchivados] = useState(false);
  const [lista, setLista] = useState<Evento[] | null>(null);
  const [error, setError] = useState("");

  const cargar = () => api<Evento[]>(`/eventos?archivados=${archivados}`).then(setLista).catch((e) => setError(msgError(e)));
  useEffect(() => { setLista(null); cargar(); }, [archivados]);

  async function archivar(e: Evento) {
    try {
      await api(`/eventos/${e.id}/archivar`, { body: { archivado: !e.archivado } });
      await Promise.all([cargar(), recargarEventos()]);
    } catch (err) { setError(msgError(err)); }
  }

  return (
    <>
      <div className="fila entre">
        <h1>Gestionar eventos</h1>
        <Link className="btn" to="/eventos/nuevo">＋ Nuevo</Link>
      </div>
      <div className="chips">
        <button className={`chip ${!archivados ? "act" : ""}`} onClick={() => setArchivados(false)}>Activos</button>
        <button className={`chip ${archivados ? "act" : ""}`} onClick={() => setArchivados(true)}>Archivados</button>
      </div>
      {error && <div className="msg err">{error}</div>}
      {lista?.length === 0 && <div className="vacio">{archivados ? "No hay eventos archivados." : "Todavía no hay eventos."}</div>}
      {lista?.map((e) => (
        <div key={e.id} className="card">
          <strong>{e.nombre}</strong>
          <div className="suave chico">{fechaHora(e.fechaInicio)}{e.lugar && ` · ${e.lugar}`}</div>
          <div className="fila" style={{ marginTop: 10 }}>
            <Link className="btn mini" to={`/eventos/${e.id}`}>Editar</Link>
            <Link className="btn mini sec" to="/escaner" onClick={() => elegirEvento(e.id)}>Escanear</Link>
            <Link className="btn mini sec" to="/" onClick={() => elegirEvento(e.id)}>Panel</Link>
            <button className="mini sec" onClick={() => archivar(e)}>{e.archivado ? "Desarchivar" : "Archivar"}</button>
          </div>
        </div>
      ))}
    </>
  );
}
