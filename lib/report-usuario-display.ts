export interface ResolveReportUsuarioDisplayOptions {
  missingDisplayName?: string;
  missingPuesto?: string;
}

export interface UserLookupEntry {
  username: string;
  puesto: string;
  email?: string;
}

const PLACEHOLDER_NAMES = new Set(["Default", "Usuario", "Usuario desconocido"]);

function normalizeUserId(id: unknown): string {
  if (id == null) return "";
  const s = String(id).trim();
  return s;
}

/** Parsea `datos` (JSONB o string) y fusiona `user`/`usuario` de la raíz del reporte. */
export function parseReportDatosJsonb(report: Record<string, unknown>): Record<string, unknown> {
  let datos: unknown = report.datos ?? report.reportSelection ?? {};
  if (typeof datos === "string") {
    try {
      datos = JSON.parse(datos);
    } catch {
      datos = {};
    }
  }
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    datos = {};
  }
  const datosRecord = { ...(datos as Record<string, unknown>) };

  const rootUser = report.user;
  if (rootUser && typeof rootUser === "object" && !Array.isArray(rootUser)) {
    const existing = datosRecord.user;
    const root = rootUser as Record<string, unknown>;
    if (
      !existing ||
      (typeof existing === "object" &&
        !Array.isArray(existing) &&
        !(existing as Record<string, unknown>).username &&
        !(existing as Record<string, unknown>).nombre)
    ) {
      datosRecord.user = {
        ...(typeof existing === "object" && !Array.isArray(existing) ? existing : {}),
        ...root,
      };
    }
  }

  const rootUsuario = report.usuario;
  if (rootUsuario && typeof rootUsuario === "object" && !Array.isArray(rootUsuario)) {
    const existing = datosRecord.user;
    if (
      !existing ||
      (typeof existing === "object" &&
        !Array.isArray(existing) &&
        !(existing as Record<string, unknown>).username &&
        !(existing as Record<string, unknown>).nombre)
    ) {
      datosRecord.user = {
        ...(typeof existing === "object" && !Array.isArray(existing) ? existing : {}),
        ...(rootUsuario as Record<string, unknown>),
      };
    }
  }

  return datosRecord;
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
  const creadorNested =
    report.creador && typeof report.creador === "object" && !Array.isArray(report.creador)
      ? (report.creador as Record<string, string | undefined>)
      : null;
  const nested = usuarioNested || userNested || creadorNested;

  const datosUserRaw = datosJsonb.user ?? datosJsonb.usuario;
  const datosUser =
    datosUserRaw && typeof datosUserRaw === "object" && !Array.isArray(datosUserRaw)
      ? (datosUserRaw as Record<string, string | undefined>)
      : ({} as Record<string, string | undefined>);

  const usuarioId = normalizeUserId(
    nested?.id ||
      report.usuario_id ||
      report.user_id ||
      report.usuarioId ||
      report.creador_id ||
      report.creado_por ||
      datosUser.id
  );

  const flatUsername =
    (report.usuario_username as string | undefined) ??
    (report.usuario_nombre as string | undefined) ??
    (report.usuarioNombre as string | undefined) ??
    (report.nombre_usuario as string | undefined) ??
    (report.creador_username as string | undefined) ??
    (report.creador_nombre as string | undefined) ??
    (report.creadorNombre as string | undefined);

  const flatPuesto =
    (report.usuario_puesto as string | undefined) ??
    (report.usuarioPuesto as string | undefined) ??
    (report.puesto_usuario as string | undefined) ??
    (report.creador_puesto as string | undefined);

  const flatEmail =
    (report.usuario_email as string | undefined) ??
    (report.usuarioEmail as string | undefined) ??
    (report.email_usuario as string | undefined) ??
    (report.creador_email as string | undefined);

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

/** Mapa id → usuario desde `/api/auth/users`. */
export async function fetchUsersByIdMap(
  apiBaseUrl: string,
  usersEndpoint: string,
  token: string
): Promise<Map<string, UserLookupEntry>> {
  const map = new Map<string, UserLookupEntry>();
  try {
    const res = await fetch(`${apiBaseUrl}${usersEndpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) return map;

    const data = await res.json();
    const list = Array.isArray(data) ? data : data.users || data.usuarios || [];
    for (const raw of list) {
      const u = raw as Record<string, unknown>;
      const id = normalizeUserId(u.id || u._id);
      if (!id) continue;
      const username = String(u.username || u.nombre || u.name || "").trim();
      if (!username) continue;
      map.set(id, {
        username,
        puesto: String(u.puesto || "").trim(),
        email: u.email ? String(u.email) : undefined,
      });
    }
  } catch {
    return map;
  }
  return map;
}

/** Completa el mapa con `/api/auth/user/:id` para ids que faltan. */
export async function enrichUsersMapWithReportIds(
  apiBaseUrl: string,
  userByIdEndpoint: (userId: string) => string,
  token: string,
  reportUserIds: string[],
  map: Map<string, UserLookupEntry>
): Promise<Map<string, UserLookupEntry>> {
  const missing = [...new Set(reportUserIds.map(normalizeUserId).filter((id) => id && !map.has(id)))].slice(0, 40);
  await Promise.all(
    missing.map(async (id) => {
      try {
        const res = await fetch(`${apiBaseUrl}${userByIdEndpoint(id)}`, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        const u = (data.user ?? data.usuario ?? data) as Record<string, unknown>;
        const username = String(u.username || u.nombre || u.name || "").trim();
        if (!username) return;
        map.set(id, {
          username,
          puesto: String(u.puesto || "").trim(),
          email: u.email ? String(u.email) : undefined,
        });
      } catch {
        /* omitir */
      }
    })
  );
  return map;
}

export function enrichResolvedUsuarioWithUsersMap(
  resolved: { usuario_id: string; usuario: string; puesto: string; email: string },
  usersById: Map<string, UserLookupEntry>,
  options?: ResolveReportUsuarioDisplayOptions
): { usuario_id: string; usuario: string; puesto: string; email: string } {
  const missingName = options?.missingDisplayName ?? "Usuario desconocido";
  const missingPuesto = options?.missingPuesto ?? "Usuario desconocido";

  const needsName =
    !resolved.usuario ||
    resolved.usuario === missingName ||
    PLACEHOLDER_NAMES.has(resolved.usuario);
  const needsPuesto =
    !resolved.puesto ||
    resolved.puesto === missingPuesto ||
    PLACEHOLDER_NAMES.has(resolved.puesto);

  const uid = normalizeUserId(resolved.usuario_id);
  if (!uid || (!needsName && !needsPuesto)) {
    return resolved;
  }

  const entry = usersById.get(uid);
  if (!entry) return resolved;

  return {
    ...resolved,
    usuario: needsName ? entry.username : resolved.usuario,
    puesto: needsPuesto ? entry.puesto || resolved.puesto : resolved.puesto,
    email: resolved.email || entry.email || "",
  };
}

export function resolveAndEnrichReportUsuario(
  report: Record<string, unknown>,
  options?: ResolveReportUsuarioDisplayOptions & { usersById?: Map<string, UserLookupEntry> }
): {
  resolved: { usuario_id: string; usuario: string; puesto: string; email: string };
  datosJsonb: Record<string, unknown>;
} {
  const datosJsonb = parseReportDatosJsonb(report);
  let resolved = resolveReportUsuarioDisplay(report, datosJsonb, options);
  if (options?.usersById?.size) {
    resolved = enrichResolvedUsuarioWithUsersMap(resolved, options.usersById, options);
  }
  return { resolved, datosJsonb };
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

/** Extrae ids de usuario de un lote de reportes para enriquecer el mapa. */
export function collectReportUserIds(reportes: Record<string, unknown>[]): string[] {
  const ids: string[] = [];
  for (const report of reportes) {
    const datos = parseReportDatosJsonb(report);
    const datosUser = (datos.user || {}) as Record<string, unknown>;
    const id =
      report.usuario_id ||
      report.user_id ||
      report.creador_id ||
      report.creado_por ||
      datosUser.id;
    const normalized = normalizeUserId(id);
    if (normalized) ids.push(normalized);
  }
  return ids;
}
