import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, MapPin, MessageCircle, Share2 } from "lucide-react";
import { api, msgError } from "../api";
import { agregarAlCalendario, compartir, linkWhatsapp } from "../compartir";
import { datosGuardados, guardarDatos, refDelLink } from "../comprador";
import { sugerirCorreo } from "../correo";
import { dinero, fechaLarga } from "../format";
import { comprimirImagen } from "../imagen";
import type { EventoPublico } from "../types";

export default function Compra() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [ev, setEv] = useState<EventoPublico | null>(null);
  const [error, setError] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; texto: string } | null>(null);
  const [aviso, setAviso] = useState("");
  // Datos de la última compra en este teléfono: se precargan y «No soy yo» los borra
  const [recordados] = useState(datosGuardados);
  const [nombre, setNombre] = useState(recordados?.nombre ?? "");
  const [telefono, setTelefono] = useState(recordados?.telefono ?? "");
  // El correo se escribe dos veces: un error de tipeo hace que la entrada rebote y nadie se entera
  const [email, setEmail] = useState(recordados?.email ?? "");
  const [email2, setEmail2] = useState(recordados?.email ?? "");
  const [precargado, setPrecargado] = useState(!!recordados);

  useEffect(() => {
    api<EventoPublico>(`/public/eventos/${slug}`).then(setEv).catch((e) => setError(msgError(e)));
  }, [slug]);

  if (error) return <main className="publica"><div className="msg err">{error}</div></main>;
  if (!ev) return <main className="publica"><p className="suave">Cargando…</p></main>;

  const urlEvento = `${location.origin}/e/${ev.slug}`;
  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(""), 3000); };

  function noSoyYo() {
    guardarDatos(null);
    setNombre(""); setTelefono(""); setEmail(""); setEmail2("");
    setPrecargado(false);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const archivo = datos.get("comprobante");
    if (!tipoId) return setResultado({ ok: false, texto: "Elegí un tipo de ticket." });
    if (!(archivo instanceof File) || archivo.size === 0) return setResultado({ ok: false, texto: "Adjuntá el comprobante." });
    if (!correosIguales) return setResultado({ ok: false, texto: "Los dos correos no coinciden. Revisalos: ahí te llega la entrada." });
    datos.set("tipoTicketId", tipoId);
    datos.set("cantidad", String(cantidad));
    const ref = refDelLink(ev!.slug);
    if (ref) datos.set("ref", ref);
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
      const r = await api<{ numero: number; acceso: string | null }>(`/public/eventos/${slug}/ordenes`, { form: datos });
      guardarDatos({ nombre: nombre.trim(), telefono: telefono.trim(), email: email.trim() });
      // El link de la orden pasa a ser la página del comprador: ahí ve el estado y, cuando se apruebe, sus QR
      if (r.acceso) return nav(`/o/${r.acceso}`, { state: { nueva: true } });
      setResultado({ ok: true, texto: `¡Recibido! Tu orden #${r.numero} está pendiente de revisión. Cuando se apruebe te llegará la entrada a ${email.trim()} (revisá spam).` });
    } catch (err) {
      setResultado({ ok: false, texto: msgError(err) });
    } finally {
      setEnviando(false);
    }
  }

  const elegido = ev.tipos.find((t) => t.id === tipoId);
  const total = elegido ? elegido.precio * cantidad : 0;
  const sugerido = sugerirCorreo(email);
  const correosIguales = email.trim().toLowerCase() === email2.trim().toLowerCase();

  return (
    <main className={`publica${ev.imagenUrl ? " con-fondo" : ""}${elegido ? " con-barra" : ""}`}>
      {/* La imagen del evento va de fondo de toda la página, con una capa oscura para que el texto se lea */}
      {ev.imagenUrl && <div className="fondo-evento" style={{ backgroundImage: `url("${ev.imagenUrl}")` }} aria-hidden="true" />}
      <h1>{ev.nombre}</h1>
      <p className="suave">
        {fechaLarga(ev.fechaInicio)}
        {ev.lugar && ` · ${ev.lugar}`}
        {ev.edadMinima && <><br />Mayores de {ev.edadMinima}: en la puerta pueden pedirte el carnet.</>}
      </p>
      <div className="fila">
        <button className="mini sec" onClick={async () => { const r = await compartir(ev.nombre, urlEvento); if (r === "copiado") avisar("Link del evento copiado."); }}>
          <Share2 size={14} /> Compartir evento
        </button>
        <button className="mini sec" onClick={() => agregarAlCalendario(ev, urlEvento)}><CalendarPlus size={14} /> Agregar al calendario</button>
        {ev.direccionUrl && <a className="btn sec mini" href={ev.direccionUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> Cómo llegar</a>}
      </div>
      {aviso && <p className="suave chico" role="status">{aviso}</p>}
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
        {ev.tipos.length > 0 && (
          <>
            <label htmlFor="cantidad">Cantidad de entradas</label>
            <select id="cantidad" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))}>
              {Array.from({ length: ev.maxPorOrden }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
            </select>
          </>
        )}
      </section>

      <section className="card">
        <h2>2. Pagá</h2>
        <p className="suave">
          {elegido
            ? <>Escaneá este QR con tu app de pagos y pagá <b style={{ color: "var(--texto)" }}>{dinero(total, ev.moneda)}</b>{cantidad > 1 && ` (${cantidad} × ${dinero(elegido.precio, ev.moneda)})`}{elegido.precioRegular ? ", precio de preventa" : ""}. Guardá el comprobante.</>
            : "Elegí tu ticket y escaneá este QR con tu app de pagos. Guardá el comprobante."}
        </p>
        {ev.qrPagoUrl ? <img className="qrpago" src={ev.qrPagoUrl} alt="QR de pago" /> : <p className="suave">El QR de pago aún no está disponible.</p>}
      </section>

      <section className="card" id="paso3">
        <h2>3. Subí tu comprobante</h2>
        <form onSubmit={enviar}>
          {precargado && (
            <p className="suave chico">Precargamos tus datos de la última vez. <button type="button" className="mini sec" onClick={noSoyYo}>No soy yo</button></p>
          )}
          <label htmlFor="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" required minLength={2} maxLength={100} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <label htmlFor="telefono">Celular / WhatsApp (8 dígitos, ej. 71234598)</label>
          <input id="telefono" name="telefono" type="tel" inputMode="tel" required maxLength={25} autoComplete="tel" placeholder="71234598" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
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
          <label htmlFor="comprobante">Comprobante (imagen o PDF, máx. {ev.maxComprobanteMb} MB)</label>
          <input id="comprobante" name="comprobante" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" />
          <label className="acepto">
            <input type="checkbox" required />
            <span>Acepto que usen mi nombre, celular y correo solo para emitir mi entrada y avisarme si el evento cambia.</span>
          </label>
          <input className="oculto" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p><button disabled={enviando || !ev.tipos.length}>{enviando ? "Enviando…" : "Enviar comprobante"}</button></p>
          {resultado && <div className={`msg ${resultado.ok ? "ok" : "err"}`} role="status">{resultado.texto}</div>}
        </form>
      </section>

      <section className="card dudas">
        <h2>Dudas rápidas</h2>
        <details>
          <summary>¿Cómo recibo mi entrada?</summary>
          <p>Revisamos tu comprobante y, cuando lo aprobamos, la entrada te llega al correo. Además, al enviarlo te damos un link donde ves el estado de tu orden y, una vez aprobada, el QR.</p>
        </details>
        <details>
          <summary>¿Puedo pasarle la entrada a otra persona?</summary>
          <p>Sí: mandale el QR o el link de tu orden. Cada QR entra una sola vez: vale el primero que se escanea en la puerta.</p>
        </details>
        <details>
          <summary>¿Y si no me llega el correo?</summary>
          <p>Revisá spam y «Promociones». Igual, tu entrada siempre está en el link de tu orden, que queda guardado en <Link to="/mis-entradas">Mis entradas</Link> en este teléfono.{ev.whatsapp && " Si algo falla, escribinos por WhatsApp."}</p>
        </details>
        <details>
          <summary>¿Qué pasa si el comprobante no coincide?</summary>
          <p>Te avisamos por correo con el motivo y podés volver a intentarlo desde esta misma página.</p>
        </details>
        {ev.whatsapp && (
          <p><a className="btn sec" target="_blank" rel="noreferrer" href={linkWhatsapp(ev.whatsapp, `Hola, tengo una consulta sobre las entradas para ${ev.nombre}.`)}>
            <MessageCircle size={16} /> Escribinos por WhatsApp
          </a></p>
        )}
        <p className="suave chico"><Link to="/mis-entradas">Mis entradas</Link></p>
      </section>

      {/* Barra fija abajo (sobre todo en el celular): qué elegiste, cuánto pagar y un atajo al paso 3 */}
      {elegido && (
        <div className="barra-compra">
          <span>{cantidad} × {elegido.nombre}</span>
          <b>{dinero(total, ev.moneda)}</b>
          <button className="mini" onClick={() => document.getElementById("paso3")?.scrollIntoView({ behavior: "smooth" })}>Subir comprobante</button>
        </div>
      )}
    </main>
  );
}
