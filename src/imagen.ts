/** Reduce una foto/captura antes de subirla: máx. `maxLado` px y JPEG con `calidad`.
 *  Un comprobante de 3-5 MB pasa a ~150-400 KB, sigue siendo legible y no satura el servidor ni el almacenamiento.
 *  PDFs y cualquier archivo que no se pueda decodificar se devuelven sin tocar. */
export async function comprimirImagen(archivo: File, maxLado = 1600, calidad = 0.75): Promise<File> {
  if (!archivo.type.startsWith("image/")) return archivo;
  try {
    const bmp = await createImageBitmap(archivo); // respeta la orientación EXIF de las fotos de celular
    const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * escala));
    const h = Math.max(1, Math.round(bmp.height * escala));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.fillStyle = "#fff"; // PNG con transparencia → fondo blanco (JPEG no tiene alfa)
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
    if (!blob || blob.size >= archivo.size) return archivo; // si no mejora, se queda el original
    return new File([blob], archivo.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return archivo;
  }
}
