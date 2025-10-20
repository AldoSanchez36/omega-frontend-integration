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
}

const RecentReportsTable: React.FC<RecentReportsTableProps> = ({
  reports,
  dataLoading,
  getStatusColor,
  onTableClick,
  onDebugLog,
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
                      <th>Sistema</th>
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
                          <span className="badge bg-info">{report.systemName || report.proceso_id}</span>
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
                        <td>{new Date(report.created_at || "").toLocaleDateString()}</td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button
                              className="btn btn-outline-primary"
                              onClick={() => onDebugLog(`Ver reporte ${report.id}`)}
                            >
                              <i className="material-icons" style={{ fontSize: "1rem" }}>
                                visibility
                              </i>
                            </button>
                            <button
                              className="btn btn-outline-secondary"
                              onClick={() => onDebugLog(`Descargar reporte ${report.id}`)}
                            >
                              <i className="material-icons" style={{ fontSize: "1rem" }}>
                                download
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