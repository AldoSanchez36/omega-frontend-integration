import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants";
import { parseReportDatosJsonb } from "@/lib/report-usuario-display";

export interface ReportSelectionPayload {
  fecha: string;
  comentarios: string;
  user: {
    id?: string;
    username?: string;
    email?: string;
    puesto?: string;
    cliente_id?: string | null;
    empresa_id?: string | null;
  };
  plant: {
    id?: string;
    nombre?: string;
    systemName?: string;
    dirigido_a?: string;
    mensaje_cliente?: string;
    empresa_id?: string | null;
  };
  systemName?: string;
  generatedDate?: string;
  empresa_id?: string | null;
  report_id?: string | null;
  parameters: Record<string, Record<string, unknown>>;
  variablesTolerancia: Record<string, unknown>;
  parameterComments?: Record<string, string>;
  mediciones?: unknown[];
  parameterOrder?: string[];
  systemOrder?: string[];
}

export function reportSelectionNeedsFullLoad(
  selection: ReportSelectionPayload | null | undefined
): boolean {
  if (!selection) return false;
  const params = selection.parameters;
  return !params || Object.keys(params).length === 0;
}

export async function fetchReportDatosById(
  reportId: string,
  token: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORT_BY_ID(reportId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = await res.json();
  const reporte = data.reporte as Record<string, unknown> | undefined;
  if (!reporte) return null;

  const raw = reporte.reportSelection ?? reporte.datos;
  if (!raw) return null;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

export function buildReportSelectionFromDatos(
  datos: Record<string, unknown>,
  options?: {
    reportId?: string;
    usuario_id?: string;
    planta_id?: string;
    empresa_id?: string | null;
    plantName?: string;
    systemName?: string;
    observaciones?: string;
    created_at?: string;
    parameterOrder?: string[];
    systemOrder?: string[];
  }
): ReportSelectionPayload {
  const d = datos as {
    user?: ReportSelectionPayload["user"];
    plant?: ReportSelectionPayload["plant"];
    parameters?: ReportSelectionPayload["parameters"];
    variablesTolerancia?: ReportSelectionPayload["variablesTolerancia"];
    parameterComments?: Record<string, string>;
    fecha?: string;
    comentarios?: string;
    systemName?: string;
    generatedDate?: string;
    empresa_id?: string | null;
  };

  const plant = d.plant || {};
  const user = d.user || {};

  return {
    user: {
      id: options?.usuario_id || user.id,
      username: user.username,
      email: user.email,
      puesto: user.puesto,
      cliente_id: user.cliente_id ?? null,
      empresa_id: options?.empresa_id ?? user.empresa_id ?? plant.empresa_id ?? null,
    },
    plant: {
      id: options?.planta_id || plant.id,
      nombre: plant.nombre || options?.plantName,
      systemName: plant.systemName || d.systemName || options?.systemName,
      dirigido_a: plant.dirigido_a,
      mensaje_cliente: plant.mensaje_cliente,
      empresa_id: plant.empresa_id ?? options?.empresa_id ?? null,
    },
    systemName: d.systemName || plant.systemName || options?.systemName || "",
    parameters: (d.parameters || {}) as ReportSelectionPayload["parameters"],
    variablesTolerancia: (d.variablesTolerancia || {}) as ReportSelectionPayload["variablesTolerancia"],
    parameterComments: d.parameterComments,
    mediciones: [],
    fecha:
      d.fecha ||
      options?.created_at?.split("T")[0] ||
      new Date().toISOString().split("T")[0],
    comentarios: d.comentarios || options?.observaciones || "",
    generatedDate: d.generatedDate || options?.created_at || new Date().toISOString(),
    cliente_id: user.cliente_id ?? null,
    empresa_id: options?.empresa_id ?? d.empresa_id ?? plant.empresa_id ?? null,
    report_id: options?.reportId || null,
    ...(options?.parameterOrder?.length ? { parameterOrder: options.parameterOrder } : {}),
    ...(options?.systemOrder?.length ? { systemOrder: options.systemOrder } : {}),
  };
}

/** Carga JSONB completo por id y fusiona con metadatos del listado (summary). */
export async function loadFullReportSelection(
  reportMeta: Record<string, unknown>,
  token: string,
  orders?: { parameterOrder?: string[]; systemOrder?: string[] }
): Promise<ReportSelectionPayload | null> {
  const reportId = String(reportMeta.id ?? reportMeta.report_id ?? "");
  if (!reportId) return null;

  const datos = await fetchReportDatosById(reportId, token);
  if (!datos) return null;

  const parsed = parseReportDatosJsonb({ ...reportMeta, datos });
  return buildReportSelectionFromDatos(parsed, {
    reportId,
    usuario_id: String(
      reportMeta.usuario_id ?? (parsed.user as { id?: string })?.id ?? ""
    ),
    planta_id: String(
      reportMeta.planta_id ?? (parsed.plant as { id?: string })?.id ?? ""
    ),
    empresa_id: (reportMeta.empresa_id as string | null) ?? null,
    plantName: (reportMeta.plantName || reportMeta.planta) as string | undefined,
    systemName: (reportMeta.systemName || reportMeta.sistema) as string | undefined,
    observaciones: (reportMeta.observaciones || reportMeta.comentarios) as string | undefined,
    created_at: (reportMeta.created_at || reportMeta.fechaGeneracion) as string | undefined,
    parameterOrder: orders?.parameterOrder,
    systemOrder: orders?.systemOrder,
  });
}

/** Si el listado era summary, completa parameters desde GET /api/reportes/:id. */
export async function hydrateReportSelectionFromApi(
  partial: ReportSelectionPayload,
  token: string
): Promise<ReportSelectionPayload | null> {
  if (!reportSelectionNeedsFullLoad(partial)) return partial;

  const reportId = partial.report_id;
  if (!reportId) return partial;

  const full = await loadFullReportSelection(
    {
      id: reportId,
      planta_id: partial.plant?.id,
      plantName: partial.plant?.nombre,
      systemName: partial.systemName,
      usuario_id: partial.user?.id,
      observaciones: partial.comentarios,
      created_at: partial.generatedDate,
      empresa_id: partial.empresa_id,
    },
    token,
    {
      parameterOrder: partial.parameterOrder,
      systemOrder: partial.systemOrder,
    }
  );

  return full ?? partial;
}
