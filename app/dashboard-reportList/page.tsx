"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Eye, Download, Calendar, Filter, RefreshCw } from "lucide-react";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants";

interface Reporte {
  id: string;
  titulo: string;
  planta: string;
  sistema: string;
  usuario: string;
  fecha: string;
  estado: string;
  // Datos resumen
  totalParametros: number;
  totalTolerancias: number;
  comentarios: string;
  fechaGeneracion: string;
  usuario_id: string;
  // Datos JSONB reconstruidos
  datosJsonb?: {
    user?: {
      id: string;
      username: string;
      email?: string;
      puesto?: string;
    };
    plant?: {
      id: string;
      nombre: string;
    };
    systemName?: string;
    parameters?: {
      [systemName: string]: {
        [parameterName: string]: {
          valor: number;
          unidad: string;
        };
      };
    };
    variablesTolerancia?: {
      [parameterId: string]: {
        limite_min: number | null;
        limite_max: number | null;
        bien_min: number | null;
        bien_max: number | null;
        usar_limite_min: boolean;
        usar_limite_max: boolean;
      };
    };
    fecha?: string;
    comentarios?: string;
    generatedDate?: string;
  };
}

export default function ReportList() {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [plantaFiltro, setPlantaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "user" | "client">("client");
  const [user, setUser] = useState<any>(null);
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
  const [showJsonbModal, setShowJsonbModal] = useState(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setUserRole(userData.puesto || "user");
      }
    }
  }, []);

    const fetchReportes = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
      if (!token) {
        setError("No se encontró token de autenticación");
        return;
      }

      console.log("📊 ReportList - Cargando reportes desde:", `${API_BASE_URL}${API_ENDPOINTS.REPORTS_DASHBOARD}`);
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS_DASHBOARD}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log("📊 ReportList - Respuesta de API:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 ReportList - Datos recibidos:", data);

      if (data.ok && data.reportes) {
        const reportesFormateados = data.reportes.map((reporte: any) => {
          // Reconstruir datos desde JSONB con prioridad
          const datosJsonb = reporte.datos || {};
          
          // Extraer información resumen consistente
          const titulo = reporte.titulo || reporte.nombre || `Reporte ${reporte.id}`;
          const planta = datosJsonb.plant?.nombre || reporte.planta || "Sin planta";
          const sistema = datosJsonb.systemName || reporte.sistema || "Sin sistema";
          const usuario = datosJsonb.user?.username || reporte.usuario || "Usuario desconocido";
          const fecha = datosJsonb.fecha || reporte.fecha || new Date().toISOString().split('T')[0];
          const estado = reporte.estado || "Completado";
          
          // Contar parámetros y tolerancias
          const totalParametros = datosJsonb.parameters ? 
            Object.values(datosJsonb.parameters).reduce((acc: number, sistema: any) => 
              acc + Object.keys(sistema).length, 0) : 0;
          const totalTolerancias = datosJsonb.variablesTolerancia ? 
            Object.keys(datosJsonb.variablesTolerancia).length : 0;
          
          return {
            id: reporte.id,
            titulo,
            planta,
            sistema,
            usuario,
            fecha,
            estado,
            // Datos resumen
            totalParametros,
            totalTolerancias,
            comentarios: datosJsonb.comentarios || reporte.comentarios || "",
            fechaGeneracion: datosJsonb.generatedDate || reporte.fechaGeneracion || reporte.generada_en || new Date().toISOString(),
            usuario_id: datosJsonb.user?.id || reporte.usuario_id || "",
            // Incluir datos JSONB completos para análisis
            datosJsonb: datosJsonb
          };
        });

        console.log("📊 ReportList - Reportes formateados:", reportesFormateados.length);
        setReportes(reportesFormateados);
      } else {
        console.log("📊 ReportList - No hay reportes en la respuesta");
        setReportes([]);
      }
    } catch (err: any) {
      console.error("📊 ReportList - Error cargando reportes:", err);
      setError(`Error al cargar reportes: ${err.message}`);
      setReportes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
    fetchReportes();
    }
  }, [user]);

  // Obtener plantas únicas para el filtro
  const plantasUnicas = [...new Set(reportes.map(r => r.planta))].filter(Boolean);

  // Aplicar filtros
  const reportesFiltrados = reportes.filter(reporte => {
    const cumpleFecha = !fechaFiltro || reporte.fecha.startsWith(fechaFiltro);
    const cumplePlanta = !plantaFiltro || reporte.planta === plantaFiltro;
    return cumpleFecha && cumplePlanta;
  });

  const getStatusColor = (estado: string) => {
    switch (estado.toLowerCase()) {
      case "completado":
      case "completed":
        return "bg-gradient-to-r from-green-500 to-emerald-500";
      case "pendiente":
      case "pending":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "error":
      case "failed":
        return "bg-gradient-to-r from-red-500 to-rose-500";
      case "procesando":
      case "processing":
        return "bg-gradient-to-r from-blue-500 to-cyan-500";
      default:
        return "bg-gradient-to-r from-gray-500 to-slate-500";
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar role={userRole} />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
        <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Lista de Reportes
              </h1>
              <p className="text-gray-600">
                Gestiona y visualiza todos los reportes generados del sistema
              </p>
            </div>
            <button
              onClick={fetchReportes}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={fechaFiltro}
                onChange={(e) => setFechaFiltro(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Planta
              </label>
              <select
                value={plantaFiltro}
                onChange={(e) => setPlantaFiltro(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las plantas</option>
                {plantasUnicas.map(planta => (
                  <option key={planta} value={planta}>{planta}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFechaFiltro("");
                  setPlantaFiltro("");
                }}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Reportes</p>
                <p className="text-2xl font-bold text-gray-900">{reportes.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Filter className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Filtrados</p>
                <p className="text-2xl font-bold text-gray-900">{reportesFiltrados.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Plantas</p>
                <p className="text-2xl font-bold text-gray-900">{plantasUnicas.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Reportes */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Reporte
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Planta
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Sistema
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Resumen
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                        <span className="text-gray-600">Cargando reportes...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-red-600">
                        <p className="font-medium">Error al cargar reportes</p>
                        <p className="text-sm mt-1">{error}</p>
                        <button
                          onClick={fetchReportes}
                          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Reintentar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : reportesFiltrados.length > 0 ? (
                  reportesFiltrados.map((reporte) => (
                    <tr key={reporte.id} className="border-b hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{reporte.titulo}</div>
                        {/* Mostrar datos resumen */}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {reporte.totalParametros > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                              {reporte.totalParametros} parámetros
                            </span>
                          )}
                          {reporte.totalTolerancias > 0 && (
                            <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                              {reporte.totalTolerancias} tolerancias
                            </span>
                          )}
                          {reporte.comentarios && (
                            <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">
                              {reporte.comentarios.length > 30 ? `${reporte.comentarios.substring(0, 30)}...` : reporte.comentarios}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                          {reporte.planta}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                          {reporte.sistema}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`${getStatusColor(reporte.estado)} text-white text-xs px-2 py-1 rounded-full flex items-center`}>
                          {reporte.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {formatDate(reporte.fecha)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {reporte.usuario}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                            {reporte.totalParametros} param.
                          </span>
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
                            {reporte.totalTolerancias} tol.
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedReporte(reporte);
                            setShowJsonbModal(true);
                          }}
                          className="border border-gray-300 p-2 rounded hover:bg-gray-100"
                          title="Ver datos JSONB"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            console.log("Descargar reporte:", reporte.id);
                          }}
                          className="border border-gray-300 p-2 rounded hover:bg-gray-100"
                          title="Descargar reporte"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </td>
                </tr>
              ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No hay reportes disponibles</p>
                        <p className="text-sm mt-1">
                          {fechaFiltro || plantaFiltro 
                            ? "No se encontraron reportes con los filtros aplicados" 
                            : "No se han generado reportes aún"}
                        </p>
                        {(fechaFiltro || plantaFiltro) && (
                          <button
                            onClick={() => {
                              setFechaFiltro("");
                              setPlantaFiltro("");
                            }}
                            className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Limpiar Filtros
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>
        </div>
      </div>

      {/* Modal para mostrar datos JSONB */}
      {showJsonbModal && selectedReporte && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">
                  Datos JSONB - {selectedReporte.titulo}
                </h3>
                <button
                  onClick={() => setShowJsonbModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {selectedReporte.datosJsonb ? (
                <div className="space-y-6">
                  {/* Información del Usuario */}
                  {selectedReporte.datosJsonb.user && (
                    <div className="bg-blue-50 rounded-xl p-4">
                      <h4 className="font-medium text-blue-900 mb-3">Usuario</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600 font-medium">ID:</span> {selectedReporte.datosJsonb.user.id}
                        </div>
                        <div>
                          <span className="text-blue-600 font-medium">Username:</span> {selectedReporte.datosJsonb.user.username}
                        </div>
                        {selectedReporte.datosJsonb.user.email && (
                          <div>
                            <span className="text-blue-600 font-medium">Email:</span> {selectedReporte.datosJsonb.user.email}
                          </div>
                        )}
                        {selectedReporte.datosJsonb.user.puesto && (
                          <div>
                            <span className="text-blue-600 font-medium">Puesto:</span> {selectedReporte.datosJsonb.user.puesto}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Información de la Planta */}
                  {selectedReporte.datosJsonb.plant && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <h4 className="font-medium text-green-900 mb-3">Planta</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-600 font-medium">ID:</span> {selectedReporte.datosJsonb.plant.id}
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Nombre:</span> {selectedReporte.datosJsonb.plant.nombre}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Parámetros */}
                  {selectedReporte.datosJsonb.parameters && Object.keys(selectedReporte.datosJsonb.parameters).length > 0 && (
                    <div className="bg-purple-50 rounded-xl p-4">
                      <h4 className="font-medium text-purple-900 mb-3">Parámetros</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-purple-200">
                              <th className="text-left py-2 text-purple-700">Sistema</th>
                              <th className="text-left py-2 text-purple-700">Parámetro</th>
                              <th className="text-left py-2 text-purple-700">Valor</th>
                              <th className="text-left py-2 text-purple-700">Unidad</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedReporte.datosJsonb.parameters).map(([sistema, params]) =>
                              Object.entries(params).map(([parametro, data]) => (
                                <tr key={`${sistema}-${parametro}`} className="border-b border-purple-100">
                                  <td className="py-2">{sistema}</td>
                                  <td className="py-2">{parametro}</td>
                                  <td className="py-2">{data.valor}</td>
                                  <td className="py-2">{data.unidad}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Tolerancias */}
                  {selectedReporte.datosJsonb.variablesTolerancia && Object.keys(selectedReporte.datosJsonb.variablesTolerancia).length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <h4 className="font-medium text-orange-900 mb-3">Tolerancias</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-orange-200">
                              <th className="text-left py-2 text-orange-700">Parámetro ID</th>
                              <th className="text-left py-2 text-orange-700">Límite Min</th>
                              <th className="text-left py-2 text-orange-700">Límite Max</th>
                              <th className="text-left py-2 text-orange-700">Bien Min</th>
                              <th className="text-left py-2 text-orange-700">Bien Max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedReporte.datosJsonb.variablesTolerancia).map(([paramId, tolerancia]) => (
                              <tr key={paramId} className="border-b border-orange-100">
                                <td className="py-2">{paramId}</td>
                                <td className="py-2">{tolerancia.limite_min || 'N/A'}</td>
                                <td className="py-2">{tolerancia.limite_max || 'N/A'}</td>
                                <td className="py-2">{tolerancia.bien_min || 'N/A'}</td>
                                <td className="py-2">{tolerancia.bien_max || 'N/A'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Información adicional */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Información Adicional</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedReporte.datosJsonb.fecha && (
                        <div>
                          <span className="text-gray-600 font-medium">Fecha:</span> {selectedReporte.datosJsonb.fecha}
                        </div>
                      )}
                      {selectedReporte.datosJsonb.generatedDate && (
                        <div>
                          <span className="text-gray-600 font-medium">Fecha Generación:</span> {selectedReporte.datosJsonb.generatedDate}
                        </div>
                      )}
                      {selectedReporte.datosJsonb.comentarios && (
                        <div className="col-span-2">
                          <span className="text-gray-600 font-medium">Comentarios:</span> {selectedReporte.datosJsonb.comentarios}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No hay datos JSONB disponibles para este reporte</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}