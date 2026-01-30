"use client"

import React, { useState, useEffect } from 'react';
import ReactSelect from 'react-select';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants";

interface Empresa {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface Plant {
  id: string;
  nombre: string;
}

interface System {
  id: string;
  nombre: string;
  descripcion: string;
}

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
  estatus?: boolean;
}

interface TabbedSelectorProps {
  displayedEmpresas: Empresa[];
  displayedPlants: Plant[];
  systems: System[];
  selectedEmpresa: Empresa | null;
  selectedPlant: Plant | null;
  selectedSystem: string | undefined;
  selectedSystemData: System | undefined;
  handleSelectEmpresa: (empresaId: string | '') => void;
  handleSelectPlant: (plantId: string | '') => void;
  setSelectedSystem: (systemId: string) => void;
  plantName: string;
  globalFecha: string;
  globalComentarios: string;
  handleGlobalFechaChange: (fecha: string) => void;
  handleGlobalComentariosChange: (comentarios: string) => void;
  ocultarFecha: boolean;
  onSaveData: () => Promise<void>;
  onGenerateReport: () => Promise<void>;
  isGenerateDisabled: boolean;
  chartStartDate: string;
  chartEndDate: string;
  handleChartStartDateChange: (fecha: string) => void;
  handleChartEndDateChange: (fecha: string) => void;
  token: string | null;
  onViewReport: (report: Report) => void;
  activeTab?: string;
  onActiveTabChange?: (tab: string) => void;
}

const TabbedSelector: React.FC<TabbedSelectorProps> = ({
  displayedEmpresas,
  displayedPlants,
  systems,
  selectedEmpresa,
  selectedPlant,
  selectedSystem,
  selectedSystemData,
  handleSelectEmpresa,
  handleSelectPlant,
  setSelectedSystem,
  plantName,
  globalFecha,
  globalComentarios,
  handleGlobalFechaChange,
  handleGlobalComentariosChange,
  ocultarFecha,
  onSaveData,
  onGenerateReport,
  isGenerateDisabled,
  chartStartDate,
  chartEndDate,
  handleChartStartDateChange,
  handleChartEndDateChange,
  token,
  onViewReport,
  activeTab: controlledActiveTab,
  onActiveTabChange,
}) => {
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<string>("cliente");
  const activeTab = controlledActiveTab ?? uncontrolledActiveTab;
  const setActiveTab = (nextTab: string) => {
    if (onActiveTabChange) {
      onActiveTabChange(nextTab);
      return;
    }
    setUncontrolledActiveTab(nextTab);
  };
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  // Inicializar pestaña activa basada en selecciones existentes.
  // Si hay una planta seleccionada, ir a procesos. Si solo hay empresa, ir a planta.
  useEffect(() => {
    if (selectedPlant) {
      setActiveTab("procesos");
      return;
    }
    if (selectedEmpresa) {
      setActiveTab("planta");
      return;
    }

    setActiveTab("cliente");
  }, [selectedEmpresa, selectedPlant]);

  // Manejar selección de empresa
  const handleEmpresaSelect = (option: { value: string; label: string } | null) => {
    handleSelectEmpresa(option ? option.value : '');
    if (option) {
      // Si se selecciona una empresa, avanzar a la pestaña de planta
      setTimeout(() => setActiveTab("planta"), 150);
    } else {
      // Si se deselecciona, volver a cliente
      setActiveTab("cliente");
    }
  };

  // Manejar selección de planta
  const handlePlantSelect = (option: { value: string; label: string } | null) => {
    handleSelectPlant(option ? option.value : '');
    if (option) {
      // Si se selecciona una planta, avanzar a la pestaña de procesos
      // Usamos un timeout más largo para asegurar que el estado se actualice primero
      setTimeout(() => setActiveTab("procesos"), 300);
    } else {
      // Si se deselecciona, volver a planta
      setActiveTab("planta");
    }
  };

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "online":
      case "completed":
        return "bg-success";
      case "maintenance":
      case "pending":
        return "bg-warning";
      case "inactive":
      case "offline":
      case "error":
        return "bg-danger";
      default:
        return "bg-secondary";
    }
  };

  // Función para formatear fecha
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "";
    
    const parseDateWithoutTimezone = (dateString: string): Date | null => {
      if (!dateString) return null;
      
      const dateMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
      
      return new Date(dateString);
    };
    
    const parsedDate = parseDateWithoutTimezone(dateString);
    if (!parsedDate || isNaN(parsedDate.getTime())) return "";
    
    return parsedDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Cargar reportes filtrados por planta
  useEffect(() => {
    const fetchPendingReports = async () => {
      if (!selectedPlant || !token || activeTab !== "reportes-pendientes") {
        setPendingReports([]);
        return;
      }

      setReportsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          console.error("Error al cargar reportes:", response.status, response.statusText);
          setPendingReports([]);
          return;
        }

        const data = await response.json();
        const reportesData = Array.isArray(data.reportes) ? data.reportes : [];
        
        // Formatear reportes similar al dashboard
        let formattedReports = reportesData.map((report: any) => {
          const datosJsonb = report.datos || {};
          
          return {
            id: report.id?.toString() || report.id,
            title: report.titulo || report.nombre || `Reporte ${report.id}`,
            plantName: datosJsonb.plant?.nombre || report.planta || report.plantName || "Planta no especificada",
            systemName: datosJsonb.systemName || report.sistema || report.systemName || "Sistema no especificado",
            status: report.estado || report.status || "completed",
            created_at: datosJsonb.generatedDate || report.fechaGeneracion || report.fecha_creacion || report.created_at || new Date().toISOString(),
            usuario_id: report.usuario_id || "",
            planta_id: report.planta_id || datosJsonb.plant?.id || "planta-unknown",
            proceso_id: report.proceso_id || "sistema-unknown",
            estatus: typeof report.estatus === "boolean" ? report.estatus : false,
            datos: {
              ...(report.reportSelection || report.datos || {}),
              fecha: datosJsonb.fecha || report.fecha || (report.reportSelection?.fecha) || (report.datos?.fecha)
            },
            observaciones: datosJsonb.comentarios || report.comentarios || report.observaciones || "",
            usuario: datosJsonb.user?.username || report.usuario || "",
            puesto: datosJsonb.user?.puesto || report.puesto || ""
          };
        });

        // Filtrar por la planta seleccionada
        formattedReports = formattedReports.filter((report: Report) => {
          return report.planta_id === selectedPlant.id;
        });

        // Ordenar por fecha (más reciente primero)
        formattedReports.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });

        setPendingReports(formattedReports);
      } catch (error) {
        console.error("Error cargando reportes pendientes:", error);
        setPendingReports([]);
      } finally {
        setReportsLoading(false);
      }
    };

    fetchPendingReports();
  }, [selectedPlant, token, activeTab]);

  const handleToggleReportStatus = async (report: Report) => {
    if (!token) {
      alert("No hay token de autenticación");
      return;
    }

    const newStatus = !report.estatus;

    // Optimistic update
    setPendingReports(prev =>
      prev.map(r => (r.id === report.id ? { ...r, estatus: newStatus } : r))
    );

    try {
      const response = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.REPORT_STATUS(report.id)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ estatus: newStatus }),
        }
      );

      if (!response.ok) {
        console.error("Error actualizando estatus del reporte:", response.status, response.statusText);
        alert("Error al actualizar el estatus del reporte");
        // revertir cambio
        setPendingReports(prev =>
          prev.map(r => (r.id === report.id ? { ...r, estatus: report.estatus } : r))
        );
      }
    } catch (error) {
      console.error("Error actualizando estatus del reporte:", error);
      alert("Error al actualizar el estatus del reporte");
      // revertir cambio
      setPendingReports(prev =>
        prev.map(r => (r.id === report.id ? { ...r, estatus: report.estatus } : r))
      );
    }
  };

  return (
    <Card className="mb-6 border-0 shadow-lg">
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Pestañas estilo navegador */}
          <div className="border-b border-gray-300 bg-gray-100 px-4 pt-2">
            <TabsList className="inline-flex h-auto p-0 bg-transparent gap-0.5">
              <TabsTrigger 
                value="cliente" 
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Empresa
              </TabsTrigger>
              <TabsTrigger 
                value="planta" 
                disabled={!selectedEmpresa}
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Planta
              </TabsTrigger>
              <TabsTrigger 
                value="procesos" 
                disabled={!selectedPlant}
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Procesos
              </TabsTrigger>
              <TabsTrigger 
                value="reportes-pendientes" 
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Reportes Pendientes
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pestaña 1: Selección de Cliente (Empresa) */}
          <TabsContent value="cliente" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Seleccionar Empresa
                </label>
                <ReactSelect
                  options={displayedEmpresas.map((empresa) => ({ 
                    value: empresa.id, 
                    label: empresa.nombre 
                  }))}
                  value={
                    selectedEmpresa
                      ? { value: selectedEmpresa.id, label: selectedEmpresa.nombre }
                      : null
                  }
                  onChange={handleEmpresaSelect}
                  placeholder="Selecciona una empresa..."
                  isClearable
                  className="w-full"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '42px',
                    }),
                  }}
                />
              </div>
              {selectedEmpresa && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Empresa seleccionada:</strong> {selectedEmpresa.nombre}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Continúa a la pestaña "Planta" para seleccionar una planta.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pestaña 2: Selección de Planta */}
          <TabsContent value="planta" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              {!selectedEmpresa ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Por favor, selecciona una empresa primero en la pestaña "Empresa".
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Seleccionar Planta
                    </label>
                    {displayedPlants.length === 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No se encontraron plantas asociadas a la empresa seleccionada. 
                          {selectedEmpresa && ` (${selectedEmpresa.nombre})`}
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Verifica que las plantas tengan un <code>empresa_id</code> asignado en la base de datos.
                        </p>
                      </div>
                    ) : (
                      <ReactSelect
                        options={displayedPlants.map((plant) => ({ 
                          value: plant.id, 
                          label: plant.nombre 
                        }))}
                        value={
                          selectedPlant
                            ? { value: selectedPlant.id, label: selectedPlant.nombre }
                            : null
                        }
                        onChange={handlePlantSelect}
                        placeholder="Selecciona una planta..."
                        isClearable
                        className="w-full"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '42px',
                          }),
                        }}
                      />
                    )}
                  </div>
                  {selectedPlant && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Planta seleccionada:</strong> {selectedPlant.nombre}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Continúa a la pestaña "Procesos" para seleccionar un proceso.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Pestaña 3: Selección de Procesos/Sistemas */}
          <TabsContent value="procesos" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              {!selectedPlant ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Por favor, selecciona una planta primero en la pestaña "Planta".
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      Sistemas de {plantName}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {systems.map((system) => (
                        <button
                          key={system.id}
                          onClick={() => setSelectedSystem(system.id)}
                          className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                            selectedSystem === system.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
                          }`}
                        >
                          {system.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSystemData && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800">
                        {selectedSystemData.nombre}
                      </h3>
                      <p className="text-gray-600 text-sm">{selectedSystemData.descripcion}</p>
                    </div>
                  )}

                  {/* Inputs globales fecha / comentarios - Siempre visible */}
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="text-base font-semibold mb-2 text-blue-800">
                      Configuración Global
                    </h3>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex flex-col">
                        <label htmlFor="globalFecha" className="text-xs font-medium text-blue-700 mb-0.5">
                          Fecha global
                        </label>
                        <Input
                          id="globalFecha"
                          type="date"
                          value={globalFecha}
                          onChange={e => handleGlobalFechaChange(e.target.value)}
                          className="mt-0.5 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-blue-200">
                      <div className="flex flex-col">
                        <label htmlFor="chartStartDate" className="text-xs font-medium text-blue-700 mb-0.5">
                          Fecha inicio gráficos
                        </label>
                        <Input
                          id="chartStartDate"
                          type="date"
                          value={chartStartDate}
                          onChange={e => handleChartStartDateChange(e.target.value)}
                          className="mt-0.5 h-8 text-sm"
                        />
                      </div>
                      <div className="flex flex-col">
                        <label htmlFor="chartEndDate" className="text-xs font-medium text-blue-700 mb-0.5">
                          Fecha fin gráficos
                        </label>
                        <Input
                          id="chartEndDate"
                          type="date"
                          value={chartEndDate}
                          onChange={e => handleChartEndDateChange(e.target.value)}
                          className="mt-0.5 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1.5">
                      Esta configuración se aplicará a todos los sistemas de {plantName}
                    </p>
                    
                    {/* Botones de acción */}
                    <div className="flex space-x-4 mt-3 pt-3 border-t border-blue-200">
                      {!globalFecha ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-block">
                                <Button 
                                  onClick={onSaveData} 
                                  variant="outline"
                                  disabled={!globalFecha}
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  💾 Guardar Datos
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 text-white border-gray-700">
                              <p>Selecciona una fecha para poder guardar los datos</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button 
                          onClick={onSaveData} 
                          variant="outline"
                          disabled={!globalFecha}
                        >
                          💾 Guardar Datos
                        </Button>
                      )}
                      <Button 
                        onClick={onGenerateReport} 
                        disabled={isGenerateDisabled} 
                        className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${isGenerateDisabled ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        📊 Generar Reporte
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Pestaña 4: Reportes Pendientes */}
          <TabsContent value="reportes-pendientes" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                  Reportes Pendientes
                </h3>
                {!selectedPlant ? (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      Por favor, selecciona una planta primero para ver los reportes pendientes.
                    </p>
                  </div>
                ) : reportsLoading ? (
                  <div className="text-center py-8">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Cargando reportes...</span>
                    </div>
                    <p className="text-gray-600 mt-2">Cargando reportes de {selectedPlant.nombre}...</p>
                  </div>
                ) : pendingReports.length > 0 ? (
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
                        {pendingReports.map((report) => (
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
                                const fechaReporte = report.datos?.fecha || 
                                  (report.datos && typeof report.datos === 'object' && 'fecha' in report.datos ? report.datos.fecha : null);
                                
                                if (fechaReporte) {
                                  return formatDate(fechaReporte);
                                }
                                
                                if (report.created_at) {
                                  return formatDate(report.created_at);
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
                                  className={`btn ${
                                    report.estatus ? "btn-outline-success border-success" : "btn-warning"
                                  }`}
                                  onClick={() => handleToggleReportStatus(report)}
                                  title={
                                    report.estatus
                                      ? "Visible para clientes (click para ocultar)"
                                      : "Oculto para clientes (click para publicar)"
                                  }
                                >
                                  <i
                                    className={`material-icons ${report.estatus ? "text-success" : ""}`}
                                    style={{ fontSize: report.estatus ? "1.15rem" : "1rem" }}
                                    aria-hidden
                                  >
                                    {report.estatus ? "lock_open" : "lock"}
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
                  <div className="text-center py-8">
                    <i className="material-icons text-muted" style={{ fontSize: "4rem" }}>
                      description
                    </i>
                    <p className="text-gray-600 mt-2">No hay reportes disponibles para {selectedPlant.nombre}</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TabbedSelector;

