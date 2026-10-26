import { Link } from "react-router-dom";

/** Pie de las páginas públicas. Cada comprador que lo ve es un posible organizador: lleva a la página para organizadores. */
export default function PiePublico() {
  return (
    <footer className="pie-publico">
      <span>Entradas con <Link to="/organizadores" className="marca-pie">EVENTOSQR</Link></span>
      <span><Link to="/mis-entradas">Mis entradas</Link> · <Link to="/organizadores">¿Organizás eventos?</Link></span>
    </footer>
  );
}
