import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarPlus, MapPin, MessageCircle, Share2 } from "lucide-react";
import { api, msgError } from "../api";
import { agregarAlCalendario, compartir, linkWhatsapp } from "../compartir";
import { datosGuardados, guardarDatos, refDelLink } from "../comprador";
import { sugerirCorreo } from "../correo";
import Pasos from "../components/Pasos";
import PiePublico from "../components/PiePublico";
import { dinero, fechaCorta, hora } from "../format";
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

  const [enComprobante, setEnComprobante] = useState(false);
  // Cédula y nombres de quienes van a entrar: TODO opcional (la entrada sale igual si no se completa)
  const [ciComprador, setCiComprador] = useState("");
  const [acompanantes, setAcompanantes] = useState<{ nombre: string; ci: string }[]>([]);

  useEffect(() => {
    api<EventoPublico>(`/public/eventos/${slug}`).then(setEv).catch((e) => setError(msgError(e)));
  }, [slug]);
  // Cuando la sección del comprobante llega a la mitad de arriba de la pantalla, el comprador ya pasó por el pago
  // (rootMargin -50% abajo: asomarse al pie de una pantalla grande no cuenta)
  useEffect(() => {
    const el = document.getElementById("paso3");
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setEnComprobante(true); }, { rootMargin: "0px 0px -50% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ev]);

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
    const titulares = [{ nombre: "", ci: ciComprador }, ...Array.from({ length: cantidad - 1 }, (_, i) => acompanantes[i] ?? { nombre: "", ci: "" })];
    if (titulares.some((t) => t.nombre.trim() || t.ci.trim())) datos.set("titulares", JSON.stringify(titulares));
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
  // Sin conexión con el banco no se sabe cuándo pagó: llegar al comprobante (o empezar a llenarlo) es la señal del paso 3
  const paso = !elegido ? 1 : enComprobante ? 3 : 2;
  const sugerido = sugerirCorreo(email);
  const correosIguales = email.trim().toLowerCase() === email2.trim().toLowerCase();

  return (
    <main className={`publica${ev.imagenUrl ? " con-fondo" : ""}${elegido ? " con-barra" : ""}`}>
      {/* La imagen del evento va de fondo de toda la página, con una capa oscura para que el texto se lea */}
      {ev.imagenUrl && <div className="fondo-evento" style={{ backgroundImage: `url("${ev.imagenUrl}")` }} aria-hidden="true" />}
      <header className={`portada${ev.imagenUrl ? " con-afiche" : ""}`}>
        <div>
          <p className="ceja">{ev.lugar ?? "Entradas"}</p>
          <h1 className="titulo-evento">{ev.nombre}</h1>
          <ul className="datos">
            <li><span>Fecha</span><b>{fechaCorta(ev.fechaInicio)}</b></li>
            <li><span>Hora</span><b>{hora(ev.fechaInicio)}</b></li>
            {ev.edadMinima && <li><span>Edad mínima</span><b>{ev.edadMinima}</b></li>}
            <li><span>Pago</span><b>QR</b></li>
          </ul>
          <div className="fila">
            <button className="mini sec" onClick={async () => { const r = await compartir(ev.nombre, urlEvento); if (r === "copiado") avisar("Link del evento copiado."); }}>
              <Share2 size={14} /> Compartir evento
            </button>
            <button className="mini sec" onClick={() => agregarAlCalendario(ev, urlEvento)}><CalendarPlus size={14} /> Agregar al calendario</button>
          </div>
          {aviso && <p className="suave chico" role="status">{aviso}</p>}
        </div>
        {ev.imagenUrl && <img className="afiche" src={ev.imagenUrl} alt={`Afiche de ${ev.nombre}`} />}
      </header>
      {ev.descripcion && <p>{ev.descripcion}</p>}
      {ev.edadMinima && <p className="suave chico">Mayores de {ev.edadMinima}: en la puerta pueden pedirte el carnet.</p>}

      <Pasos actual={paso} secciones={["paso1", "paso2", "paso3", null]} />

      <section className="card" id="paso1">
        <h2>1. Elegí tu entrada</h2>
        {ev.tipos.length === 0 && <p className="suave">No hay entradas a la venta por ahora.</p>}
        {ev.tipos.map((t) => {
          const agotado = t.disponibles !== null && t.disponibles <= 0;
          const max = Math.min(ev.maxPorOrden, t.disponibles ?? Infinity);
          return (
            <label key={t.id} className={`tipo ${tipoId === t.id ? "sel" : ""} ${agotado ? "off" : ""}`} style={{ margin: "8px 0", color: "inherit", fontSize: "1rem" }}>
              <input type="radio" name="tipo" disabled={agotado} checked={tipoId === t.id}
                onChange={() => { setTipoId(t.id); setCantidad((c) => Math.max(1, Math.min(c, max))); }} />
              <span>
                <span className="nombre-tipo">{t.nombre}</span>
                {agotado && <span className="suave chico"> · AGOTADO</span>}
                {!agotado && t.disponibles !== null && t.disponibles <= 20 && <span className="suave chico"> · quedan {t.disponibles}</span>}
              </span>
              <span className="precio">
                {t.precioRegular && <span className="preventa">PREVENTA</span>}
                {t.precioRegular && <s className="regular">{dinero(t.precioRegular, ev.moneda)}</s>}
                {dinero(t.precio, ev.moneda)}
              </span>
              {tipoId === t.id && (
                // preventDefault: que tocar − / + no vuelva a activar el label
                <div className="cantidad" onClick={(e) => e.preventDefault()}>
                  <span className="suave">CANTIDAD</span>
                  <button type="button" className="sec" aria-label="Una entrada menos" disabled={cantidad <= 1} onClick={() => setCantidad((c) => c - 1)}>−</button>
                  <output aria-live="polite" aria-label="Cantidad de entradas">{cantidad}</output>
                  <button type="button" className="sec" aria-label="Una entrada más" disabled={cantidad >= max} onClick={() => setCantidad((c) => c + 1)}>+</button>
                </div>
              )}
            </label>
          );
        })}
      </section>

      <section className="card" id="paso2">
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
        <form onSubmit={enviar} onFocus={() => setEnComprobante(true)}>
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
          <details className="card" style={{ margin: "12px 0" }}>
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>Cédula y nombre de quienes entran (opcional)</summary>
            <p className="suave chico">Sirve para que en la puerta puedan comprobar que la entrada es de quien la usa. Si no lo llenás ahora, podés hacerlo (o cambiarlo) después desde el link de tu orden.</p>
            <label htmlFor="ci0">Tu cédula (opcional)</label>
            <input id="ci0" value={ciComprador} onChange={(e) => setCiComprador(e.target.value)} maxLength={20} autoComplete="off" inputMode="text"
              pattern="[A-Za-z0-9][A-Za-z0-9 .\-]{2,18}[A-Za-z0-9]" title="4 a 20 letras o números" />
            {Array.from({ length: cantidad - 1 }, (_, i) => (
              <div key={i}>
                <label htmlFor={`an${i}`}>Acompañante {i + 1}: nombre (opcional)</label>
                <input id={`an${i}`} maxLength={100} autoComplete="off" value={acompanantes[i]?.nombre ?? ""}
                  onChange={(e) => setAcompanantes((a) => { const n = [...a]; n[i] = { nombre: e.target.value, ci: n[i]?.ci ?? "" }; return n; })} />
                <label htmlFor={`ac${i}`}>Acompañante {i + 1}: cédula (opcional)</label>
                <input id={`ac${i}`} maxLength={20} autoComplete="off" value={acompanantes[i]?.ci ?? ""}
                  pattern="[A-Za-z0-9][A-Za-z0-9 .\-]{2,18}[A-Za-z0-9]" title="4 a 20 letras o números"
                  onChange={(e) => setAcompanantes((a) => { const n = [...a]; n[i] = { nombre: n[i]?.nombre ?? "", ci: e.target.value }; return n; })} />
              </div>
            ))}
          </details>
          <label htmlFor="comprobante">Comprobante (imagen o PDF, máx. {ev.maxComprobanteMb} MB)</label>
          <input id="comprobante" name="comprobante" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" />
          <label className="acepto">
            <input type="checkbox" required />
            <span>Acepto que usen mi nombre, celular y correo solo para emitir mi entrada.</span>
          </label>
          <input className="oculto" name="web" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          <p><button disabled={enviando || !ev.tipos.length}>{enviando ? "Enviando…" : "Enviar comprobante"}</button></p>
          {resultado && <div className={`msg ${resultado.ok ? "ok" : "err"}`} role="status">{resultado.texto}</div>}
        </form>
      </section>

      {(ev.lugar || ev.direccionUrl) && (
        <section className="card">
          <h2>Ubicación</h2>
          {ev.lugar && <p style={{ margin: "0 0 10px" }}>{ev.lugar}</p>}
          {ev.direccionUrl && <a className="btn sec mini" href={ev.direccionUrl} target="_blank" rel="noreferrer"><MapPin size={14} /> Cómo llegar</a>}
        </section>
      )}

      <section className="card dudas">
        <h2>Dudas rápidas</h2>
        <details>
          <summary>¿Cómo recibo mi entrada?</summary>
          <p>Revisamos tu comprobante y, cuando lo aprobamos, la entrada te llega al correo. Además, al enviarlo te damos un link donde ves el estado de tu orden y, una vez aprobada, el QR.</p>
        </details>
        <details>
          <summary>¿Puedo pasarle la entrada a otra persona?</summary>
          <p>Sí. Desde el link de tu orden podés cambiar el nombre de quien entra o <b>transferir</b> la entrada: se genera un QR nuevo para esa persona y el anterior deja de servir. Cada QR entra una sola vez: vale el primero que se escanea en la puerta, y en la puerta pueden pedir la cédula.</p>
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
      </section>

      <PiePublico />

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
