"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/authService"
import { httpService } from "@/services/httpService"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

import Navbar from "@/components/Navbar"
import { QuickActions as AdminQuickActions } from "@/app/dashboard/buttons/admin"
import { QuickActions as UserQuickActions } from "@/app/dashboard/buttons/user"
import { QuickActions as ClientQuickActions } from "@/app/dashboard/buttons/client"
import axios from "axios"
import StatsCards from "./StatsCards";
import ChartsDashboard from "@/components/chartsDashboard";
import RecentReportsTable from "@/components/RecentReportsTable";

// Add type declaration for window.bootstrap
declare global {
  interface Window {
    bootstrap?: any
  }
}

interface Plant {
  id: string
  nombre: string
  creado_por: string
  created_at?: string
  location?: string
  description?: string
  status?: string
  systems?: System[]
}

interface System {
  id: string
  name: string
  type: string
  description: string
  plantId: string
  parameters: Parameter[]
  status: string
}

interface Parameter {
  id: string
  name: string
  unit: string
  value: number
  minValue: number
  maxValue: number
  systemId: string
}

interface HistoricalDataPoint {
  timestamp: string
  value: number
}

interface Report {
  id: string
  usuario_id: string
  planta_id: string
  proceso_id: string
  datos: any
  observaciones?: string
  created_at?: string
  title?: string
  plantName?: string
  systemName?: string
  status?: string
}

export default function Dashboard() {
  const router = useRouter()
  const [plants, setPlants] = useState<Plant[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  const [dashboardResumen, setDashboardResumen] = useState<{ plantas: number; procesos: number; variables: number; reportes: number } | null>(null)
  const [historicalData, setHistoricalData] = useState<Record<string, any[]>>({});
  const today = new Date();
  const defaultStartDate = `${today.getFullYear()}-01-01`;
  const defaultEndDate = today.toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  // Función para agregar logs de debug
  const addDebugLog = (message: string) => {
    /* console.log(`🐛 Dashboard: ${message}`) */
    /* setDebugInfo((prev) => [...prev.slice(-4), `${new Date().toLocaleTimeString()}: ${message}`]) */
  }

  // Load user from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserRole(userData.puesto || "user")
        /* addDebugLog(`Usuario cargado: ${userData.username}`) */
      } else {
        addDebugLog("No se encontró usuario en localStorage")
        router.push("/login")
      }
    }
  }, [router])

  // Mobile menu toggle function
  const toggleMobileMenu = () => {
    const mobileMenu = document.getElementById('mobileNavbar')
    if (mobileMenu) {
      const isVisible = mobileMenu.style.display === 'block'
      mobileMenu.style.display = isVisible ? 'none' : 'block'
      /* addDebugLog(`Menú móvil ${isVisible ? 'oculto' : 'mostrado'}`) */
    }
  }

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const mobileMenu = document.getElementById('mobileNavbar')
      const mobileButton = document.querySelector('.navbar-toggler')
      const userDropdown = document.querySelector('.dropdown')
      
      // Close mobile menu
      if (mobileMenu && mobileButton && 
          !mobileMenu.contains(target) && 
          !mobileButton.contains(target) &&
          mobileMenu.style.display === 'block') {
        mobileMenu.style.display = 'none'
        addDebugLog("Menú móvil cerrado por clic externo")
      }
      
      // Close user dropdown
      if (userDropdown && !userDropdown.contains(target)) {
        /* addDebugLog("Dropdown de usuario cerrado por clic externo") */
      }
    }

    if (typeof window !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      if (typeof window !== 'undefined') {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [])

  // Load Bootstrap JavaScript for navbar functionality
  useEffect(() => {
    const loadBootstrap = () => {
      if (typeof window !== 'undefined') {
        // Check if Bootstrap is already loaded
        if (!window.bootstrap) {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
          script.integrity = 'sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz'
          script.crossOrigin = 'anonymous'
          script.onload = () => {
            /* addDebugLog("Bootstrap JavaScript cargado exitosamente") */
            // Initialize Bootstrap components after loading
            if (window.bootstrap) {
              // Initialize all collapse elements
              const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]')
              collapseElements.forEach(element => {
                new window.bootstrap.Collapse(element, {
                  toggle: false
                })
              })
              /* addDebugLog("Componentes Bootstrap inicializados") */
            }
          }
          script.onerror = () => {
            addDebugLog("Error cargando Bootstrap JavaScript")
          }
          document.head.appendChild(script)
        } else {
          /* addDebugLog("Bootstrap JavaScript ya está cargado") */
          // Initialize components if Bootstrap is already available
          if (window.bootstrap) {
            const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]')
            collapseElements.forEach(element => {
              new window.bootstrap.Collapse(element, {
                toggle: false
              })
            })
            /* addDebugLog("Componentes Bootstrap inicializados") */
          }
        }
      }
    }
    
    loadBootstrap()
  }, [])

  useEffect(() => {
    if (!user) return;
    setDataLoading(true);
    const token = authService.getToken();

    const fetchPlants = async (): Promise<Plant[]> => {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESSIBLE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.plantas || [];
    };

    const fetchProcesos = async (plantaId: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT(plantaId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.procesos || [];
    };

    const fetchVariables = async (procesoId: string): Promise<any[]> => {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(procesoId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.variables || [];
    };

    const loadAll = async () => {
      try {
        const plantas = await fetchPlants();
        for (const planta of plantas) {
          planta.systems = [];
          const procesos = await fetchProcesos(planta.id);
          for (const proceso of procesos) {
            const variables = await fetchVariables(proceso.id);
            planta.systems.push({
              id: proceso.id,
              name: proceso["nombre"],
              description: proceso["descripcion"],
              plantId: planta.id,
              type: "default",
              parameters: variables.map((v: any) => ({
                id: v.id,
                name: v.nombre,
                unit: v.unidad,
                value: 0,
                minValue: 0,
                maxValue: 0,
                systemId: proceso.id
              })),
              status: "active"
            });
          }
        }
        setPlants(plantas);
      } catch (error) {
        console.error("Error cargando plantas/procesos/variables:", error);
      } finally {
        setDataLoading(false);
      }
    };

    loadAll();
  }, [user]);

  const handleNewReport = () => {
    /* addDebugLog("Nuevo Reporte clickeado - redirigiendo a report manager") */
    router.push("/dashboard-reportmanager")
  }

  const handleNewVariable = () => {
   /* addDebugLog("Nueva Variable clickeado - redirigiendo a parámetros") */
    router.push("/dashboard-agregarvariables")
  }

  const handleNewSystem = () => {
    /* addDebugLog("Nuevo Sistema clickeado - redirigiendo a agregar sistema") */
    router.push("/dashboard-agregarsistema")
  }

  const handleNewParameters = () => {
    /* addDebugLog("Nuevo Parametro clickeado - redirigiendo a parámetros") */
    router.push("/dashboard-parameters")
  }

  // look repots for client
  const getClientReports = async () => {
    /* addDebugLog("Ver reportes clickeado - redirigiendo a report list") */
    router.push("/dashboard-reportList")
  }

  // Función para manejar la vista del reporte desde el dashboard
  const handleViewReport = (report: any) => {
    try {
      console.log("👁️ Visualizando reporte desde dashboard:", report);
      
      // Validar que tenemos los datos mínimos necesarios
      if (!report.planta_id) {
        console.error("❌ Error: No se encontró planta_id en los datos del reporte");
        alert("Error: No se pueden visualizar reportes sin datos de planta completos");
        return;
      }
      
      // Reconstruir reportSelection desde los datos del reporte
      const reportSelection = {
        user: {
          id: report.usuario_id,
          username: report.usuario,
          email: report.datos?.user?.email || "",
          puesto: report.datos?.user?.puesto || "client",
          cliente_id: report.datos?.user?.cliente_id || null
        },
        plant: {
          id: report.planta_id, // Usar planta_id de la tabla reportes
          nombre: report.plantName,
          systemName: report.systemName
        },
        systemName: report.systemName,
        parameters: report.datos?.parameters ? Object.entries(report.datos.parameters).map(([key, value]) => ({
          id: key,
          nombre: key,
          unidad: Object.values(value)[0]?.unidad || "",
          limite_min: report.datos?.variablesTolerancia?.[key]?.limite_min || null,
          limite_max: report.datos?.variablesTolerancia?.[key]?.limite_max || null,
          bien_min: report.datos?.variablesTolerancia?.[key]?.bien_min || null,
          bien_max: report.datos?.variablesTolerancia?.[key]?.bien_max || null,
          usar_limite_min: report.datos?.variablesTolerancia?.[key]?.usar_limite_min || false,
          usar_limite_max: report.datos?.variablesTolerancia?.[key]?.usar_limite_max || false
        })) : [],
        mediciones: [], // Los datos de mediciones se reconstruirán en la página reports
        fecha: report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        comentarios: report.observaciones || "",
        generatedDate: report.created_at || new Date().toISOString(),
        cliente_id: report.datos?.user?.cliente_id || null
      };

      console.log("📄 reportSelection reconstruido desde dashboard:", reportSelection);
      console.log("🔍 Validación plant.id:", reportSelection.plant.id);
      console.log("🏭 Datos de planta:", {
        planta_id: report.planta_id,
        planta_nombre: report.plantName,
        systemName: report.systemName
      });
      
      // Guardar en localStorage
      localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
      
      // Redirigir a la página de reports
      router.push("/reports");
      
    } catch (error) {
      console.error("❌ Error al preparar vista del reporte desde dashboard:", error);
      alert("Error al preparar la vista del reporte");
    }
  };

  // Función para manejar la descarga del PDF desde el dashboard
  const handleDownloadPDF = async (report: any) => {
    try {
      console.log("📥 Descargando PDF del reporte desde dashboard:", report);
      
      // Validar que tenemos los datos mínimos necesarios
      if (!report.planta_id) {
        console.error("❌ Error: No se encontró planta_id en los datos del reporte");
        alert("Error: No se pueden descargar reportes sin datos de planta completos");
        return;
      }
      
      // Reconstruir reportSelection con validación completa
      const reportSelection = {
        user: {
          id: report.usuario_id,
          username: report.usuario,
          email: report.datos?.user?.email || "",
          puesto: report.datos?.user?.puesto || "client",
          cliente_id: report.datos?.user?.cliente_id || null
        },
        plant: {
          id: report.planta_id, // Usar planta_id de la tabla reportes
          nombre: report.plantName,
          systemName: report.systemName
        },
        systemName: report.systemName,
        parameters: report.datos?.parameters ? Object.entries(report.datos.parameters).map(([key, value]) => ({
          id: key,
          nombre: key,
          unidad: Object.values(value)[0]?.unidad || "",
          limite_min: report.datos?.variablesTolerancia?.[key]?.limite_min || null,
          limite_max: report.datos?.variablesTolerancia?.[key]?.limite_max || null,
          bien_min: report.datos?.variablesTolerancia?.[key]?.bien_min || null,
          bien_max: report.datos?.variablesTolerancia?.[key]?.bien_max || null,
          usar_limite_min: report.datos?.variablesTolerancia?.[key]?.usar_limite_min || false,
          usar_limite_max: report.datos?.variablesTolerancia?.[key]?.usar_limite_max || false
        })) : [],
        mediciones: [],
        fecha: report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        comentarios: report.observaciones || "",
        generatedDate: report.created_at || new Date().toISOString(),
        cliente_id: report.datos?.user?.cliente_id || null
      };

      console.log("📄 reportSelection reconstruido para descarga desde dashboard:", reportSelection);
      console.log("🔍 Validación plant.id:", reportSelection.plant.id);
      console.log("🏭 Datos de planta para descarga:", {
        planta_id: report.planta_id,
        planta_nombre: report.plantName,
        systemName: report.systemName
      });

      // Guardar temporalmente en localStorage
      console.log("💾 Guardando reportSelection en localStorage...");
      localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
      console.log("✅ reportSelection guardado exitosamente");
      
      // Redirigir a reports para generar el PDF
      console.log("🚀 Redirigiendo a /reports?download=true");
      router.push("/reports?download=true");
      console.log("✅ Redirección completada");
      
    } catch (error) {
      console.error("❌ Error al preparar descarga del PDF desde dashboard:", error);
      alert("Error al preparar la descarga del PDF");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "online":
      case "completed":
        return "bg-success"
      case "maintenance":
      case "pending":
        return "bg-warning"
      case "inactive":
      case "offline":
      case "error":
        return "bg-danger"
      default:
        return "bg-secondary"
    }
  }

  // Generate historical data for the last 24 hours
  const generateHistoricalData = (param: Parameter): HistoricalDataPoint[] => {
    const data: HistoricalDataPoint[] = []
    const now = new Date()
    
    // Generate 24 data points (one per hour)
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
      
      // Generate realistic values with some variation
      const baseValue = param.value
      const variation = (Math.random() - 0.5) * (param.maxValue - param.minValue) * 0.3
      const value = Math.max(param.minValue, Math.min(param.maxValue, baseValue + variation))
      
      data.push({
        timestamp: timestamp.toISOString(),
        value: Math.round(value * 10) / 10 // Round to 1 decimal place
      })
    }
    
    return data
  }

  // Fetch del resumen del dashboard y reportes
  useEffect(() => {
    if (!user) return;
    const fetchResumen = async () => {
      // Obtener token
      const token = authService.getToken()
      if (!token) {
        console.error("❌ No hay token de autenticación")
        return
      }
      
      // Obtener el puesto del usuario
      const currentUser = authService.getCurrentUser()
      if (!currentUser) {
        console.error("❌ No se pudo obtener información del usuario")
        return
      }
      
      const puesto = currentUser.puesto
      /* console.log("👤 Puesto del usuario:", puesto) */
      
      // Determinar el endpoint según el puesto
      const endpoint = puesto === "admin" 
        ? API_ENDPOINTS.DASHBOARD_RESUMEN_ADMIN 
        : API_ENDPOINTS.DASHBOARD_RESUMEN
      
      try {
        const res = await httpService.get(endpoint, {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }) as { ok?: boolean; resumen?: any }
        if (res && res.ok && res.resumen) {
          setDashboardResumen(res.resumen);
          addDebugLog(`Resumen del dashboard cargado desde API (${puesto})`);
        } else {
          addDebugLog("Respuesta inesperada al cargar resumen del dashboard");
        }
      } catch (error) {
        addDebugLog("Error al cargar resumen del dashboard: " + error);
      }
    };

    const fetchReportes = async () => {
      try {
        const token = authService.getToken()
        if (!token) return

        // Usar el endpoint de reportes con filtrado por rol
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS_DASHBOARD}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        let reportesData: any[] = []
        
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Respuesta del backend:', data)
          reportesData = Array.isArray(data.reportes) ? data.reportes : []
          console.log('📋 Reportes recibidos:', reportesData.length, reportesData)
        } else {
          console.error("Error en la respuesta de reportes:", response.status, response.statusText)
        }
        
        // Agregar reporte dummy si no hay reportes reales
        if (reportesData.length === 0) {
          reportesData.push({
            id: "9999",
            titulo: "Reporte de prueba",
            planta: "Planta Norte",
            sistema: "Sistema de Temperatura",
            estado: "Completado",
            fecha: new Date().toISOString().split('T')[0],
            fechaGeneracion: new Date().toISOString(),
            comentarios: "Reporte de prueba generado automáticamente",
            usuario: user.username,
            puesto: user.puesto,
            reportSelection: {}
          })
        }
        
        // Convertir formato de reportes para el dashboard
        const formattedReports = reportesData.map((report: any) => ({
          id: report.id?.toString() || report.id,
          title: report.titulo || report.nombre || `Reporte ${report.id}`,
          plantName: report.planta || report.plantName || "Planta no especificada",
          systemName: report.sistema || report.systemName || "Sistema no especificado",
          status: report.estado || report.status || "completed",
          created_at: report.fechaGeneracion || report.fecha_creacion || report.created_at || new Date().toISOString(),
          usuario_id: report.usuario_id || user.id,
          planta_id: report.planta_id || "planta-unknown",
          proceso_id: report.proceso_id || "sistema-unknown",
          datos: report.reportSelection || report.datos || {},
          observaciones: report.comentarios || report.observaciones || "",
          usuario: report.usuario || user.username,
          puesto: report.puesto || user.puesto
        }))
        
        setReports(formattedReports)
        addDebugLog(`Reportes cargados: ${formattedReports.length} reportes (rol: ${userRole})`)
        
      } catch (error) {
        console.error("Error cargando reportes:", error)
        // En caso de error, agregar reporte dummy
        setReports([{
          id: "9999",
          title: "Reporte de prueba",
          plantName: "Planta Norte",
          systemName: "Sistema de Temperatura",
          status: "completed",
          created_at: new Date().toISOString(),
          usuario_id: user.id,
          planta_id: "planta-norte",
          proceso_id: "sistema-temperatura",
          datos: {},
          observaciones: "Reporte de prueba generado automáticamente"
        }])
      }
    }

    fetchResumen();
    fetchReportes();
  }, [user]);

  useEffect(() => {
    if (!plants.length) return;
    const token = authService.getToken();

    const fetchAllHistoricalData = async () => {
      const allData: Record<string, any[]> = {};
      for (const plant of plants) {
        if (!plant.systems) continue;
        for (const system of plant.systems) {
          // Primero verificar si hay datos en el proceso
          try {
            const processRes = await fetch(
              `${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS_BY_PROCESS(system.name)}`,
              { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );
            
            if (!processRes.ok) {
              console.error(`Error verificando datos del proceso ${system.name}:`, processRes.status);
              continue;
            }
            
            const processResult = await processRes.json();
            const processData = processResult.mediciones || [];
            
            // Filtrar datos del proceso por fecha
            const filteredProcessData = processData.filter((m: any) => {
              const d = new Date(m.fecha);
              return d >= new Date(startDate) && d <= new Date(endDate);
            });
            
            // Si no hay datos en el proceso, saltar a la siguiente variable
            if (filteredProcessData.length === 0) {
              console.log(`No hay datos en el proceso ${system.name} para el rango de fechas`);
              continue;
            }
            
            // Ahora obtener datos por variable
            for (const param of system.parameters) {
              const res = await fetch(
                `${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_NAME(param.name)}`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
              );
              const result = await res.json();
              const json: any[] = result.mediciones || [];
              const filtered = json.filter(m => {
                const d = new Date(m.fecha);
                return d >= new Date(startDate) && d <= new Date(endDate);
              });
              allData[param.id] = filtered.map(m => ({
                timestamp: m.fecha,
                value: Number(m.valor)
              }));
            }
          } catch (error) {
            console.error(`Error procesando sistema ${system.name}:`, error);
          }
        }
      }
      setHistoricalData(allData);
    };

    fetchAllHistoricalData();
  }, [plants, startDate, endDate]);

  // Don't render if user is not loaded
  if (!user) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Use the Navbar component */}
      <Navbar role={userRole} />

      {/* Main Content */}
      <div className="container py-4">
        {/* Status Banner */}
        {/* Welcome Section */}
        <div className="alert alert-info" role="alert">
          <h1 className="h3 mb-0">Bienvenido,  <strong>{user.username}</strong></h1>
          <p className="text-muted">Panel de control</p>
        </div>


        {/* Stats Cards */}
        <StatsCards dashboardResumen={dashboardResumen} userRole={userRole} />

        {/* Quick Actions */}
        {userRole === "admin" && (
          <AdminQuickActions
            handleNewReport={handleNewReport}
            handleNewVariable={handleNewVariable}
            handleNewSystem={handleNewSystem}
            handleNewParameter={handleNewParameters}
          />
        )}
        {userRole === "user" && (
          <UserQuickActions
            handleNewReport={handleNewReport}
            handleNewSystem={handleNewSystem}
          />
        )}
        {userRole === "client" && (
          <ClientQuickActions
            handleNewReport={getClientReports}
          />
        )}

        {/* Recent Reports */}
        <div className="row mb-4">
          
          <RecentReportsTable
            reports={reports}
            dataLoading={dataLoading}
            getStatusColor={getStatusColor}
            onTableClick={getClientReports}
            onDebugLog={addDebugLog}
            onViewReport={handleViewReport}
            onDownloadPDF={handleDownloadPDF}
          />
        </div>

        {/* System Charts - Historical Data */}
        <div className="row mb-4">
          <div className="col-12">
            <h5 className="mb-3">📈 Gráficos Históricos de Sistemas</h5>
          </div>
          <ChartsDashboard
            plants={plants}
            historicalData={historicalData}
            getStatusColor={getStatusColor}
            startDate={startDate}
            endDate={endDate}
          />
        </div>

        {/* Debug Info */}
       {/*  <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title mb-0">🐛 Debug Dashboard</h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Estado Actual:</h6>
                    <ul className="list-unstyled">
                      <li>✅ Dashboard cargado sin redirecciones</li>
                      <li>✅ Navbar mejorado con dropdown de usuario</li>
                      <li>✅ Botones de acción funcionales</li>
                      <li>✅ Datos mock funcionando</li>
                      <li>✅ Navegación funcional</li>
                      <li>✅ Bootstrap JavaScript cargado</li>
                      <li>✅ Navbar responsive configurado</li>
                      <li>📊 Plantas: {plants.length}</li>
                      <li>📋 Reportes: {reports.length}</li>
                      <li>🔄 Cargando: {dataLoading ? "Sí" : "No"}</li>
                      <li>🌐 Bootstrap: {typeof window !== 'undefined' && window.bootstrap ? "Cargado" : "No cargado"}</li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Logs Recientes:</h6>
                    <div
                      className="bg-dark text-light p-2 rounded"
                      style={{ fontSize: "0.8rem", maxHeight: "150px", overflowY: "auto" }}
                    >
                      {debugInfo.length > 0 ? (
                        debugInfo.map((log, index) => (
                          <div key={index} className="text-info">
                            <small>{log}</small>
                          </div>
                        ))
                      ) : (
                        <div className="text-muted">No hay logs aún...</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  )
}
