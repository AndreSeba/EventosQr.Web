import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, msgError } from "../api";
import { sugerirCorreo } from "../correo";
import { dinero, fechaLarga } from "../format";
import { comprimirImagen } from "../imagen";
import type { EventoPublico } from "../types";

export default function Compra() {
  const { slug } = useParams();
  const [ev, setEv] = useState<EventoPublico | null>(null);
  const [error, setError] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  // El correo se escribe dos veces: un error de tipeo hace que la entrada rebote y nadie se entera
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");

  useEffect(() => {
    api<EventoPublico>(`/public/eventos/${slug}`).then(setEv).catch((e) => setError(msgError(e)));
  }, [slug]);

  if (error) return <main className="publica"><div className="msg err">{error}</div></main>;
  if (!ev) return <main className="publica"><p className="suave">Cargando…</p></main>;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);
    const archivo = datos.get("comprobante");
    if (!tipoId) return setResultado({ ok: false, texto: "Elegí un tipo de ticket." });
    if (!(archivo instanceof File) || archivo.size === 0) return setResultado({ ok: false, texto: "Adjuntá el comprobante." });
    if (!correosIguales) return setResultado({ ok: false, texto: "Los dos correos no coinciden. Revisalos: ahí te llega la entrada." });
    datos.set("tipoTicketId", tipoId);
    setEnviando(true);
    setResultado(null);
    try {
      // Se reduce la resolución en el celular antes de subir (los PDF pasan tal cual)
      const liviano = await comprimirImagen(archivo);
      if (liviano.size > ev!.maxComprobanteMb * 1024 * 1024) {
        setEnviando(false);
        return setResultado({ ok: false, texto: `El archivo supera ${ev!.maxComprobanteMb} MB.` });
      }
      datos.set("comprobante", liviano, liviano.name);
      const r = await api<{ numero: number }>(`/public/eventos/${slug}/ordenes`, { form: datos });
      form.reset();
      setTipoId("");
      setEmail("");
      setEmail2("");
      setResultado({ ok: true, texto: `¡Recibido! Tu orden #${r.numero} está pendiente de revisión. Cuando se apruebe te llegará la entrada a ${email.trim()} (revisá spam).` });
    } catch (err) {
      setResultado({ ok: false, texto: msgError(err) });
    } finally {
      setEnviando(false);
    }
  }

  const elegido = ev.tipos.find((t) => t.id === tipoId);
  const sugerido = sugerirCorreo(email);
  const correosIguales = email.trim().toLowerCase() === email2.trim().toLowerCase();

  return (
    <main className={`publica${ev.imagenUrl ? " con-fondo" : ""}`}>
      {/* La imagen del evento va de fondo de toda la página, con una capa oscura para que el texto se lea */}
      {ev.imagenUrl && <div className="fondo-evento" style={{ backgroundImage: `url("${ev.imagenUrl}")` }} aria-hidden="true" />}
      <h1>{ev.nombre}</h1>
      <p className="suave">
        {fechaLarga(ev.fechaInicio)}
        {ev.lugar && ` · ${ev.lugar}`}
        {ev.direccionUrl && <> · <a href={ev.direccionUrl} target="_blank" rel="noreferrer">Ver ubicación</a></>}
      </p>
      {ev.descripcion && <p>{ev.descripcion}</p>}

      <section className="card">
        <h2>1. Elegí tu ticket</h2>
        {ev.tipos.length === 0 && <p className="suave">No hay tickets a la venta por ahora.</p>}
        {ev.tipos.map((t) => {
          const agotado = t.disponibles !== null && t.disponibles <= 0;
          return (
            <label key={t.id} className={`tipo ${tipoId === t.id ? "sel" : ""} ${agotado ? "off" : ""}`} style={{ margin: "8px 0", color: "inherit", fontSize: "1rem" }}>
              <input type="radio" name="tipo" disabled={agotado} checked={tipoId === t.id} onChange={() => setTipoId(t.id)} />
              <span>{t.nombre}{agotado && " · AGOTADO"}{!agotado && t.disponibles !== null && t.disponibles <= 20 && <span className="suave chico"> · quedan {t.disponibles}</span>}</span>
              <span className="precio">
                {t.precioRegular && <span className="preventa">PREVENTA</span>}
                {t.precioRegular && <s className="regular">{dinero(t.precioRegular, ev.moneda)}</s>}
                {dinero(t.precio, ev.moneda)}
              </span>
            </label>
          );
        })}
      </section>

      <section className="card">
        <h2>2. Pagá</h2>
        <p className="suave">
          Escaneá este QR con tu app de pagos{elegido ? ` y pagá ${dinero(elegido.precio, ev.moneda)} por entrada${elegido.precioRegular ? " (precio de preventa)" : ""}` : ""}. Guardá el comprobante.
        </p>
        {ev.qrPagoUrl ? <img className="qrpago" src={ev.qrPagoUrl} alt="QR de pago" /> : <p className="suave">El QR de pago aún no está disponible.</p>}
      </section>

      <section className="card">
        <h2>3. Subí tu comprobante</h2>
        <form onSubmit={enviar}>
          <label htmlFor="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" required minLength={2} maxLength={100} autoComplete="name" />
          <label htmlFor="telefono">Celular / WhatsApp (8 dígitos, ej. 71234598)</label>
          <input id="telefono" name="telefono" type="tel" inputMode="tel" required maxLength={25} autoComplete="tel" placeholder="71234598" />
          <label htmlFor="email">Correo donde recibirás el QR</label>
          <input id="email" name="email" type="email" required maxLength={120} autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {sugerido && (
            <p className="msg err chico" role="status">
              ¿Quisiste decir <b>{sugerido}</b>?{" "}
              <button type="button" className="mini sec" onClick={() => setEmail(sugerido)}>Sí, corregir</button>
            </p>
          )}
          <label htmlFor="email2">Repetí el correo</label>
          {/* Sin name: no se envía; sin pegar, para que se escriba de nuevo y se note un error de tipeo */}
          <input id="email2" type="email" required maxLength={120} autoComplete="off" value={email2}
            onChange={(e) => setEmail2(e.target.value)} onPaste={(e) => e.preventDefault()} />
          {email2 && !correosIguales && <p className="suave chico">Los correos no coinciden.</p>}
          <label htmlFor="cantidad">Cantidad de entradas</label>
          <select id="cantidad" name="cantidad" defaultValue="1">
            {Array.from({ length: ev.maxPorOrden }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <label htmlFor="comprobante">Comprobante (imagen o PDF, máx. {ev.maxComprobanteMb} MB)</label>
          <input id="comprobante" name="comprobante" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" />
          <input className="oculto" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p><button disabled={enviando || !ev.tipos.length}>{enviando ? "Enviando…" : "Enviar comprobante"}</button></p>
          {resultado && <div className={`msg ${resultado.ok ? "ok" : "err"}`} role="status">{resultado.texto}</div>}
        </form>
      </section>
    </main>
  );
}
