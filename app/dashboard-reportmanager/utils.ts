/**
 * Normaliza el valor de comentarios para mostrar en UI.
 * Si viene guardado como JSON con clave "global" (ej. {"global":"texto"}), devuelve el texto;
 * en caso contrario devuelve el string tal cual.
 */
export function parseComentariosForDisplay(val: string | undefined | null): string {
  if (val == null || val === "") return "";
  const t = String(val).trim();
  if (!t) return "";
  if (t.startsWith("{")) {
    try {
      const o = JSON.parse(t) as { global?: string };
      if (o && typeof o === "object" && "global" in o && typeof o.global === "string") {
        return o.global;
      }
    } catch {
      // no es JSON válido, devolver tal cual
    }
  }
  return t;
}
