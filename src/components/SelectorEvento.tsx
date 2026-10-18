import { useSesion } from "../session";

export default function SelectorEvento() {
  const { eventos, evento, elegirEvento } = useSesion();
  if (!eventos.length) return null;
  return (
    <>
      <label htmlFor="sel-evento">Evento</label>
      <select id="sel-evento" value={evento?.id ?? ""} onChange={(e) => elegirEvento(e.target.value)}>
        {eventos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
      </select>
    </>
  );
}
