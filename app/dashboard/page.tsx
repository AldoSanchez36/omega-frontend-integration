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
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest" | "analista">("guest")
  const [dashboardResumen, setDashboardResumen] = useState<{ plantas: number; procesos: number; variables: number; reportes: number } | null>(null)
  // historicalData[systemId][paramId] = [{ timestamp, value }, ...]
  const [historicalData, setHistoricalData] = useState<Record<string, Record<string, any[]>>>({});
  const [totalHistoricos, setTotalHistoricos] = useState<number>(0);
  const [historicalDataLoading, setHistoricalDataLoading] = useState<boolean>(false);
  
  // Ajuste temporal: año a mostrar en gráficos históricos para clientes (cambiar a new Date().getFullYear() para año actual)
  const HISTORICAL_YEAR = 2025;
  const getCurrentYearDates = () => {
    const year = HISTORICAL_YEAR;
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return { startDate, endDate };
  };
  
  const { startDate: defaultStartDate, endDate: defaultEndDate } = getCurrentYearDates();
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
      let todasLasPlantas: Plant[] = [];

      // Admin: obtener todas las plantas para poder cambiar entre ellas en gráficos históricos
      if (userRole === "admin") {
        try {
          const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ALL}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const list = data.plantas || data || [];
            todasLasPlantas = Array.isArray(list) ? list : [];
            console.log(`✅ Admin: todas las plantas cargadas: ${todasLasPlantas.length}`);
            return todasLasPlantas;
          }
        } catch (error) {
          console.error("Error obteniendo todas las plantas (admin):", error);
        }
      }
      
      // 1. Obtener plantas con permisos específicos (usuarios_plantas)
      try {
        const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESSIBLE}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          const plantasEspecificas = data.plantas || [];
          todasLasPlantas.push(...plantasEspecificas);
          console.log(`✅ Plantas con permisos específicos: ${plantasEspecificas.length} plantas`);
        }
      } catch (error) {
        console.error("Error obteniendo plantas con permisos específicos:", error);
      }

      // 2. Obtener plantas de empresas con acceso completo (usuarios_empresas)
      const userId = user?.id || user?._id;
      if (userId && (userRole === "client" || userRole === "user" || userRole === "analista" || userRole === "guest")) {
        try {
          const empresasRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ACCESS_BY_USER(userId)}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (empresasRes.ok) {
            const empresasData = await empresasRes.json();
            const empresas = empresasData.empresas || empresasData || [];
            console.log(`🏢 Empresas con acceso completo encontradas: ${empresas.length}`);
            
            // Para cada empresa con acceso, obtener todas sus plantas
            for (const empresa of empresas) {
              const empresaId = empresa.empresa_id || empresa.id;
              if (!empresaId) continue;
              
              try {
                const plantasEmpresaRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_BY_EMPRESA(empresaId)}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                if (plantasEmpresaRes.ok) {
                  const plantasEmpresaData = await plantasEmpresaRes.json();
                  const plantasEmpresa = plantasEmpresaData.plantas || plantasEmpresaData || [];
                  
                  // Agregar plantas que no estén ya en la lista (evitar duplicados)
                  plantasEmpresa.forEach((planta: any) => {
                    if (!todasLasPlantas.some((p: any) => (p.id || p._id) === (planta.id || planta._id))) {
                      todasLasPlantas.push(planta);
                    }
                  });
                  
                  console.log(`🏭 Plantas de empresa ${empresa.empresa_nombre || empresaId}: ${plantasEmpresa.length} plantas`);
                }
              } catch (error) {
                console.error(`Error obteniendo plantas de empresa ${empresaId}:`, error);
              }
            }
          }
        } catch (error) {
          console.error("Error obteniendo empresas con acceso:", error);
        }
      }
      
      console.log(`✅ Total de plantas accesibles cargadas: ${todasLasPlantas.length} plantas`, todasLasPlantas.map((p: any) => ({ id: p.id || p._id, nombre: p.nombre })));
      return todasLasPlantas;
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
  }, [user, userRole]);

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

  const handleNavigateToHistoricos = () => {
    /* addDebugLog("Históricos clickeado - redirigiendo a dashboard-historicos") */
    router.push("/dashboard-historicos")
  }

  // look repots for client
  const getClientReports = async () => {
    /* addDebugLog("Ver reportes clickeado - redirigiendo a report list") */
    router.push("/dashboard-reportList")
  }

  // Función para manejar la vista del reporte desde el dashboard (obtiene orden de parámetros y sistemas para que /reports muestre la tabla en el orden correcto también para cliente)
  const handleViewReport = async (report: any) => {
    try {
      console.log("👁️ Visualizando reporte desde dashboard:", report);
      
      if (!report.planta_id) {
        console.error("❌ Error: No se encontró planta_id en los datos del reporte");
        alert("Error: No se pueden visualizar reportes sin datos de planta completos");
        return;
      }

      const plantId = report.datos?.plant?.id || report.planta_id;
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
          // Si falla (ej. cliente sin permiso en backend antiguo), seguimos sin orden; /reports usará fallback
        }
      }
      
      const empresaId =
        report?.empresa_id ??
        report?.datos?.empresa_id ??
        report?.datos?.user?.empresa_id ??
        null;

      const reportSelection = {
        user: {
          id: report.datos?.user?.id || report.usuario_id,
          username: report.datos?.user?.username || report.usuario,
          email: report.datos?.user?.email || "",
          puesto: report.datos?.user?.puesto || "client",
          cliente_id: report.datos?.user?.cliente_id || null,
          empresa_id: empresaId
        },
        plant: {
          id: report.datos?.plant?.id || report.planta_id,
          nombre: report.datos?.plant?.nombre || report.plantName,
          dirigido_a: report.datos?.plant?.dirigido_a,
          mensaje_cliente: report.datos?.plant?.mensaje_cliente,
          systemName: report.datos?.plant?.systemName || report.datos?.systemName || report.systemName
        },
        systemName: report.datos?.systemName || report.systemName,
        parameters: report.datos?.parameters || {},
        variablesTolerancia: report.datos?.variablesTolerancia || {},
        mediciones: [],
        fecha: report.datos?.fecha || (report.created_at ? new Date(report.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        comentarios: report.datos?.comentarios || report.observaciones || "",
        generatedDate: report.datos?.generatedDate || report.created_at || new Date().toISOString(),
        cliente_id: report.datos?.user?.cliente_id || null,
        empresa_id: empresaId,
        report_id: report.id || null,
        ...(parameterOrder?.length && { parameterOrder }),
        ...(systemOrder?.length && { systemOrder }),
      };

      console.log("📄 reportSelection reconstruido desde dashboard:", reportSelection);
      console.log("🔍 Validación plant.id:", reportSelection.plant.id);
      
      localStorage.setItem("reportSelection", JSON.stringify(reportSelection));
      router.push("/reports");
      
    } catch (error) {
      console.error("❌ Error al preparar vista del reporte desde dashboard:", error);
      alert("Error al preparar la vista del reporte");
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

        // Obtener plantas accesibles del usuario para filtrar reportes
        let plantasAccesiblesIds: string[] = []
        if (userRole === "client" || userRole === "user" || userRole === "analista" || userRole === "guest") {
          try {
            // 1. Obtener plantas con permisos específicos (usuarios_plantas)
            const plantasRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ACCESSIBLE}`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            if (plantasRes.ok) {
              const plantasData = await plantasRes.json()
              const plantasEspecificas = (plantasData.plantas || []).map((p: any) => p.id || p._id).filter(Boolean)
              plantasAccesiblesIds.push(...plantasEspecificas)
              console.log("🔐 Plantas con permisos específicos:", plantasEspecificas)
            }

            // 2. Obtener empresas con acceso completo (usuarios_empresas)
            const userId = user?.id || user?._id
            if (userId) {
              try {
                const empresasRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.EMPRESAS_ACCESS_BY_USER(userId)}`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                if (empresasRes.ok) {
                  const empresasData = await empresasRes.json()
                  const empresas = empresasData.empresas || empresasData || []
                  console.log("🏢 Empresas con acceso completo:", empresas.map((e: any) => ({ id: e.empresa_id || e.id, nombre: e.empresa_nombre || e.nombre })))
                  
                  // 3. Para cada empresa con acceso, obtener todas sus plantas
                  const empresasIds = empresas.map((e: any) => e.empresa_id || e.id).filter(Boolean)
                  
                  for (const empresaId of empresasIds) {
                    try {
                      const plantasEmpresaRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_BY_EMPRESA(empresaId)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      })
                      if (plantasEmpresaRes.ok) {
                        const plantasEmpresaData = await plantasEmpresaRes.json()
                        const plantasEmpresa = plantasEmpresaData.plantas || plantasEmpresaData || []
                        const plantasIds = plantasEmpresa.map((p: any) => p.id || p._id).filter(Boolean)
                        plantasAccesiblesIds.push(...plantasIds)
                        console.log(`🏭 Plantas de empresa ${empresaId}:`, plantasIds)
                      }
                    } catch (error) {
                      console.error(`Error obteniendo plantas de empresa ${empresaId}:`, error)
                    }
                  }
                }
              } catch (error) {
                console.error("Error obteniendo empresas con acceso:", error)
              }
            }

            // Eliminar duplicados
            plantasAccesiblesIds = [...new Set(plantasAccesiblesIds)]
            console.log("✅ Total de plantas accesibles (específicas + empresas):", plantasAccesiblesIds)
          } catch (error) {
            console.error("Error obteniendo plantas accesibles:", error)
          }
        }

        // Pedir todos los reportes del año para la sección de reportes gráficos (rango startDate–endDate).
        const reportesLimit = 500
        const params = new URLSearchParams()
        params.set("limit", String(reportesLimit))
        params.set("startDate", startDate)
        params.set("endDate", endDate)
        const response = await fetch(
          `${API_BASE_URL}${API_ENDPOINTS.REPORTS}?${params.toString()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        
        let reportesData: any[] = []
        
        if (response.ok) {
          const data = await response.json()
          //console.log('📊 Respuesta del backend:', data)
          reportesData = Array.isArray(data.reportes) ? data.reportes : []
          //console.log('📋 Reportes recibidos:', reportesData.length, reportesData)
        } else {
          console.error("Error en la respuesta de reportes:", response.status, response.statusText)
        }
        
        // Convertir formato de reportes para el dashboard (extraer datos del JSONB)
        let formattedReports = reportesData.map((report: any) => {
          // Extraer datos del JSONB
          const datosJsonb = report.datos || {};
          
          console.log("🔍 Dashboard - Procesando reporte:", {
            id: report.id,
            titulo: report.titulo,
            datosJsonb: datosJsonb,
            plantName_from_jsonb: datosJsonb.plant?.nombre,
            systemName_from_jsonb: datosJsonb.systemName,
            generatedDate_from_jsonb: datosJsonb.generatedDate,
            user_from_jsonb: datosJsonb.user?.username,
            planta_id: report.planta_id
          });
          
          return {
            id: report.id?.toString() || report.id,
            title: report.titulo || report.nombre || `Reporte ${report.id}`,
            plantName: datosJsonb.plant?.nombre || report.planta || report.plantName || "Planta no especificada",
            systemName: datosJsonb.systemName || report.sistema || report.systemName || "Sistema no especificado",
            status: report.estado || report.status || "completed",
            created_at: datosJsonb.generatedDate || report.fechaGeneracion || report.fecha_creacion || report.created_at || new Date().toISOString(),
            usuario_id: report.usuario_id || user.id,
            planta_id: report.planta_id || datosJsonb.plant?.id || "planta-unknown",
            proceso_id: report.proceso_id || "sistema-unknown",
            estatus: typeof report.estatus === "boolean" ? report.estatus : false,
            datos: {
              ...(report.reportSelection || report.datos || {}),
              // Asegurar que la fecha del reporte esté disponible en datos.fecha
              fecha: datosJsonb.fecha || report.fecha || (report.reportSelection?.fecha) || (report.datos?.fecha)
            },
            observaciones: datosJsonb.comentarios || report.comentarios || report.observaciones || "",
            usuario: datosJsonb.user?.username || report.usuario || user.username,
            puesto: datosJsonb.user?.puesto || report.puesto || user.puesto
          };
        })
        
        // Filtrar reportes por permisos si el usuario no es admin
        if ((userRole === "client" || userRole === "user" || userRole === "analista") && plantasAccesiblesIds.length > 0) {
          formattedReports = formattedReports.filter((report: any) => {
            const reportPlantaId = report.planta_id
            const tieneAcceso = plantasAccesiblesIds.includes(reportPlantaId)
            
            if (!tieneAcceso) {
              console.log(`🚫 Reporte ${report.id} filtrado - Planta ${reportPlantaId} no accesible`)
            }
            
            return tieneAcceso
          })
          console.log(`✅ Reportes filtrados: ${formattedReports.length} de ${reportesData.length} reportes mostrados`)
        } else if ((userRole === "client" || userRole === "user" || userRole === "analista" || userRole === "guest") && plantasAccesiblesIds.length === 0) {
          // Si no tiene plantas accesibles, no mostrar ningún reporte
          console.log("⚠️ Usuario no tiene plantas accesibles, no se mostrarán reportes")
          formattedReports = []
        }
        
        // Ordenar por fecha del reporte (columna fecha de la tabla reportes), no por fecha de subida
        const getReportDate = (r: any) => {
          const raw = r.datos?.fecha ?? r.fecha
          if (!raw) return 0
          const s = typeof raw === "string" ? raw.split("T")[0] : ""
          return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s).getTime() : new Date(raw).getTime()
        }
        const sortedReports = formattedReports.sort((a, b) => {
          const dateA = getReportDate(a)
          const dateB = getReportDate(b)
          return dateB - dateA // Orden descendente (más reciente primero)
        })
        
        setReports(sortedReports)
        
        addDebugLog(`Reportes cargados: ${sortedReports.length} reportes (rol: ${userRole})`)
        
      } catch (error) {
        console.error("Error cargando reportes:", error)
        // En caso de error, no mostrar reportes
        setReports([])
      }
    }

    fetchResumen();
    fetchReportes();
  }, [user, userRole, startDate, endDate]);

  // Asegurar que las fechas coincidan con HISTORICAL_YEAR (temporal: 2025)
  useEffect(() => {
    const { startDate: yearStart, endDate: yearEnd } = getCurrentYearDates();
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    if (startYear !== HISTORICAL_YEAR || endYear !== HISTORICAL_YEAR) {
      setStartDate(yearStart);
      setEndDate(yearEnd);
    }
  }, []);

  // Datos históricos desde reportes.datos (JSON) en lugar de tabla mediciones
  useEffect(() => {
    if (!plants.length) return;

    const buildHistoricalDataFromReportes = () => {
      setHistoricalDataLoading(true);
      const allData: Record<string, Record<string, any[]>> = {};
      const plantIds = new Set(plants.map((p) => p.id));

      const getReportDate = (r: any) => {
        const raw = r.datos?.fecha ?? r.fecha;
        if (!raw) return 0;
        const s = typeof raw === "string" ? raw.split("T")[0] : "";
        return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s).getTime() : new Date(raw).getTime();
      };

      // Para admin/user/analista: usar solo los últimos 10 reportes por planta (por fecha del reporte)
      // Para cliente: usar todos los reportes del rango de fechas
      const REPORTS_PER_PLANT_LIMIT = 10;
      let reportsToUse = reports;
      if (userRole !== "client") {
        const byPlant = new Map<string, any[]>();
        for (const r of reports) {
          const plantId = r.planta_id || r.datos?.plant?.id;
          if (!plantId || !plantIds.has(plantId)) continue;
          if (!byPlant.has(plantId)) byPlant.set(plantId, []);
          byPlant.get(plantId)!.push(r);
        }
        reportsToUse = [];
        byPlant.forEach((list) => {
          const sorted = [...list].sort((a, b) => getReportDate(b) - getReportDate(a));
          reportsToUse.push(...sorted.slice(0, REPORTS_PER_PLANT_LIMIT));
        });
      }

      try {
        // Inicializar estructura por sistema y parámetro
        for (const plant of plants) {
          if (!plant.systems) continue;
          for (const system of plant.systems) {
            if (!allData[system.id]) allData[system.id] = {};
            for (const param of system.parameters) {
              allData[system.id][param.id] = [];
            }
          }
        }

        // Construir puntos desde reportes: cada reporte tiene datos.parameters[systemName][paramName] = { valor, unidad } y datos.fecha
        for (const report of reportsToUse) {
          const datos = report.datos || (report as any).reportSelection || {};
          const fechaReporte = datos.fecha || (report as any).created_at || (report as any).fecha;
          if (!fechaReporte) continue;

          const fechaStr = typeof fechaReporte === "string"
            ? fechaReporte.split("T")[0]
            : new Date(fechaReporte).toISOString().split("T")[0];
          const fechaDate = new Date(fechaStr);
          if (isNaN(fechaDate.getTime())) continue;

          // Para cliente: filtrar por rango de fechas; para otros roles ya se limitó por últimos 10 por planta
          if (userRole === "client") {
            const start = new Date(startDate + "T00:00:00");
            const end = new Date(endDate + "T23:59:59");
            const fechaOnly = new Date(fechaDate.getFullYear(), fechaDate.getMonth(), fechaDate.getDate());
            const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            if (fechaOnly < startOnly || fechaOnly > endOnly) continue;
          }

          const reportPlantaId = report.planta_id || datos?.plant?.id;
          if (!reportPlantaId || !plantIds.has(reportPlantaId)) continue;

          const parametersBySystem = datos.parameters || {};
          const normalizeName = (n: string) => (n || "").trim().toLowerCase();
          const normalizeParamName = (name: string) => {
            const n = normalizeName(name);
            if (n === "resisitividad") return "resistividad";
            return n;
          };
          for (const systemName of Object.keys(parametersBySystem)) {
            const paramsByName = parametersBySystem[systemName] || {};
            const plant = plants.find((p) => p.id === reportPlantaId);
            const system = plant?.systems?.find(
              (s) => normalizeName(s.name) === normalizeName(systemName)
            );
            if (!system) continue;

            for (const paramName of Object.keys(paramsByName)) {
              const paramData = paramsByName[paramName];
              const valor = paramData?.valor ?? paramData?.value;
              if (valor === undefined || valor === null || Number.isNaN(Number(valor))) continue;

              const param = system.parameters?.find(
                (p) => normalizeParamName(p.name) === normalizeParamName(paramName)
              );
              if (!param || !allData[system.id]) continue;

              if (!allData[system.id][param.id]) allData[system.id][param.id] = [];
              allData[system.id][param.id].push({
                timestamp: fechaReporte,
                value: Number(valor),
              });
            }
          }
        }

        // Ordenar cada serie por timestamp
        for (const systemId of Object.keys(allData)) {
          for (const paramId of Object.keys(allData[systemId])) {
            allData[systemId][paramId].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          }
        }

        setHistoricalData(allData);
        const total = Object.values(allData).reduce((sum, systemMap) => {
          const systemTotal = Object.values(systemMap || {}).reduce(
            (s, arr: any[]) => s + (arr?.length || 0),
            0
          );
          return sum + systemTotal;
        }, 0);
        setTotalHistoricos(total);
        console.log(
          `📊 Datos históricos desde reportes: ${total} puntos (rango ${startDate} - ${endDate})`
        );
      } catch (error) {
        console.error("❌ Error construyendo datos históricos desde reportes:", error);
      } finally {
        setHistoricalDataLoading(false);
      }
    };

    buildHistoricalDataFromReportes();
  }, [plants, startDate, endDate, reports, userRole]);

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
      <Navbar role={userRole as "admin" | "user" | "client" | "guest" | "analista"} />

      {/* Main Content */}
      <div className="container py-4">
        {/* Status Banner */}
        {/* Welcome Section */}
        <div className="alert alert-info" role="alert">
          <h1 className="h3 mb-0">Bienvenido,  <strong>{user.username}</strong></h1>
          <p className="text-muted">Panel de control</p>
        </div>


        {/* Stats Cards */}
        <StatsCards dashboardResumen={dashboardResumen} userRole={userRole as "admin" | "user" | "client" | "guest" | "analista"} totalHistoricos={totalHistoricos} />

        {/* Quick Actions */}
        {userRole === "admin" && (
          <AdminQuickActions
            handleNewReport={handleNewReport}
            handleNewVariable={handleNewVariable}
            handleNewSystem={handleNewSystem}
            handleNewParameter={handleNewParameters}
            handleNavigateToHistoricos={handleNavigateToHistoricos}
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
            reports={reports.slice(0, 20)}
            dataLoading={dataLoading}
            getStatusColor={getStatusColor}
            onTableClick={getClientReports}
            onDebugLog={addDebugLog}
            onViewReport={handleViewReport}
            userRole={userRole as "admin" | "user" | "client" | "guest" | "analista"}
          />
        </div>

        {/* System Charts - Historical Data: clientes ven todos los reportes del rango; admin/user/analista ven últimos 10 por planta */}
        {(userRole === "client" || userRole === "admin" || userRole === "user" || userRole === "analista") && (
          <div className="row mb-4">
            <ChartsDashboard
              plants={plants}
              historicalData={historicalData}
              getStatusColor={getStatusColor}
              startDate={startDate}
              endDate={endDate}
              loading={historicalDataLoading}
              reportCount={reports.length}
              yearLabel={HISTORICAL_YEAR}
              last10PerPlant={userRole !== "client"}
            />
          </div>
        )}

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
