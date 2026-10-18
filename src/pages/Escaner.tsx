import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { api, msgError } from "../api";
import { fechaHora } from "../format";
import type { ResultadoEscaneo } from "../types";

type Res = ResultadoEscaneo | { estado: "ERROR"; mensaje: string };

export default function Escaner() {
  const [res, setRes] = useState<Res | null>(null);
  const [camaraError, setCamaraError] = useState("");
  const [manual, setManual] = useState("");
  const ocupado = useRef(false);
  const ultimo = useRef({ token: "", t: 0 });

  const procesar = useCallback(async (token: string) => {
    const ahora = Date.now();
    // No reenviar el mismo QR mientras sigue frente a la cámara
    if (ocupado.current || (token === ultimo.current.token && ahora - ultimo.current.t < 4000)) return;
    ocupado.current = true;
    ultimo.current = { token, t: ahora };
    try {
      const r = await api<ResultadoEscaneo>("/scan", { body: { token } });
      setRes(r);
      navigator.vibrate?.(r.estado === "VALIDA" ? 120 : [200, 80, 200]);
    } catch (e) {
      setRes({ estado: "ERROR", mensaje: msgError(e) });
      ultimo.current = { token: "", t: 0 }; // permitir reintentar el mismo QR
    } finally {
      ocupado.current = false;
    }
  }, []);

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
          (texto) => void procesar(texto.trim()),
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
  }, [procesar]);

  const clase = res ? (res.estado === "ERROR" ? "INVALIDA" : res.estado) : "";
  return (
    <>
      <h1>Escáner</h1>
      <div id="lector" />
      {camaraError && <div className="msg err">{camaraError}</div>}
      {res && (
        <div className={`resultado ${clase}`} role="alert">
          {res.estado === "VALIDA" && <><div className="grande">✅ VÁLIDA</div><div>{res.nombre}</div><div>{res.tipo}</div></>}
          {res.estado === "YA_USADA" && <><div className="grande">⚠ YA USADA</div><div>{res.nombre} · {res.tipo}</div><div>Primer ingreso: {fechaHora(res.usadaEn)}</div></>}
          {res.estado === "ANULADA" && <><div className="grande">⛔ ANULADA</div><div>{res.nombre}</div></>}
          {res.estado === "INVALIDA" && <div className="grande">❌ INVÁLIDA</div>}
          {res.estado === "ERROR" && <><div className="grande">❌ ERROR</div><div>{res.mensaje}</div></>}
        </div>
      )}
      <details>
        <summary style={{ cursor: "pointer", color: "var(--acento2)" }}>Ingreso manual del código</summary>
        <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) void procesar(manual.trim()); setManual(""); }}>
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Código de 32 caracteres" autoCapitalize="off" autoCorrect="off" />
          <p><button className="sec">Validar</button></p>
        </form>
      </details>
    </>
  );
}
