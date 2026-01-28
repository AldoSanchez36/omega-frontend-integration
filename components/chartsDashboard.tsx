import React, { useState } from "react";
import { SensorTimeSeriesChart } from "./SensorTimeSeriesChart";
import { API_BASE_URL } from "@/config/constants";

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

export function getDatePosition(dateStr: string, minDate: number, maxDate: number) {
  const date = new Date(dateStr).getTime();
  const range = maxDate - minDate || 1;
  return ((date - minDate) / range) * 100;
}

const ChartsDashboard: React.FC<ChartsDashboardProps> = ({
  plants,
  historicalData,
  getStatusColor,
  startDate,
  endDate,
  loading = false,
}) => {
  const [activePlant, setActivePlant] = useState<string | null>(null);
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');

  const selectedPlant = plants.find(p => p.id === activePlant);
  const selectedSystem = selectedPlant?.systems?.find(s => s.id === activeSystem);

  // Auto-select first plant and first system when plants are loaded
  React.useEffect(() => {
    if (plants.length > 0 && !activePlant) {
      const firstPlant = plants[0];
      setActivePlant(firstPlant.id);
      
      // Auto-select first system if available
      if (firstPlant.systems && firstPlant.systems.length > 0) {
        setActiveSystem(firstPlant.systems[0].id);
      }
    }
  }, [plants, activePlant]);

  // Auto-select first system when plant changes
  React.useEffect(() => {
    if (selectedPlant && selectedPlant.systems && selectedPlant.systems.length > 0) {
      if (!activeSystem || !selectedPlant.systems.find(s => s.id === activeSystem)) {
        setActiveSystem(selectedPlant.systems[0].id);
      }
    } else {
      setActiveSystem(null);
    }
  }, [selectedPlant, activeSystem]);

  // Debug logging
  // console.log("ChartsDashboard - Plants:", plants.length);
  // console.log("ChartsDashboard - Historical Data Keys:", Object.keys(historicalData));
  // console.log("ChartsDashboard - Selected Plant:", selectedPlant?.nombre);
  // console.log("ChartsDashboard - Selected System:", selectedSystem?.name);

  return (
    <div className="row mb-4">
      <div className="col-12">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              <i className="material-icons me-2">analytics</i>
              Gráficos Históricos de Sistemas
            </h5>
            <div className="btn-group" role="group">
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'charts' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('charts')}
                disabled={loading}
              >
                <i className="material-icons me-1">show_chart</i>
                Gráficos
              </button>
              <button
                type="button"
                className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('table')}
                disabled={loading}
              >
                <i className="material-icons me-1">table_view</i>
                Tabla
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            {/* Loading State - Show when loading and no plants */}
            {loading && plants.length === 0 ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3 text-muted">Cargando plantas y sistemas...</p>
              </div>
            ) : (
              <>
                {/* Plant Tabs */}
                <div className="border-bottom">
                  <div className="nav nav-tabs nav-fill" role="tablist">
                    {plants.slice(0, 4).map((plant) => (
                      <button
                        key={plant.id}
                        className={`nav-link ${activePlant === plant.id ? 'active' : ''}`}
                        onClick={() => {
                          setActivePlant(plant.id);
                          setActiveSystem(null);
                        }}
                        disabled={loading}
                      >
                        <i className="material-icons me-1">factory</i>
                        {plant.nombre}
                        <span className={`badge ms-2 ${getStatusColor(plant.status || "active")}`}>
                          {plant.systems?.length || 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedPlant && (
              <div className="p-3">
                {/* Debug Info */}
                <div className="alert alert-info mb-3">
                  <small>
                    <strong>Debug Info:</strong> Planta: {selectedPlant.nombre} | 
                    Sistemas: {selectedPlant.systems?.length || 0} | 
                    Datos históricos: {Object.keys(historicalData).length} parámetros
                  </small>
                </div>
                
                {/* Loading Indicator */}
                {loading && (
                  <div className="text-center py-5 mb-4">
                    <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                      <span className="visually-hidden">Cargando datos...</span>
                    </div>
                    <p className="mt-3 text-muted">Cargando datos históricos...</p>
                  </div>
                )}
                
                {/* System Selection */}
                {selectedPlant.systems && selectedPlant.systems.length > 0 ? (
                  <div className="row">
                    <div className="col-md-3">
                      <div className="list-group">
                        <div className="list-group-item bg-light">
                          <h6 className="mb-0">Sistemas Disponibles</h6>
                        </div>
                        {selectedPlant.systems.map((system) => (
                          <button
                            key={system.id}
                            className={`list-group-item list-group-item-action ${
                              activeSystem === system.id ? 'active' : ''
                            }`}
                            onClick={() => setActiveSystem(system.id)}
                            disabled={loading}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <h6 className="mb-1">{system.name}</h6>
                                <small className="text-muted">{system.parameters.length} parámetros</small>
                              </div>
                              <span className={`badge ${getStatusColor(system.status)}`}>
                                {system.status}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* System Details */}
                    <div className="col-md-9">
                      {selectedSystem ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="mb-0">{selectedSystem.name}</h5>
                            <div className="d-flex gap-2">
                              <span className={`badge ${getStatusColor(selectedSystem.status)}`}>
                                {selectedSystem.status}
                              </span>
                              <span className="badge bg-info">{selectedSystem.type}</span>
                            </div>
                          </div>

                          {/* View Mode Toggle Content */}
                          {viewMode === 'charts' ? (
                            /* Charts View */
                            <div className="row g-3">
                              {selectedSystem.parameters.map((param) => {
                              const data = historicalData[param.id] || [];
                              
                              // Si no hay datos históricos, mostrar datos mock o placeholder
                              if (!data.length) {
                                return (
                                  <div key={param.id} className="col-md-6 col-lg-4">
                                    <div className="card h-100">
                                      <div className="card-header py-2">
                                        <div className="d-flex justify-content-between align-items-center">
                                          <h6 className="mb-0 text-primary">{param.name}</h6>
                                          <small className="text-muted">{param.unit}</small>
                                        </div>
                                      </div>
                                      <div className="card-body py-2">
                                        <div className="mb-3" style={{ height: "80px" }}>
                                          <div className="d-flex align-items-center justify-content-center h-100 bg-light rounded border">
                                            <div className="text-center">
                                              <i className="material-icons text-muted mb-2" style={{ fontSize: "2rem" }}>show_chart</i>
                                              <div className="text-muted fw-bold">Sin datos históricos</div>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="row g-2 text-center">
                                          <div className="col-12">
                                            <div className="p-3 rounded shadow-sm" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7' }}>
                                              <div className="d-flex align-items-center justify-content-center">
                                                <i className="material-icons text-warning me-2" style={{ fontSize: '1.2rem' }}>warning</i>
                                                <span className="text-dark fw-bold">No hay datos disponibles</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              const maxValue = Math.max(...data.map((d) => d.value));
                              const minValue = Math.min(...data.map((d) => d.value));
                              const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
                              
                              // Asegurar un rango mínimo para visualización cuando todos los valores son iguales
                              const valueRange = maxValue - minValue || Math.abs(maxValue) * 0.1 || 1;
                              const adjustedMin = minValue - valueRange * 0.1;
                              const adjustedMax = maxValue + valueRange * 0.1;
                              const adjustedRange = adjustedMax - adjustedMin;
                              
                              // Dimensiones mejoradas con mejor proporción
                              const padding = { top: 12, right: 12, bottom: 12, left: 12 };
                              const chartHeight = 160; // Reducido para mejor proporción
                              const chartWidth = 100; // Ancho del viewBox
                              const plotWidth = chartWidth - padding.left - padding.right;
                              const plotHeight = chartHeight - padding.top - padding.bottom;

                              // Calcular puntos del gráfico usando coordenadas del viewBox
                              const chartPoints = data.map((d, i) => {
                                const x = padding.left + ((i / Math.max(data.length - 1, 1)) * plotWidth);
                                const y = padding.top + ((adjustedMax - d.value) / adjustedRange) * plotHeight;
                                return { x, y, value: d.value, timestamp: d.timestamp };
                              });

                              // Crear path para el área bajo la curva
                              const areaPath = chartPoints.length > 0
                                ? `M ${chartPoints[0].x} ${chartHeight - padding.bottom} L ${chartPoints.map(p => `${p.x},${p.y}`).join(' L ')} L ${chartPoints[chartPoints.length - 1].x} ${chartHeight - padding.bottom} Z`
                                : '';

                              // Crear path para la línea
                              const linePath = chartPoints.length > 0
                                ? `M ${chartPoints.map(p => `${p.x},${p.y}`).join(' L ')}`
                                : '';

                              return (
                                <div key={param.id} className="col-md-6 col-lg-4">
                                  <div className="card h-100">
                                    <div className="card-header py-2">
                                      <div className="d-flex justify-content-between align-items-center">
                                        <h6 className="mb-0 text-primary">{param.name}</h6>
                                        <small className="text-muted">{param.unit}</small>
                                      </div>
                                    </div>
                                    <div className="card-body py-2">
                                      {/* Enhanced Interactive Chart */}
                                      <div className="mb-2 position-relative" style={{ height: `${chartHeight}px`, minHeight: `${chartHeight}px`, width: '100%' }}>
                                        <svg 
                                          width="100%" 
                                          height="100%" 
                                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                                          preserveAspectRatio="xMidYMid meet"
                                          className="border rounded bg-light"
                                          style={{ display: 'block', width: '100%', height: '100%' }}
                                        >
                                          <defs>
                                            <linearGradient id={`gradient-${param.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                              <stop offset="0%" stopColor="#007bff" stopOpacity="0.25"/>
                                              <stop offset="50%" stopColor="#007bff" stopOpacity="0.1"/>
                                              <stop offset="100%" stopColor="#007bff" stopOpacity="0.05"/>
                                            </linearGradient>
                                          </defs>
                                          
                                          {/* Grid lines horizontales más sutiles */}
                                          {[0, 25, 50, 75, 100].map((percent) => {
                                            const y = padding.top + (percent / 100) * plotHeight;
                                            return (
                                              <line
                                                key={`grid-h-${percent}`}
                                                x1={padding.left}
                                                y1={y}
                                                x2={chartWidth - padding.right}
                                                y2={y}
                                                stroke="#f0f0f0"
                                                strokeWidth="0.5"
                                                strokeDasharray="3,3"
                                              />
                                            );
                                          })}
                                          
                                          {/* Area under curve */}
                                          {areaPath && (
                                            <path
                                              d={areaPath}
                                              fill={`url(#gradient-${param.id})`}
                                            />
                                          )}
                                          
                                          {/* Main line más suave */}
                                          {linePath && (
                                            <path
                                              d={linePath}
                                              fill="none"
                                              stroke="#007bff"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          )}
                                          
                                          {/* Data points más visibles */}
                                          {chartPoints.map((point, i) => (
                                            <circle
                                              key={i}
                                              cx={point.x}
                                              cy={point.y}
                                              r="3"
                                              fill="#007bff"
                                              stroke="white"
                                              strokeWidth="1.5"
                                              className="data-point"
                                              style={{ cursor: 'pointer' }}
                                            />
                                          ))}
                                        </svg>
                                      </div>
                                      
                                      {/* Enhanced Stats with Better Contrast - Reduced Size */}
                                      <div className="row g-1 text-center mt-2">
                                        <div className="col-4">
                                          <div className="p-1 rounded shadow-sm" style={{ backgroundColor: '#d4edda', border: '1px solid #c3e6cb' }}>
                                            <div className="fw-bold text-dark" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>{maxValue.toFixed(1)}</div>
                                            <div className="text-muted" style={{ fontSize: '0.55rem', lineHeight: '1' }}>Alto</div>
                                          </div>
                                        </div>
                                        <div className="col-4">
                                          <div className="p-1 rounded shadow-sm" style={{ backgroundColor: '#cce5ff', border: '1px solid #b3d9ff' }}>
                                            <div className="fw-bold text-dark" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>{avgValue.toFixed(1)}</div>
                                            <div className="text-muted" style={{ fontSize: '0.55rem', lineHeight: '1' }}>Prom</div>
                                          </div>
                                        </div>
                                        <div className="col-4">
                                          <div className="p-1 rounded shadow-sm" style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb' }}>
                                            <div className="fw-bold text-dark" style={{ fontSize: '0.7rem', lineHeight: '1.2' }}>{minValue.toFixed(1)}</div>
                                            <div className="text-muted" style={{ fontSize: '0.55rem', lineHeight: '1' }}>Bajo</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          ) : (
                            /* Table View */
                            <div className="table-responsive">
                              <table className="table table-striped table-hover">
                                <thead className="table-dark">
                                  <tr>
                                    <th>Parámetro</th>
                                    <th>Unidad</th>
                                    <th>Alto</th>
                                    <th>Promedio</th>
                                    <th>Bajo</th>
                                    <th>Puntos de Datos</th>
                                    <th>Último Valor</th>
                                    <th>Fecha Último</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedSystem.parameters.map((param) => {
                                    const data = historicalData[param.id] || [];
                                    const maxValue = data.length ? Math.max(...data.map((d) => d.value)) : 0;
                                    const minValue = data.length ? Math.min(...data.map((d) => d.value)) : 0;
                                    const avgValue = data.length ? data.reduce((sum, d) => sum + d.value, 0) / data.length : 0;
                                    const lastData = data[data.length - 1];
                                    
                                    return (
                                      <tr key={param.id}>
                                        <td>
                                          <strong className="text-primary">{param.name}</strong>
                                        </td>
                                        <td>
                                          <span className="badge bg-secondary">{param.unit}</span>
                                        </td>
                                        <td>
                                          <span className="badge bg-success">{maxValue.toFixed(2)}</span>
                                        </td>
                                        <td>
                                          <span className="badge bg-primary">{avgValue.toFixed(2)}</span>
                                        </td>
                                        <td>
                                          <span className="badge bg-danger">{minValue.toFixed(2)}</span>
                                        </td>
                                        <td>
                                          <span className="badge bg-info">{data.length}</span>
                                        </td>
                                        <td>
                                          <strong>{lastData ? lastData.value.toFixed(2) : 'N/A'}</strong>
                                        </td>
                                        <td>
                                          <small className="text-muted">
                                            {lastData ? new Date(lastData.timestamp).toLocaleDateString() : 'N/A'}
                                          </small>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              
                              {/* Summary Statistics */}
                              <div className="row mt-4">
                                <div className="col-md-6">
                                  <div className="card bg-light">
                                    <div className="card-body">
                                      <h6 className="card-title">Resumen del Sistema</h6>
                                      <p className="mb-1"><strong>Total de Parámetros:</strong> {selectedSystem.parameters.length}</p>
                                      <p className="mb-1"><strong>Parámetros con Datos:</strong> {selectedSystem.parameters.filter(p => historicalData[p.id]?.length > 0).length}</p>
                                      <p className="mb-0"><strong>Rango de Fechas:</strong> {startDate} - {endDate}</p>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="card bg-light">
                                    <div className="card-body">
                                      <h6 className="card-title">Estadísticas Generales</h6>
                                      <p className="mb-1"><strong>Total de Puntos:</strong> {selectedSystem.parameters.reduce((sum, p) => sum + (historicalData[p.id]?.length || 0), 0)}</p>
                                      <p className="mb-1"><strong>Promedio por Parámetro:</strong> {(selectedSystem.parameters.reduce((sum, p) => sum + (historicalData[p.id]?.length || 0), 0) / selectedSystem.parameters.length).toFixed(1)}</p>
                                      <p className="mb-0"><strong>Estado:</strong> <span className="badge bg-success">Activo</span></p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          <i className="material-icons text-muted" style={{ fontSize: "3rem" }}>
                            touch_app
                          </i>
                          <p className="text-muted mt-2">Selecciona un sistema para ver sus parámetros</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="material-icons text-muted" style={{ fontSize: "3rem" }}>
                      settings
                    </i>
                    <p className="text-muted mt-2">No hay sistemas configurados para esta planta</p>
                  </div>
                )}
              </div>
            )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartsDashboard; 