"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Eye, Download, Calendar, Filter, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants";

interface Reporte {
  id: string;
  titulo: string;
  planta: string;
  sistema: string;
  usuario: string;
  fecha: string;
  estado: string;
  /** Habilitado para que se pueda ver el reporte (solo se listan los que tienen estatus true) */
  estatus?: boolean;
  // Datos resumen
  totalParametros: number;
  totalTolerancias: number;
  comentarios: string;
  fechaGeneracion: string;
  usuario_id: string;
  planta_id: string;
  // Datos JSONB reconstruidos
  datosJsonb?: {
    user?: {
      id: string;
      username: string;
      email?: string;
      puesto?: string;
      cliente_id?: string;
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
    parameterComments?: {
      [variableName: string]: string;
    };
    fecha?: string;
    comentarios?: string;
    generatedDate?: string;
  };
}

export default function ReportList() {
  const router = useRouter();
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [plantaFiltro, setPlantaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "user" | "client">("client");
  const [user, setUser] = useState<any>(null);
  const [selectedReporte, setSelectedReporte] = useState<Reporte | null>(null);
  const [showJsonbModal, setShowJsonbModal] = useState(false);
  
  // Estados para ordenamiento
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  
  // Función helper para formatear números a 2 decimales
  const formatNumber = (value: number | null | undefined): string => {
    if (value == null || value === undefined) return "—"
    if (typeof value !== "number" || Number.isNaN(value)) return "—"
    return value.toFixed(2)
  }
  
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

      const params = new URLSearchParams();
      params.set("limit", "5000");
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.ok && data.reportes) {
        const reportesFormateados = data.reportes
          .map((reporte: any) => {
            const datosJsonb = reporte.datos || {};
            const titulo = reporte.titulo || reporte.nombre || `Reporte ${reporte.id}`;
            const planta = datosJsonb.plant?.nombre || reporte.planta || reporte.plantName || "Planta no especificada";
            const sistema = datosJsonb.systemName || reporte.sistema || reporte.systemName || "Sistema no especificado";
            const usuario = datosJsonb.user?.username || reporte.usuario || "Usuario desconocido";
            const fecha = datosJsonb.fecha || reporte.fecha || new Date().toISOString().split('T')[0];
            const estado = reporte.estado || "Completado";
            const estatus = typeof reporte.estatus === "boolean" ? reporte.estatus : false;
            const totalParametros = datosJsonb.parameters
              ? Object.values(datosJsonb.parameters).reduce((acc: number, s: any) => acc + Object.keys(s).length, 0)
              : 0;
            const totalTolerancias = datosJsonb.variablesTolerancia ? Object.keys(datosJsonb.variablesTolerancia).length : 0;
            return {
              id: reporte.id,
              titulo,
              planta,
              sistema,
              usuario,
              fecha,
              estado,
              estatus,
              totalParametros,
              totalTolerancias,
              comentarios: reporte.comentarios || reporte.observaciones || "",
              fechaGeneracion: reporte.fechaGeneracion || reporte.fecha_creacion || reporte.created_at || new Date().toISOString(),
              usuario_id: reporte.usuario_id || "",
              planta_id: reporte.planta_id || "",
              datosJsonb: reporte.datos || {}
            };
          })
          .filter((r: Reporte) => r.estatus === true);

        setReportes(reportesFormateados);
      } else {
        setReportes([]);
      }
    } catch (err: any) {
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

  // Aplicar filtros y ordenamiento
  const reportesFiltrados = reportes
    .filter(reporte => {
      // Filtro por rango de fechas
      let cumpleFecha = true;
      if (fechaInicio || fechaFin) {
        const fechaReporte = new Date(reporte.fecha);
        if (fechaInicio) {
          const fechaInicioDate = new Date(fechaInicio);
          cumpleFecha = cumpleFecha && fechaReporte >= fechaInicioDate;
        }
        if (fechaFin) {
          const fechaFinDate = new Date(fechaFin);
          // Agregar un día para incluir la fecha fin
          fechaFinDate.setDate(fechaFinDate.getDate() + 1);
          cumpleFecha = cumpleFecha && fechaReporte < fechaFinDate;
        }
      }
      
      const cumplePlanta = !plantaFiltro || reporte.planta === plantaFiltro;
      return cumpleFecha && cumplePlanta;
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      
      let aValue: any = a[sortField as keyof Reporte];
      let bValue: any = b[sortField as keyof Reporte];
      
      // Manejar casos especiales
      if (sortField === "fecha") {
        aValue = new Date(a.fecha).getTime();
        bValue = new Date(b.fecha).getTime();
      } else if (sortField === "totalParametros" || sortField === "totalTolerancias") {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = String(aValue || "").toLowerCase();
        bValue = String(bValue || "").toLowerCase();
      }
      
      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
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

  // Función para manejar el ordenamiento
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Función para obtener el icono de ordenamiento
  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronUp className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === "asc" ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
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

  // Función para manejar la vista del reporte (obtiene orden de parámetros y sistemas para que /reports muestre la tabla en el orden correcto también para cliente)
  const handleViewReport = async (report: any) => {
    try {
      if (!report.planta_id) {
        alert("Error: No se pueden visualizar reportes sin datos de planta completos");
        return;
      }

      const plantId = report.datosJsonb?.plant?.id || report.planta_id;
      const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null;
      let parameterOrder: string[] | undefined;
      let systemOrder: string[] | undefined;

      if (token) {
        try {
          const [ordenRes, sistemasRes] = await Promise.all([
            fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ORDEN_VARIABLES(plantId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT(plantId)}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          if (ordenRes.ok) {
            const ordenData = await ordenRes.json();
            if (ordenData.ok && Array.isArray(ordenData.variables)) {
              parameterOrder = ordenData.variables.map((v: { nombre?: string }) => v.nombre).filter(Boolean);
            }
          }
          if (sistemasRes.ok) {
            const sistemasData = await sistemasRes.json();
            const procesos = sistemasData.procesos || sistemasData || [];
            const sorted = [...procesos].sort((a: { orden?: number }, b: { orden?: number }) => (a.orden ?? 999999) - (b.orden ?? 999999));
            systemOrder = sorted.map((s: { nombre?: string }) => s.nombre).filter(Boolean);
          }
        } catch (_) {
          // Si falla, /reports usará fallback
        }
      }
      
      const reportSelection = {
        user: {
          id: report.datosJsonb?.user?.id || report.usuario_id,
          username: report.datosJsonb?.user?.username || report.usuario,
          email: report.datosJsonb?.user?.email || "",
          puesto: report.datosJsonb?.user?.puesto || "client",
          cliente_id: report.datosJsonb?.user?.cliente_id || null
        },
        plant: {
          id: report.datosJsonb?.plant?.id || report.planta_id,
          nombre: report.datosJsonb?.plant?.nombre || report.plantName,
          dirigido_a: report.datosJsonb?.plant?.dirigido_a,
          mensaje_cliente: report.datosJsonb?.plant?.mensaje_cliente,
          systemName: report.datosJsonb?.plant?.systemName || report.datosJsonb?.systemName || report.systemName
        },
        systemName: report.datosJsonb?.systemName || report.systemName,
        parameters: report.datosJsonb?.parameters || {},
        variablesTolerancia: report.datosJsonb?.variablesTolerancia || {},
        parameterComments: report.datosJsonb?.parameterComments || {},
        mediciones: [],
        fecha: report.datosJsonb?.fecha || (report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        comentarios: report.datosJsonb?.comentarios || report.observaciones || "",
        generatedDate: report.datosJsonb?.generatedDate || report.created_at || new Date().toISOString(),
        cliente_id: report.datosJsonb?.user?.cliente_id || null,
        ...(parameterOrder?.length && { parameterOrder }),
        ...(systemOrder?.length && { systemOrder }),
      };

      localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
      localStorage.setItem("viewMode", "preview");
      router.push("/reports");
      
    } catch (error) {
      alert("Error al preparar la vista del reporte");
    }
  };

  // Función para manejar la descarga del PDF
  const handleDownloadPDF = async (reporte: Reporte) => {
    try {
      // Validar que tenemos los datos mínimos necesarios
      if (!reporte.planta_id) {
        alert("Error: No se pueden descargar reportes sin datos de planta completos");
        return;
      }
      
      // Reconstruir reportSelection desde los datos JSONB completos (igual que dashboard-reportmanager)
      const reportSelection = {
        user: {
          id: reporte.datosJsonb?.user?.id || reporte.usuario_id,
          username: reporte.datosJsonb?.user?.username || reporte.usuario,
          email: reporte.datosJsonb?.user?.email || "",
          puesto: reporte.datosJsonb?.user?.puesto || "client",
          cliente_id: reporte.datosJsonb?.user?.cliente_id || null
        },
        plant: {
          id: reporte.datosJsonb?.plant?.id || reporte.planta_id,
          nombre: reporte.datosJsonb?.plant?.nombre || reporte.planta,
          dirigido_a: (reporte.datosJsonb?.plant as any)?.dirigido_a,
          mensaje_cliente: (reporte.datosJsonb?.plant as any)?.mensaje_cliente,
          systemName: (reporte.datosJsonb?.plant as any)?.systemName || reporte.datosJsonb?.systemName || reporte.sistema
        },
        systemName: reporte.datosJsonb?.systemName || reporte.sistema,
        parameters: reporte.datosJsonb?.parameters || {},
        variablesTolerancia: reporte.datosJsonb?.variablesTolerancia || {},
        parameterComments: reporte.datosJsonb?.parameterComments || {}, // Comentarios por parámetro
        mediciones: [],
        fecha: reporte.datosJsonb?.fecha || reporte.fecha,
        comentarios: reporte.datosJsonb?.comentarios || reporte.comentarios,
        generatedDate: reporte.datosJsonb?.generatedDate || reporte.fechaGeneracion,
        cliente_id: reporte.datosJsonb?.user?.cliente_id || null
      };

      localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
      router.push("/reports?download=true");
      
    } catch (error) {
      alert("Error al preparar la descarga del PDF");
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
                Se muestran los reportes a los que tienes permiso de acceso y que están habilitados para visualización.
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
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
                  setFechaInicio("");
                  setFechaFin("");
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
                    <button
                      onClick={() => handleSort("titulo")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Reporte
                      {getSortIcon("titulo")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    <button
                      onClick={() => handleSort("planta")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Planta
                      {getSortIcon("planta")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    <button
                      onClick={() => handleSort("estado")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Estado
                      {getSortIcon("estado")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    <button
                      onClick={() => handleSort("fecha")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Fecha
                      {getSortIcon("fecha")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    <button
                      onClick={() => handleSort("totalParametros")}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors"
                    >
                      Resumen
                      {getSortIcon("totalParametros")}
                    </button>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                        <span className="text-gray-600">Cargando reportes...</span>
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
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
                        <span className={`${getStatusColor(reporte.estado)} text-white text-xs px-2 py-1 rounded-full flex items-center`}>
                          {reporte.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {formatDate(reporte.fecha)}
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
                          onClick={() => handleViewReport(reporte)}
                          className="border border-gray-300 p-2 rounded hover:bg-gray-100"
                          title="Ver reporte"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(reporte)}
                          className="border border-gray-300 p-2 rounded hover:bg-gray-100"
                          title="Descargar PDF"
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
                          {fechaInicio || fechaFin || plantaFiltro
                            ? "No se encontraron reportes con los filtros aplicados"
                            : "No hay reportes habilitados para visualización o no tienes permiso para ver ninguno."}
                        </p>
                        {(fechaInicio || fechaFin || plantaFiltro) && (
                          <button
                            onClick={() => {
                              setFechaInicio("");
                              setFechaFin("");
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
                                  <td className="py-2">{formatNumber(data.valor)}</td>
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