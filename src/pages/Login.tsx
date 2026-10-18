import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { msgError } from "../api";
import { useSesion } from "../session";

export default function Login() {
  const { usuario, login } = useSesion();
  const nav = useNavigate();
  const loc = useLocation();
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  if (usuario) return <Navigate to="/" replace />;

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    setError("");
    try {
      await login(String(f.get("email")), String(f.get("password")));
      nav((loc.state as { desde?: string } | null)?.desde ?? "/", { replace: true });
    } catch (err) {
      setError(msgError(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="publica">
      <h1>EventosQr</h1>
      <p className="suave">Acceso del equipo</p>
      <form className="card" onSubmit={enviar}>
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        {error && <div className="msg err" role="alert">{error}</div>}
        <p><button disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button></p>
      </form>
    </main>
  );
}
