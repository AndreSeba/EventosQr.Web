import { Navigate, NavLink, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { Building2, CalendarDays, LayoutDashboard, ScanQrCode, Ticket, Wallet, type LucideIcon } from "lucide-react";
import { useSesion } from "./session";
import { ETIQUETA_ROL } from "./roles";
import type { Rol } from "./types";
import Compra from "./pages/Compra";
import Orden from "./pages/Orden";
import MisEntradas from "./pages/MisEntradas";
import Login from "./pages/Login";
import Panel from "./pages/Panel";
import Eventos from "./pages/Eventos";
import EventoForm from "./pages/EventoForm";
import Ordenes from "./pages/Ordenes";
import Tickets from "./pages/Tickets";
import Escaner from "./pages/Escaner";
import Usuarios from "./pages/Usuarios";
import Perfil from "./pages/Perfil";
import Organizaciones from "./pages/Organizaciones";

const ITEMS: { a: string; Ico: LucideIcon; txt: string; roles: Rol[] }[] = [
  { a: "/", Ico: LayoutDashboard, txt: "Panel", roles: ["superadmin", "admin", "rrpp", "staff"] },
  { a: "/eventos", Ico: CalendarDays, txt: "Eventos", roles: ["superadmin", "admin"] },
  { a: "/ordenes", Ico: Wallet, txt: "Órdenes", roles: ["superadmin", "admin"] },
  { a: "/escaner", Ico: ScanQrCode, txt: "Escáner", roles: ["superadmin", "admin", "staff"] },
  { a: "/tickets", Ico: Ticket, txt: "Tickets", roles: ["superadmin", "admin", "rrpp", "staff"] },
  { a: "/organizaciones", Ico: Building2, txt: "Clientes", roles: ["superadmin"] },
];

function Protegido({ roles }: { roles?: Rol[] }) {
  const { usuario, cargando } = useSesion();
  const loc = useLocation();
  if (cargando) return <div className="pagina"><p className="suave">Cargando…</p></div>;
  if (!usuario) return <Navigate to="/login" state={{ desde: loc.pathname }} replace />;
  if (roles && !roles.includes(usuario.rol)) return <Navigate to="/" replace />;
  return (
    <>
      <div className="pagina">
        <div className="barra">
          <span className="marca">EVENTOSQR</span>
          <NavLink to="/perfil" className="suave chico">{usuario.orgNombre ? `${usuario.orgNombre} · ` : ""}{usuario.nombre} · {ETIQUETA_ROL[usuario.rol]}</NavLink>
        </div>
        <Outlet />
      </div>
      <nav className="nav">
        {ITEMS.filter((i) => i.roles.includes(usuario.rol)).map((i) => (
          <NavLink key={i.a} to={i.a} end={i.a === "/"} className={({ isActive }) => (isActive ? "activo" : "")}>
            <i.Ico className="ico" size={24} strokeWidth={1.8} aria-hidden="true" />{i.txt}
          </NavLink>
        ))}
      </nav>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/e/:slug" element={<Compra />} />
      <Route path="/o/:acceso" element={<Orden />} />
      <Route path="/mis-entradas" element={<MisEntradas />} />
      <Route path="/login" element={<Login />} />
      <Route element={<Protegido />}>
        <Route path="/" element={<Panel />} />
        <Route path="/tickets" element={<Tickets />} />
        <Route path="/perfil" element={<Perfil />} />
      </Route>
      <Route element={<Protegido roles={["superadmin", "admin"]} />}>
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/eventos/:id" element={<EventoForm />} />
        <Route path="/ordenes" element={<Ordenes />} />
        <Route path="/usuarios" element={<Usuarios />} />
      </Route>
      <Route element={<Protegido roles={["superadmin", "admin", "staff"]} />}>
        <Route path="/escaner" element={<Escaner />} />
      </Route>
      <Route element={<Protegido roles={["superadmin"]} />}>
        <Route path="/organizaciones" element={<Organizaciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
