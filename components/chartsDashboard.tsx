import React from "react";

interface HistoricalDataPoint {
  timestamp: string;
  value: number;
}

interface Parameter {
  id: string;
  name: string;
  unit: string;
  value: number;
  minValue: number;
  maxValue: number;
  systemId: string;
}

interface System {
  id: string;
  name: string;
  type: string;
  description: string;
  plantId: string;
  parameters: Parameter[];
  status: string;
}

interface Plant {
  id: string;
  nombre: string;
  creado_por: string;
  created_at?: string;
  location?: string;
  description?: string;
  status?: string;
  systems?: System[];
}

interface ChartsDashboardProps {
  plants: Plant[];
  historicalData: Record<string, HistoricalDataPoint[]>;
  getStatusColor: (status: string) => string;
  startDate: string;
  endDate: string;
}

const ChartsDashboard: React.FC<ChartsDashboardProps> = ({
  plants,
  historicalData,
  getStatusColor,
  startDate,
  endDate,
}) => {
  return (
    <div className="row mb-4">
      
      {plants.slice(0, 4).map((plant) => (
        <div key={plant.id} className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h6 className="card-title mb-0">
                <i className="material-icons me-2">factory</i>
                {plant.nombre}
              </h6>
              <span className={`badge ${getStatusColor(plant.status || "active")}`}>
                {plant.status || "active"}
              </span>
            </div>
            <div className="card-body">
              {plant.systems && plant.systems.length > 0 ? (
                <div className="space-y-3">
                  {plant.systems.slice(0, 2).map((system) => (
                    <div key={system.id} className="border rounded p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="mb-0">{system.name}</h6>
                        <span className={`badge ${getStatusColor(system.status)}`}>
                          {system.status}
                        </span>
                      </div>
                      {/* Historical Data Chart */}
                      <div className="mb-3">
                        <h6 className="text-muted mb-2">
                          Datos Históricos ({startDate} – {endDate})
                        </h6>
                        <div className="bg-light rounded p-3">
                          {/* Historical values for each parameter */}
                          {system.parameters.map((param) => {
                            const data = historicalData[param.id] || [];
                            if (!data.length) return null;
                            const maxValue = Math.max(...data.map((d) => d.value));
                            const minValue = Math.min(...data.map((d) => d.value));
                            return (
                              <div key={param.id} className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                  <small className="fw-bold">{param.name}</small>
                                  <small className="text-muted">
                                    Actual: {param.value} {param.unit}
                                  </small>
                                </div>
                                {/* Chart container with proper spacing */}
                                <div className="position-relative" style={{ height: "60px", marginBottom: "10px" }}>
                                  {/* Y-axis labels with better positioning */}
                                  <div className="position-absolute" style={{ left: "-35px", top: "0", height: "100%", width: "30px" }}>
                                    <div className="d-flex flex-column justify-content-between h-100">
                                      <small className="text-muted text-end">{maxValue.toFixed(1)}</small>
                                      <small className="text-muted text-end">{minValue.toFixed(1)}</small>
                                    </div>
                                  </div>
                                  {/* Chart area */}
                                  <div className="position-relative" style={{ height: "100%", marginLeft: "5px" }}>
                                    <svg width="100%" height="60" className="position-absolute">
                                      <polyline
                                        fill="none"
                                        stroke="#007bff"
                                        strokeWidth="2"
                                        points={data.map((d) => {
                                          const parseDate = (dateStr: string) => new Date(dateStr).getTime();
                                          const minDate = Math.min(...data.map(d => parseDate(d.timestamp)));
                                          const maxDate = Math.max(...data.map(d => parseDate(d.timestamp)));
                                          const dateRange = maxDate - minDate || 1;
                                          const x = ((parseDate(d.timestamp) - minDate) / dateRange) * 100;
                                          const y = 60 - ((d.value - minValue) / (maxValue - minValue || 1)) * 50;
                                          return `${x},${y}`;
                                        }).join(" ")}
                                      />
                                      {/* Data points */}
                                      {data.map((d, i) => {
                                        const parseDate = (dateStr: string) => new Date(dateStr).getTime();
                                        const minDate = Math.min(...data.map(d => parseDate(d.timestamp)));
                                        const maxDate = Math.max(...data.map(d => parseDate(d.timestamp)));
                                        const dateRange = maxDate - minDate || 1;
                                        const x = ((parseDate(d.timestamp) - minDate) / dateRange) * 100;
                                        const y = 60 - ((d.value - minValue) / (maxValue - minValue || 1)) * 50;
                                        return (
                                          <circle
                                            key={i}
                                            cx={`${x}%`}
                                            cy={y}
                                            r="2"
                                            fill="#007bff"
                                          />
                                        );
                                      })}
                                    </svg>
                                  </div>
                                  {/* X-axis time labels */}
                                  <div className="d-flex justify-content-between mt-2" style={{ marginLeft: "5px" }}>
                                    <small className="text-muted">{data[0]?.timestamp?.slice(0, 10) || ""}</small>
                                    <small className="text-muted">{data[Math.floor(data.length / 4)]?.timestamp?.slice(5, 10) || ""}</small>
                                    <small className="text-muted">{data[Math.floor(data.length / 2)]?.timestamp?.slice(5, 10) || ""}</small>
                                    <small className="text-muted">{data[Math.floor((3 * data.length) / 4)]?.timestamp?.slice(5, 10) || ""}</small>
                                    <small className="text-muted">{data[data.length - 1]?.timestamp?.slice(5, 10) || ""}</small>
                                  </div>
                                </div>
                                {/* Statistics */}
                                <div className="row text-center mt-3">
                                  <div className="col-4">
                                    <small className="text-muted d-block">Máx</small>
                                    <small className="fw-bold text-success">{maxValue.toFixed(1)}</small>
                                  </div>
                                  <div className="col-4">
                                    <small className="text-muted d-block">Prom</small>
                                    <small className="fw-bold text-primary">
                                      {(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)}
                                    </small>
                                  </div>
                                  <div className="col-4">
                                    <small className="text-muted d-block">Mín</small>
                                    <small className="fw-bold text-danger">{minValue.toFixed(1)}</small>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* System info */}
                      <div className="mt-3 pt-3 border-top">
                        <div className="row text-center">
                          <div className="col-6">
                            <small className="text-muted d-block">Tipo</small>
                            <small className="fw-bold">{system.type}</small>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Parámetros</small>
                            <small className="fw-bold">{system.parameters.length}</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="material-icons text-muted" style={{ fontSize: "3rem" }}>
                    settings
                  </i>
                  <p className="text-muted mt-2">No hay sistemas configurados para esta planta</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChartsDashboard; 