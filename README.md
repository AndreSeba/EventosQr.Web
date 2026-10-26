# EventosQr.Web

Front de EventosQr (repo hermano de `../EventosQr.Api`, como InventoryPlatform / InventoryPlatform.Web). React 19 + Vite + TypeScript + React Router. Mobile-first, tema oscuro/naranja.

## Pantallas

| Ruta | Rol | Qué hace |
|---|---|---|
| `/e/:slug` | público | Compra: elegir tipo de ticket, QR de pago, datos y comprobante |
| `/o/:acceso`, `/mis-entradas` | público | Link de la orden (estado y QR) y órdenes guardadas en el teléfono |
| `/organizadores` | público | Página para organizadores (publicidad) |
| `/equipo` | — | Acceso del equipo (correo + contraseña). No se enlaza desde ninguna página pública |
| `/` | todos | Panel: selector de evento, link de venta, ventas, tickets emitidos/usados, por tipo, acciones rápidas. **Sin sesión muestra la página para organizadores**, no el acceso del equipo |
| `/eventos`, `/eventos/:id` | admin | Crear/editar eventos, imagen, QR de pago, tipos de ticket con precio y cupo, equipo, archivar |
| `/ordenes` | admin | Revisar comprobantes: aprobar / rechazar (con motivo) / reenviar correo |
| `/tickets` | todos | Lista de invitados con búsqueda y filtros Todos/Válido/Usado/Anulado; emitir invitaciones/VIP (admin, RRPP); anular (admin) |
| `/escaner` | admin, staff | Cámara + ingreso manual; VÁLIDA / YA USADA / ANULADA / INVÁLIDA |
| `/usuarios` | admin | Alta de usuarios, rol, activar/desactivar, cambio de contraseña |
| `/perfil` | todos | Datos y cambio de contraseña propia |

La barra inferior muestra solo lo que el rol puede usar. Los permisos reales los exige la API; el front solo oculta.

## Uso

```bash
copy .env.example .env     # VITE_API_URL = URL de EventosQr.Api
npm install
npm run dev                # http://localhost:5173
npm run build              # tsc + vite build → dist/
```

## Despliegue gratis

Es un sitio estático (`dist/`): Netlify, Cloudflare Pages o Vercel. Variable de build: `VITE_API_URL` (URL pública del API). `public/_redirects` ya trae el *fallback* de SPA para Netlify/Cloudflare. En el API, poné `CORS_ORIGINS` y `FRONTEND_URL` con la URL de este sitio (el link de venta de cada evento sale de `FRONTEND_URL`).

La cámara del escáner requiere **HTTPS** (los hostings anteriores ya lo dan).

**Vista previa al compartir (solo Cloudflare Pages):** `functions/e/[slug].ts` pone el nombre, la fecha y la imagen del evento en el HTML de
`/e/<evento>` para que WhatsApp e Instagram armen la vista previa. Necesita la variable `API_URL` (URL pública del API) en
Settings > Environment variables; si no está, usa `VITE_API_URL`, y si tampoco, sirve la página sin cambios.
**Hoy el sitio está en Render (static site), donde esa carpeta no se ejecuta**: la vista previa queda pendiente (ver `PENDIENTES.md` del API).

## Notas

- El token de sesión se guarda en `localStorage` (el front y el API están en dominios distintos). Expira a las 12 h; si el API lo rechaza, el front cierra sesión solo.
- No hay tests automáticos del front todavía; la lógica crítica (escaneo atómico, permisos, cupos) vive y se prueba en el API.
