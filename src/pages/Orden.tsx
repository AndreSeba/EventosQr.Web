import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CalendarPlus, Copy, Download, MapPin, MessageCircle, Ticket } from "lucide-react";
import { api, msgError } from "../api";
import { agregarAlCalendario, copiar, linkWhatsapp } from "../compartir";
import { guardarOrden } from "../comprador";
import { dinero, fechaLarga } from "../format";
import type { OrdenPublica } from "../types";

const ESTADO_ENTRADA = { valida: "", usada: "YA USADA", anulada: "ANULADA" } as const;

/** Link de la orden: el comprador ve el estado y, si se aprobó, sus QR. Funciona aunque el correo no le haya llegado. */
export default function Orden() {
  const { acceso } = useParams();
  const nueva = (useLocation().state as { nueva?: boolean } | null)?.nueva;
  const [o, setO] = useState<OrdenPublica | null>(null);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const cargar = () =>
    api<OrdenPublica>(`/public/ordenes/${acceso}`)
      .then((r) => {
        setO(r);
        guardarOrden({ acceso: acceso!, numero: r.numero, evento: r.evento.nombre, fechaInicio: r.evento.fechaInicio });
      })
      .catch((e) => setError(msgError(e)));

  useEffect(() => { cargar(); }, [acceso]);
  // Mientras está pendiente se vuelve a consultar sola: cuando se aprueba, los QR aparecen sin recargar
  useEffect(() => {
    if (o?.estado !== "Pendiente") return;
    const t = setInterval(cargar, 30_000);
    return () => clearInterval(t);
  }, [o?.estado]);

  if (error) return <main className="publica"><div className="msg err">{error}</div><p><Link to="/mis-entradas">Ver mis entradas guardadas</Link></p></main>;
  if (!o) return <main className="publica"><p className="suave">Cargando…</p></main>;

  const url = location.href.split("#")[0];
  const ev = o.evento;
  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 3000); };

  function guardarImagenes() {
    o!.entradas.forEach((e, i) => {
      if (!e.qr) return;
      const a = document.createElement("a");
      a.href = e.qr;
      a.download = `entrada-${o!.numero}-${i + 1}.png`;
      a.click();
    });
  }

  return (
    <main className="publica">
      {nueva && o.estado === "Pendiente" && <div className="msg ok" role="status">¡Recibido! <b>Guardá este link</b>: acá vas a ver tu entrada cuando se apruebe (también te llega al correo).</div>}
      <p className="suave chico" style={{ margin: 0 }}>Orden #{o.numero}</p>
      <h1>{ev.nombre}</h1>
      <p className="suave">
        {fechaLarga(ev.fechaInicio)}{ev.lugar && ` · ${ev.lugar}`}
        {ev.edadMinima && <><br />Mayores de {ev.edadMinima}: en la puerta pueden pedirte el carnet.</>}
      </p>

      <section className="card">
        <div className="fila entre"><strong>{o.cantidad} × {o.tipo}</strong><span className={`badge b-${o.estado}`}>{o.estado}</span></div>
        <p className="suave chico" style={{ margin: "6px 0 0" }}>{o.nombre} · {dinero(o.monto, ev.moneda)} · {o.correo}</p>
        {o.estado === "Pendiente" && (
          <p>Estamos revisando tu comprobante. Cuando se apruebe, tu entrada aparece acá mismo y te llega a <b>{o.correo}</b>.</p>
        )}
        {o.estado === "Rechazada" && (
          <>
            <p>No pudimos aprobar tu pago.</p>
            {o.motivoRechazo && <p className="msg err"><b>Motivo:</b> {o.motivoRechazo}</p>}
            <p><Link className="btn" to={`/e/${ev.slug}`}>Volver a intentarlo</Link></p>
          </>
        )}
      </section>

      {o.estado === "Aprobada" && (
        <section className="card">
          <h2>Tu entrada</h2>
          <p className="suave chico">Mostrá el QR en la puerta. <b>Cada QR entra una sola vez</b>: quien tenga este link o una captura puede usarlo.</p>
          {o.entradas.map((e, i) => (
            <div key={i} className="entrada-qr">
              <div className="chico">{e.tipo} · Entrada {i + 1} de {o.entradas.length} {ESTADO_ENTRADA[e.estado] && <span className={`badge b-${e.estado}`}>{ESTADO_ENTRADA[e.estado]}</span>}</div>
              {e.qr ? <img src={e.qr} alt={`QR de la entrada ${i + 1}`} /> : <p className="suave">Esta entrada fue anulada.</p>}
            </div>
          ))}
          <p><button className="sec" onClick={guardarImagenes}><Download size={16} /> Guardar las entradas</button></p>
          <p className="suave chico">También podés mantener apretado el QR y elegir «Guardar imagen», o sacarle una captura.</p>
        </section>
      )}

      <section className="card">
        <div className="fila">
          <button className="mini sec" onClick={async () => avisar((await copiar(url)) ? "Link copiado." : "No se pudo copiar.")}><Copy size={14} /> Copiar link</button>
          <button className="mini sec" onClick={() => agregarAlCalendario(ev, url)}><CalendarPlus size={14} /> Agregar al calendario</button>
          {ev.direccionUrl && <a className="btn sec mini" href={ev.direccionUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> Cómo llegar</a>}
          {ev.whatsapp && (
            <a className="btn sec mini" target="_blank" rel="noreferrer"
              href={linkWhatsapp(ev.whatsapp, `Hola, tengo una consulta sobre mi orden #${o.numero} de ${ev.nombre}.`)}>
              <MessageCircle size={14} /> Ayuda por WhatsApp
            </a>
          )}
        </div>
        {aviso && <p className="suave chico" role="status">{aviso}</p>}
        <p className="suave chico"><Ticket size={13} style={{ verticalAlign: "-2px" }} /> Este link queda guardado en <Link to="/mis-entradas">Mis entradas</Link>, en este teléfono.</p>
      </section>
    </main>
  );
}
