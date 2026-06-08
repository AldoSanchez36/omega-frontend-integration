import {
  enrichResolvedUsuarioWithUsersMap,
  mergeDatosJsonbWithUsuario,
  parseReportDatosJsonb,
  resolveReportUsuarioDisplay,
  type UserLookupEntry,
} from "@/lib/report-usuario-display";

const reportUsuarioPlaceholder = { missingDisplayName: "Default", missingPuesto: "Default" } as const;

/** Mapea fila del API (summary o full) al formato usado en tablas del dashboard. */
export function formatDashboardReportRow(
  report: Record<string, unknown>,
  usersById?: Map<string, UserLookupEntry>
) {
  const hasDatos = report.datos != null || report.reportSelection != null;
  const datosParsed = hasDatos
    ? parseReportDatosJsonb(report as Record<string, unknown>)
    : {
        fecha: report.fecha,
        plant: {
          id: report.planta_id,
          nombre: report.plantName || report.planta,
        },
        systemName: report.systemName || report.sistema,
        comentarios: report.comentarios,
      };

  let resolved = resolveReportUsuarioDisplay(report as Record<string, unknown>, datosParsed as Record<string, unknown>, reportUsuarioPlaceholder);
  if (usersById?.size) {
    resolved = enrichResolvedUsuarioWithUsersMap(resolved, usersById, reportUsuarioPlaceholder);
  }

  const datosMerged = hasDatos
    ? mergeDatosJsonbWithUsuario(datosParsed as Record<string, unknown>, resolved)
    : (datosParsed as Record<string, unknown>);

  const plantFromDatos = (datosMerged.plant || {}) as { nombre?: string; id?: string };

  const fechaReporte =
    (datosMerged.fecha as string | undefined) ||
    (report.fecha as string | undefined) ||
    (report.created_at as string | undefined);

  return {
    id: String(report.id ?? ""),
    fecha: fechaReporte,
    title: (report.titulo || report.nombre || `Reporte ${report.id}`) as string,
    plantName: (plantFromDatos.nombre || report.plantName || report.planta || "Planta no especificada") as string,
    systemName: (datosMerged.systemName || report.systemName || report.sistema || "Sistema no especificado") as string,
    status: (report.estado || report.status || "completed") as string,
    created_at: (datosMerged.generatedDate ||
      report.fechaGeneracion ||
      report.generada_en ||
      report.fecha_creacion ||
      report.created_at ||
      new Date().toISOString()) as string,
    usuario_id: resolved.usuario_id,
    planta_id: (report.planta_id || plantFromDatos.id || "planta-unknown") as string,
    proceso_id: (report.proceso_id || "sistema-unknown") as string,
    estatus: typeof report.estatus === "boolean" ? report.estatus : false,
    datos: datosMerged,
    observaciones: (datosMerged.comentarios || report.comentarios || report.observaciones || "") as string,
    usuario: resolved.usuario,
    puesto: resolved.puesto,
  };
}
