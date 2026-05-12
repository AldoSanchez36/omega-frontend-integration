export interface ResolveReportUsuarioDisplayOptions {
  missingDisplayName?: string;
  missingPuesto?: string;
}

/**
 * Formas soportadas: JOIN/vista (`usuario_username`, …), objetos `report.usuario` / `report.user`,
 * JSON `datos.user`, cadena `report.usuario`.
 */
export function resolveReportUsuarioDisplay(
  report: Record<string, unknown>,
  datosJsonb: Record<string, unknown>,
  options?: ResolveReportUsuarioDisplayOptions
): { usuario_id: string; usuario: string; puesto: string; email: string } {
  const missingName = options?.missingDisplayName ?? "Usuario desconocido";
  const missingPuesto = options?.missingPuesto ?? "Usuario desconocido";

  const usuarioNested =
    report.usuario && typeof report.usuario === "object" && !Array.isArray(report.usuario)
      ? (report.usuario as Record<string, string | undefined>)
      : null;
  const userNested =
    report.user && typeof report.user === "object" && !Array.isArray(report.user)
      ? (report.user as Record<string, string | undefined>)
      : null;
  const nested = usuarioNested || userNested;

  const datosUser = (datosJsonb.user || {}) as Record<string, string | undefined>;

  const usuarioId =
    nested?.id ||
    (report.usuario_id as string | undefined) ||
    (report.user_id as string | undefined) ||
    (report.usuarioId as string | undefined) ||
    datosUser.id ||
    "";

  const flatUsername =
    (report.usuario_username as string | undefined) ??
    (report.usuario_nombre as string | undefined) ??
    (report.usuarioNombre as string | undefined) ??
    (report.nombre_usuario as string | undefined);

  const flatPuesto =
    (report.usuario_puesto as string | undefined) ??
    (report.usuarioPuesto as string | undefined) ??
    (report.puesto_usuario as string | undefined);

  const flatEmail =
    (report.usuario_email as string | undefined) ??
    (report.usuarioEmail as string | undefined) ??
    (report.email_usuario as string | undefined);

  const usernameString =
    typeof report.usuario === "string" && report.usuario.trim() !== ""
      ? report.usuario.trim()
      : undefined;

  const usuario =
    nested?.username ||
    nested?.nombre ||
    usernameString ||
    datosUser.username ||
    datosUser.nombre ||
    flatUsername ||
    missingName;

  const puesto =
    nested?.puesto ||
    datosUser.puesto ||
    (typeof report.puesto === "string" && report.puesto.trim() !== "" ? report.puesto.trim() : undefined) ||
    flatPuesto ||
    missingPuesto;

  const email = nested?.email || datosUser.email || flatEmail || "";

  return {
    usuario_id: usuarioId,
    usuario,
    puesto,
    email,
  };
}

/** Completa `datos.user` con lo resuelto del API/JOIN sin pisar campos ya guardados en JSONB. */
export function mergeDatosJsonbWithUsuario(
  datosJsonb: Record<string, unknown>,
  resolved: { usuario_id: string; usuario: string; puesto: string; email: string }
): Record<string, unknown> {
  const prev = ((datosJsonb.user ?? {}) as Record<string, unknown>) ?? {};
  return {
    ...datosJsonb,
    user: {
      ...prev,
      id: (prev.id as string | undefined) || resolved.usuario_id,
      username: ((prev.username as string | undefined) || (prev.nombre as string | undefined) || resolved.usuario) as string,
      email: ((prev.email as string | undefined) || resolved.email || undefined) as string | undefined,
      puesto: ((prev.puesto as string | undefined) || resolved.puesto) as string | undefined,
      cliente_id: prev.cliente_id,
    },
  };
}
