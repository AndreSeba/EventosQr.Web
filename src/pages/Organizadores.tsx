import { BadgeCheck, Link2, MessageCircle, QrCode, ScanLine, Ticket, Users, Wallet } from "lucide-react";
import { linkWhatsapp } from "../compartir";

// Número al que escriben los organizadores interesados (variable de build VITE_CONTACTO_WHATSAPP, con código de país)
const CONTACTO = (import.meta.env.VITE_CONTACTO_WHATSAPP as string | undefined)?.trim() || "";

const RASGOS = [
  { Ico: Wallet, t: "El dinero va directo a tu cuenta", d: "Tus compradores pagan con el QR de tu banco. Nadie se queda con tu plata en el medio." },
  { Ico: QrCode, t: "Entradas con QR únicos", d: "Cada QR entra una sola vez. Una captura repetida o un QR inventado no pasan la puerta." },
  { Ico: ScanLine, t: "Escáner en cualquier celular", d: "Tu staff escanea con la cámara del teléfono. Sin aparatos ni apps que instalar." },
  { Ico: Users, t: "Links para tus promotores", d: "Cada promotor vende con su propio link y ves cuántas entradas vendió cada uno." },
  { Ico: Ticket, t: "Preventa, cupos e invitaciones", d: "Tipos de entrada con precio de preventa, cupo y listas VIP o de invitados." },
  { Ico: Link2, t: "La entrada nunca se pierde", d: "Además del correo, cada comprador tiene un link con su QR y un botón para escribirte por WhatsApp." },
];

/** Página para organizadores: a donde llega quien toca «¿Organizás eventos?» en cualquier página de compra o en los correos. */
export default function Organizadores() {
  const escribir = CONTACTO && linkWhatsapp(CONTACTO, "Hola, organizo eventos y quiero vender mis entradas con EventosQr.");
  return (
    <main className="publica">
      <section className="org-hero">
        <p className="ceja">EventosQr · para organizadores</p>
        <h1>Vendé tus entradas con QR. Sin vueltas.</h1>
        <p>Publicás tu evento, tus compradores pagan con tu QR y suben el comprobante, vos lo aprobás y la entrada les llega al toque. En la puerta se escanea con el celular.</p>
        {escribir && <p><a className="btn grande" href={escribir} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Quiero vender con EventosQr</a></p>}
      </section>

      <div className="rasgos">
        {RASGOS.map(({ Ico, t, d }) => (
          <div key={t} className="rasgo"><Ico size={22} aria-hidden="true" /><b>{t}</b><p>{d}</p></div>
        ))}
      </div>

      <section className="card">
        <h2>Cómo funciona</h2>
        <ol className="como">
          <li><span>Creamos tu evento con tus tipos de entrada, precios y el QR de pago de tu cuenta.</span></li>
          <li><span>Compartís el link de venta (y cada promotor el suyo) por WhatsApp e Instagram.</span></li>
          <li><span>Aprobás los comprobantes desde el panel: cada comprador recibe su entrada con QR.</span></li>
          <li><span>El día del evento, tu staff escanea en la puerta y ves en vivo cuántos entraron.</span></li>
        </ol>
      </section>

      <section className="card">
        <h2><BadgeCheck size={20} style={{ verticalAlign: "-3px" }} /> Probado en serio</h2>
        <p className="suave">El sistema se prueba con 150 compras simultáneas sin vender una entrada de más, y cada organizador ve solo sus propios eventos y compradores.</p>
      </section>

      {escribir
        ? <p style={{ textAlign: "center" }}><a className="btn grande" href={escribir} target="_blank" rel="noreferrer"><MessageCircle size={18} /> Hablemos por WhatsApp</a></p>
        : <p className="suave chico" style={{ textAlign: "center" }}>Contacto próximamente.</p>}
    </main>
  );
}
