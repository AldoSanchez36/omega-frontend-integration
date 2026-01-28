import React from "react";

interface Report {
  id: string;
  usuario_id: string;
  planta_id: string;
  proceso_id: string;
  datos: any;
  observaciones?: string;
  created_at?: string;
  title?: string;
  plantName?: string;
  systemName?: string;
  status?: string;
  usuario?: string;
  puesto?: string;
}

interface RecentReportsTableProps {
  reports: Report[];
  dataLoading: boolean;
  getStatusColor: (status: string) => string;
  onTableClick: () => void;
  onDebugLog: (msg: string) => void;
  onViewReport: (report: Report) => void;
}

const RecentReportsTable: React.FC<RecentReportsTableProps> = ({
  reports,
  dataLoading,
  getStatusColor,
  onTableClick,
  onDebugLog,
  onViewReport,
}) => {
  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="card-title mb-0">📊 Reportes Recientes</h5>
            <button
              className="btn btn-outline-primary w-35"
              onClick={onTableClick}
            >
              <i className="material-icons me-2">table_view</i>
              Tabla de Reportes
            </button>
          </div>
          <div className="card-body">
            {dataLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando reportes...</span>
                </div>
              </div>
            ) : reports.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Título</th>
                      <th>Planta</th>
                      <th>Estado</th>
                      <th>Usuario</th>
                      <th>Fecha</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((report) => (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.title || `Reporte ${report.id}`}</strong>
                        </td>
                        <td>
                          <span className="badge bg-primary">{report.plantName || report.planta_id}</span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusColor(report.status || "completed")}`}>
                            {report.status === "completed" ? "✅ Completado" : report.status || "Completado"}
                          </span>
                        </td>
                        <td>
                          <div>
                            <strong>{report.usuario || "Usuario"}</strong>
                            {report.puesto && (
                              <>
                                <br />
                                <small className="text-muted">{report.puesto}</small>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          {(() => {
                            // Función helper para parsear fecha sin problemas de zona horaria
                            const parseDateWithoutTimezone = (dateString: string): Date | null => {
                              if (!dateString) return null;
                              
                              // Si la fecha está en formato YYYY-MM-DD, parsearla manualmente
                              const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
                              if (dateMatch) {
                                const [, year, month, day] = dateMatch;
                                // Crear fecha en zona horaria local para evitar problemas de UTC
                                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              }
                              
                              // Si tiene formato ISO con hora, usar new Date normalmente
                              return new Date(dateString);
                            };
                            
                            // Función helper para formatear fecha
                            const formatDate = (date: Date | null): string => {
                              if (!date || isNaN(date.getTime())) return "";
                              
                              return date.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });
                            };
                            
                            // Priorizar la fecha registrada en el reporte (fecha de los datos)
                            const fechaReporte = report.datos?.fecha || 
                                                 (report.datos && typeof report.datos === 'object' && 'fecha' in report.datos ? report.datos.fecha : null);
                            
                            if (fechaReporte) {
                              try {
                                // Log para debugging (solo en desarrollo)
                                if (process.env.NODE_ENV === 'development') {
                                  console.log(`📅 [RecentReportsTable] Fecha del reporte ${report.id}:`, {
                                    fechaOriginal: fechaReporte,
                                    tipo: typeof fechaReporte,
                                    datosCompletos: report.datos
                                  });
                                }
                                
                                const parsedDate = parseDateWithoutTimezone(fechaReporte);
                                if (parsedDate) {
                                  const formatted = formatDate(parsedDate);
                                  
                                  if (process.env.NODE_ENV === 'development') {
                                    console.log(`✅ [RecentReportsTable] Fecha formateada:`, {
                                      fechaOriginal: fechaReporte,
                                      fechaParseada: parsedDate.toISOString(),
                                      fechaFormateada: formatted
                                    });
                                  }
                                  
                                  return formatted;
                                }
                              } catch (e) {
                                console.error("❌ Error formateando fecha del reporte:", e, fechaReporte);
                              }
                            }
                            
                            // Fallback a created_at si no hay fecha del reporte
                            if (report.created_at) {
                              const parsedDate = parseDateWithoutTimezone(report.created_at);
                              if (parsedDate) {
                                return formatDate(parsedDate);
                              }
                            }
                            
                            return "";
                          })()}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => onViewReport(report)}
                              title="Ver reporte"
                            >
                              <i className="material-icons" style={{ fontSize: "1rem" }}>
                                visibility
                              </i>
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              disabled
                              title="Bloqueado"
                              style={{ cursor: "not-allowed", opacity: 0.6 }}
                            >
                              <i className="material-icons" style={{ fontSize: "1rem" }}>
                                lock
                              </i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4">
                <i className="material-icons text-muted" style={{ fontSize: "4rem" }}>
                  description
                </i>
                <p className="text-muted mt-2">No hay reportes disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecentReportsTable;