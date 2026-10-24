import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { Ban, CircleAlert, CircleCheck, CircleX, ScanQrCode, TriangleAlert, type LucideIcon } from "lucide-react";
import { api, msgError } from "../api";
import { fechaHora } from "../format";
import type { ResultadoEscaneo } from "../types";

type Res = ResultadoEscaneo | { estado: "ERROR"; mensaje: string };

/** Cuánto se queda el resultado en pantalla (ms). Los casos que NO dejan pasar duran más para que el staff alcance a leerlos. */
const DURACION: Record<Res["estado"], number> = { VALIDA: 2500, YA_USADA: 4500, ANULADA: 4500, INVALIDA: 4000, ERROR: 3500 };
/** Si el mismo QR sigue frente a la cámara, no se vuelve a consultar hasta que haya desaparecido este tiempo (ms).
 *  Así dejar el celular del cliente apuntado no convierte un VÁLIDA en un «YA USADA». */
const AUSENCIA_PARA_RELEER = 3000;

const ASPECTO: Record<Res["estado"], { Ico: LucideIcon; titulo: string }> = {
  VALIDA: { Ico: CircleCheck, titulo: "VÁLIDA" },
  YA_USADA: { Ico: TriangleAlert, titulo: "YA USADA" },
  ANULADA: { Ico: Ban, titulo: "ANULADA" },
  INVALIDA: { Ico: CircleX, titulo: "INVÁLIDA" },
  ERROR: { Ico: CircleAlert, titulo: "ERROR" },
};

export default function Escaner() {
  const [res, setRes] = useState<Res | null>(null);
  const [camaraError, setCamaraError] = useState("");
  const [manual, setManual] = useState("");
  const ocupado = useRef(false); // consultando al servidor o mostrando un resultado
  const visto = useRef({ token: "", t: 0 }); // último QR detectado y cuándo (se actualiza en CADA detección)
  const cierre = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cerrar = useCallback(() => {
    if (cierre.current) clearTimeout(cierre.current);
    cierre.current = null;
    setRes(null);
    ocupado.current = false;
  }, []);

  const consultar = useCallback(async (token: string) => {
    if (ocupado.current) return;
    ocupado.current = true;
    let r: Res;
    try {
      r = await api<ResultadoEscaneo>("/scan", { body: { token } });
    } catch (e) {
      r = { estado: "ERROR", mensaje: msgError(e) };
      visto.current = { token: "", t: 0 }; // tras un error, permitir reintentar el mismo QR
    }
    navigator.vibrate?.(r.estado === "VALIDA" ? 120 : [200, 80, 200]);
    setRes(r);
    cierre.current = setTimeout(cerrar, DURACION[r.estado]);
  }, [cerrar]);

  const alDetectar = useCallback((texto: string) => {
    const token = texto.trim();
    const ahora = Date.now();
    const previo = visto.current;
    visto.current = { token, t: ahora };
    if (ocupado.current) return; // hay un resultado a la vista o una consulta en curso
    if (token === previo.token && ahora - previo.t < AUSENCIA_PARA_RELEER) return; // el mismo QR sigue ahí
    void consultar(token);
  }, [consultar]);

  useEffect(() => () => { if (cierre.current) clearTimeout(cierre.current); }, []);

  useEffect(() => {
    let lector: Html5Qrcode | null = null;
    let cancelado = false;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelado) return;
      lector = new Html5Qrcode("lector", { verbose: false });
      try {
        await lector.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: (w, h) => ({ width: Math.min(w, h) * 0.8, height: Math.min(w, h) * 0.8 }) },
          alDetectar,
          () => {},
        );
      } catch {
        setCamaraError("No se pudo abrir la cámara. Permití el acceso (requiere HTTPS) o usá el ingreso manual.");
      }
    })();
    return () => {
      cancelado = true;
      if (lector?.isScanning) lector.stop().then(() => lector?.clear()).catch(() => {});
    };
  }, [alDetectar]);

  const a = res ? ASPECTO[res.estado] : null;
  return (
    <>
      <h1><ScanQrCode size={26} style={{ verticalAlign: "-4px", marginRight: 8 }} />Escáner</h1>
      <div id="lector" />
      <p className="suave chico" style={{ textAlign: "center" }}>Apuntá la cámara al QR de la entrada</p>
      {camaraError && <div className="msg err">{camaraError}</div>}

      <details>
        <summary style={{ cursor: "pointer", color: "var(--acento2)" }}>Ingreso manual del código</summary>
        <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) void consultar(manual.trim()); setManual(""); }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código de 32 caracteres" autoCapitalize="off" autoCorrect="off" />
          <p><button className="sec">Validar</button></p>
        </form>
      </details>

      {res && a && (
        <div className="resultado-fondo" onClick={cerrar} role="alert">
          <div className={`resultado-centro ${res.estado}`}>
            <a.Ico size={84} strokeWidth={1.7} aria-hidden="true" />
            <div className="grande">{a.titulo}</div>
            {"nombre" in res && <div className="quien">{res.nombre}</div>}
            {"tipo" in res && res.tipo && <div className="detalle">{res.tipo}</div>}
            {res.estado === "YA_USADA" && <div className="detalle">Primer ingreso: {fechaHora(res.usadaEn)}</div>}
            {res.estado === "INVALIDA" && <div className="detalle">Este código no existe o es de otro evento.</div>}
            {res.estado === "ERROR" && <div className="detalle">{res.mensaje}</div>}
            <div className="barra-tiempo"><span key={res.estado + (("nombre" in res && res.nombre) || "")} style={{ animationDuration: `${DURACION[res.estado]}ms` }} /></div>
            <div className="toca">Toca para cerrar</div>
          </div>
        </div>
      )}
    </>
  );
}
