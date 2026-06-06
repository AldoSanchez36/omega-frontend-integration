/** Extrae el `id` del usuario desde el payload del JWT (UUID en Supabase). */
export function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64)) as { id?: string };
    const id = payload.id?.trim();
    return id || null;
  } catch {
    return null;
  }
}
