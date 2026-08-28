import React from "react";
import {
  getReportStatusBadgeClass,
  getReportStatusLabel,
  resolveReportPublicationStatus,
  type ReportStatusCode,
} from "@/lib/report-status";

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
  status?: ReportStatusCode;
  fecha?: string;
  usuario?: string;
  puesto?: string;
  estatus?: ReportStatusCode;
}

interface RecentReportsTableProps {
  reports: Report[];
  dataLoading: boolean;
  getStatusColor?: (status: string) => string;
  onTableClick: () => void;
  onDebugLog: (msg: string) => void;
  onViewReport: (report: Report) => void;
  userRole?: "admin" | "user" | "client" | "guest" | "analista";
}

const RecentReportsTable: React.FC<RecentReportsTableProps> = ({
  reports,
  dataLoading,
  onTableClick,
  onViewReport,
  userRole,
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
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Cargando reportes...</span>
                </div>
                <p className="mt-3 text-muted">Cargando reportes recientes...</p>
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
                    {reports.map((report) => {
                      const status = resolveReportPublicationStatus({
                        id: report.id,
                        planta_id: report.planta_id,
                        fecha: report.fecha || report.datos?.fecha,
                        estatus: report.estatus ?? report.status,
                        status: report.status,
                        datos: report.datos,
                      })
                      return (
                      <tr key={report.id}>
                        <td>
                          <strong>{report.title || `Reporte ${report.id}`}</strong>
                        </td>
                        <td>
                          <span className="badge bg-primary">{report.plantName || report.planta_id}</span>
                        </td>
                        <td>
                          <span className={`badge ${getReportStatusBadgeClass(status)}`}>
                            {getReportStatusLabel(status)}
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
                            const parseDateWithoutTimezone = (dateString: string): Date | null => {
                              if (!dateString) return null;
                              const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
                              if (dateMatch) {
                                const [, year, month, day] = dateMatch;
                                return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              }
                              return new Date(dateString);
                            };

                            const formatDate = (date: Date | null): string => {
                              if (!date || isNaN(date.getTime())) return "";
                              return date.toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });
                            };

                            const fechaReporte = report.datos?.fecha ||
                              (report.datos && typeof report.datos === 'object' && 'fecha' in report.datos ? report.datos.fecha : null);

                            if (fechaReporte) {
                              try {
                                const parsedDate = parseDateWithoutTimezone(fechaReporte);
                                if (parsedDate) return formatDate(parsedDate);
                              } catch (e) {
                                console.error("❌ Error formateando fecha del reporte:", e, fechaReporte);
                              }
                            }

                            if (report.created_at) {
                              const parsedDate = parseDateWithoutTimezone(report.created_at);
                              if (parsedDate) return formatDate(parsedDate);
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
                          </div>
                        </td>
                      </tr>
                      )
                    })}
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
