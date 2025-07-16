"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/services/authService"
import { httpService } from "@/services/httpService"

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
      const storedUser = localStorage.getItem('omega_user')
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
    const apiBase = "http://localhost:4000";

    const fetchPlants = async (): Promise<Plant[]> => {
      const res = await fetch(`${apiBase}/api/plantas/accesibles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.plantas || [];
    };

    const fetchProcesos = async (plantaId: string): Promise<any[]> => {
      const res = await fetch(`${apiBase}/api/procesos/planta/${plantaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.procesos || [];
    };

    const fetchVariables = async (procesoId: string): Promise<any[]> => {
      const res = await fetch(`${apiBase}/api/variables/proceso/${procesoId}`, {
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

  // Fetch del resumen del dashboard
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
      let endpoint = "/api/dashboard/resumen"
      if (puesto === "admin") {
        endpoint = "/api/dashboard/resumen-admin"
      } else{
        endpoint = "/api/dashboard/resumen"
      }
      
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
    fetchResumen();
  }, [user]);

  useEffect(() => {
    if (!plants.length) return;
    const token = authService.getToken();
    const apiBase = "http://localhost:4000";

    const fetchAllHistoricalData = async () => {
      const allData: Record<string, any[]> = {};
      for (const plant of plants) {
        if (!plant.systems) continue;
        for (const system of plant.systems) {
          for (const param of system.parameters) {
            const encodedVar = encodeURIComponent(param.name);
            const res = await fetch(
              `${apiBase}/api/mediciones/variable/${encodedVar}`,
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
        <StatsCards dashboardResumen={dashboardResumen} />

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
