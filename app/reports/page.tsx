"use client"

import ProtectedRoute from "@/components/ProtectedRoute"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import Navbar from "@/components/Navbar"
import { SensorTimeSeriesChart, type ChartExportRef } from "@/components/SensorTimeSeriesChart"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import ScrollArrow from "@/app/dashboard-reportmanager/components/ScrollArrow"


interface SystemData {
  [systemName: string]: Array<{
    name: string
    value: string
    unit: string
    checked: boolean
  }>
}

interface RangeLimits {
  [key: string]: {
    fuera: string
    limite: string
    bien: string
  }
}



// Estructura para la fecha en formato día, mes (texto), año
interface FormattedDate {
  day: number;
  month: string;
  year: number;
}

// Interfaz para los parámetros del sistema
interface SystemParameter {
  id: string;
  nombre: string;
  unidad: string;
  valor: number;
  fecha: string;
  comentarios?: string;
  checked: boolean;
}

// Interfaz para el usuario
interface User {
  id: string;
  username: string;
  email: string;
  puesto: string;
  planta_id: string;
  empresa_id?: string | null;
}

// Interfaz para la planta
interface Plant {
  id: string;
  nombre: string;
  dirigido_a?: string;
  mensaje_cliente?: string;
}

// Interfaz para los parámetros en el reporte
interface ReportParameter {
  id: string;
  nombre: string;
  unidad: string;
  limite_min: number | null;
  limite_max: number | null;
  bien_min: number | null;
  bien_max: number | null;
  usar_limite_min: boolean;
  usar_limite_max: boolean;
}

// Interfaz principal para reportSelection
interface ReportSelection {
  fecha: string;
  comentarios: string;
  user: User;
  plant: Plant;
  systemName: string;
  generatedDate: string;
  empresa_id?: string | null;
  report_id?: string | null; // ID único del reporte (si viene de reportes pendientes)
  parameters: {
    [systemName: string]: {
      [parameterName: string]: {
        valor?: number | null;
        unidad: string;
        valorOriginal?: number;
        formulaAplicada?: string;
        calculado?: boolean;
      };
    };
  };
  variablesTolerancia: {
    [parameterId: string]: {
      nombre: string;
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
  chartStartDate?: string; // Fecha inicio para gráficos
  chartEndDate?: string; // Fecha fin para gráficos
}

export default function Reporte() {
  const router = useRouter()
  const [reportNotes, setReportNotes] = useState<{ [key: string]: string }>({})
  const [currentDate, setCurrentDate] = useState("")
  const [isEditing, setIsEditing] = useState(true)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  const [reportSelection, setReportSelection] = useState<ReportSelection | null>(null)
  
  // Estados de carga para los botones
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  
  // Estado para comentarios por parámetro/variable
  const [parameterComments, setParameterComments] = useState<{ [variableName: string]: string }>({})
  
  // Orden de parámetros por planta (para mostrar tablas en orden configurado)
  const [plantOrderVariables, setPlantOrderVariables] = useState<{ id: string; nombre: string; orden: number }[]>([])
  
  // Orden de sistemas de la planta (mismo que dashboard-reportmanager: por campo orden)
  const [plantSystemsOrder, setPlantSystemsOrder] = useState<{ id: string; nombre: string; orden?: number }[]>([])
  
  // Estado para controlar si la tabla se incluye en el PDF
  const [includeTableInPDF, setIncludeTableInPDF] = useState<boolean>(false)
  
  // Estado para gráficos
  const [selectedVariableForChart, setSelectedVariableForChart] = useState<string>("")
  
  // Refs para exportar gráficos directamente desde los componentes
  const chartRefs = useRef<Map<string, ChartExportRef>>(new Map())
  
  // Estados para datos históricos por sistema
  interface HistoricalMeasurement {
    fecha: string
    variable_id: string
    variable_nombre: string
    valor: number
    unidad: string
    sistema?: string
    comentarios?: string
    proceso_id: string
  }
  
  interface HistoricalDataByDate {
    [fecha: string]: {
      [variableId: string]: {
        valor: number
        unidad: string
        comentarios?: string
      }
    } & {
      comentarios_globales?: string
    }
  }
  
  const [historicalDataBySystem, setHistoricalDataBySystem] = useState<{ [systemName: string]: HistoricalDataByDate }>({})
  const [historicalLoading, setHistoricalLoading] = useState<{ [systemName: string]: boolean }>({})
  const [historicalError, setHistoricalError] = useState<{ [systemName: string]: string | null }>({})
  const [systemParameters, setSystemParameters] = useState<{ [systemName: string]: Array<{ id: string; nombre: string; unidad: string }> }>({})
  
  // Datos para gráficos desde columna datos de reportes (no tabla mediciones)
  const [chartDataFromReportes, setChartDataFromReportes] = useState<Record<string, Array<{ fecha: string; sistema: string; valor: number }>>>({})
  
  // Función para obtener o crear ref para un gráfico
  const getChartRef = (variableName: string): ChartExportRef | null => {
    return chartRefs.current.get(variableName) || null
  }
  
  // Función para manejar cambios en comentarios de parámetros
  const handleParameterCommentChange = (variableName: string, comment: string) => {
    // Los clientes no pueden editar comentarios
    if (userRole === "client") return
    
    const newComments = {
      ...parameterComments,
      [variableName]: comment
    }
    setParameterComments(newComments)
    
    // Guardar en localStorage para persistencia
    if (reportSelection) {
      const updatedReportSelection = {
        ...reportSelection,
        parameterComments: newComments
      }
      localStorage.setItem("reportSelection", JSON.stringify(updatedReportSelection))
      setReportSelection(updatedReportSelection)
    }
  }

  const [rangeLimits] = useState<RangeLimits>({
    pH: {
      fuera: "> 8",
      limite: "7.5 - 8",
      bien: "7",
    },
    Conductividad: {
      fuera: "> 500",
      limite: "300 - 500",
      bien: "< 300",
    },
    "Dureza total": {
      fuera: "> 200",
      limite: "100 - 200",
      bien: "< 100",
    },
  })

  // Evalúa condiciones de color de celda por parámetro
  const evalCondition = (value: number, condition: string): boolean => {
    if (condition.includes(">")) return value > Number.parseFloat(condition.replace(">", ""))
    if (condition.includes("<")) return value < Number.parseFloat(condition.replace("<", ""))
    if (condition.includes("-")) {
      const [min, max] = condition.split("-").map((n) => Number.parseFloat(n.trim()))
      return value >= min && value <= max
    }
    return value === Number.parseFloat(condition)
  }

  useEffect(() => {
    // Verificar si las imágenes existen
    setImagesLoaded(true);

    // Asegurar que solo se ejecute en el cliente
    if (typeof window === 'undefined') return;

    // Obtener usuario y rol
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        const role = userData.puesto || "user"
        setUserRole(role)
        // Si es cliente, deshabilitar edición desde el inicio
        if (role === "client") {
          setIsEditing(false)
        }
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    // Obtener reportSelection
    try {
    const reportSelectionRaw = localStorage.getItem("reportSelection");
    const parsedReportSelection = reportSelectionRaw ? JSON.parse(reportSelectionRaw) : null;
    setReportSelection(parsedReportSelection);
    
    // Cargar comentarios guardados si existen
    // Primero intentar cargar desde parameterComments (formato antiguo)
    if (parsedReportSelection?.parameterComments) {
      setParameterComments(parsedReportSelection.parameterComments);
    }
    
    // Si hay comentarios en formato JSON nuevo, parsearlos y extraer comentarios globales y por parámetro
    if (parsedReportSelection?.comentarios) {
      try {
        // Intentar parsear como JSON
        const comentariosParsed = JSON.parse(parsedReportSelection.comentarios);
        if (typeof comentariosParsed === 'object' && comentariosParsed !== null) {
          // Es un objeto JSON con el nuevo formato
          const comentariosPorParametro: { [key: string]: string } = {};
          
          // Extraer comentario global si existe
          if (comentariosParsed["global"]) {
            // Actualizar reportSelection con el comentario global
            const updatedReportSelection = {
              ...parsedReportSelection,
              comentarios: comentariosParsed["global"]
            };
            setReportSelection(updatedReportSelection);
          }
          
          // Extraer comentarios por parámetro (todas las claves excepto "global")
          Object.entries(comentariosParsed).forEach(([key, value]) => {
            if (key !== "global" && typeof value === "string" && value.trim() !== "") {
              comentariosPorParametro[key] = value;
            }
          });
          
          // Actualizar parameterComments con los comentarios por parámetro
          if (Object.keys(comentariosPorParametro).length > 0) {
            setParameterComments(comentariosPorParametro);
          }
        }
      } catch (e) {
        // Si no es JSON válido, es un string simple (formato antiguo)
        // No hacer nada, ya está cargado en reportSelection.comentarios
      }
    }
    
    // FALLBACK: Si no hay tolerancias en localStorage, obtenerlas del backend usando variable_proceso_id
    if (parsedReportSelection && (!parsedReportSelection.variablesTolerancia || Object.keys(parsedReportSelection.variablesTolerancia).length === 0)) {
      console.warn("⚠️ [Reports] No se encontraron tolerancias en localStorage, obteniendo desde el backend...");
      
      // Función async para obtener tolerancias
      const fetchTolerancesFromBackend = async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
        const plantName = parsedReportSelection?.plant?.nombre;
        
        if (!token || !plantName || !parsedReportSelection.parameters) {
          console.warn("⚠️ [Reports] No se pueden obtener tolerancias: faltan token, plantName o parameters");
          return;
        }
        
        try {
          // Obtener sistemas de la planta
          const systemsResponse = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT_NAME(plantName)}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          
          if (!systemsResponse.ok) {
            console.error("❌ [Reports] Error obteniendo sistemas de la planta");
            return;
          }
          
          const systemsData = await systemsResponse.json();
          const systemsList = systemsData.procesos || systemsData || [];
          
          const fetchedTolerances: any = {};
          
          // Para cada sistema en los parámetros
          for (const systemName of Object.keys(parsedReportSelection.parameters)) {
            const systemInfo = systemsList.find((sys: any) => sys.nombre === systemName);
            if (!systemInfo) continue;
            
            // Obtener variables del sistema (incluye variable_proceso_id)
            const varsResponse = await fetch(
              `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(systemInfo.id)}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (!varsResponse.ok) {
              console.warn(`⚠️ [Reports] Error obteniendo variables para sistema ${systemName}`);
              continue;
            }
            
            const varsData = await varsResponse.json();
            const variablesList = varsData.variables || varsData || [];
            
            // Para cada variable en los parámetros, obtener su tolerancia usando TOLERANCES_FILTERS
            for (const variableName of Object.keys(parsedReportSelection.parameters[systemName])) {
              const variable = variablesList.find((v: any) => v.nombre === variableName);
              if (!variable || !variable.id) continue;
              
              // Usar TOLERANCES_FILTERS con variable_id y proceso_id
              const queryParams = new URLSearchParams({
                variable_id: variable.id,
                proceso_id: systemInfo.id,
              });
              
              try {
                const toleranceResponse = await fetch(
                  `${API_BASE_URL}${API_ENDPOINTS.TOLERANCES_FILTERS}?${queryParams}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                
                if (toleranceResponse.ok) {
                  const toleranceData = await toleranceResponse.json();
                  // El endpoint puede devolver { tolerancias: [...] } o el objeto directo
                  const tolerance = Array.isArray(toleranceData.tolerancias) 
                    ? toleranceData.tolerancias[0] 
                    : (toleranceData.tolerancia || toleranceData);
                  
                  if (tolerance) {
                    const toleranceDataFormatted = {
                      nombre: variableName,
                      limite_min: tolerance.limite_min ?? null,
                      limite_max: tolerance.limite_max ?? null,
                      bien_min: tolerance.bien_min ?? null,
                      bien_max: tolerance.bien_max ?? null,
                      usar_limite_min: !!tolerance.usar_limite_min,
                      usar_limite_max: !!tolerance.usar_limite_max,
                    };
                    
                    fetchedTolerances[variable.id] = toleranceDataFormatted;
                    fetchedTolerances[variableName] = toleranceDataFormatted;
                  }
                } else if (toleranceResponse.status === 404 || toleranceResponse.status === 204) {
                  // No hay tolerancia para esta variable, continuar
                }
              } catch (error) {
                console.error(`❌ [Reports] Error obteniendo tolerancia para ${variableName}:`, error);
              }
            }
          }
          
          if (Object.keys(fetchedTolerances).length > 0) {
            const updatedReportSelection = {
              ...parsedReportSelection,
              variablesTolerancia: fetchedTolerances
            };
            setReportSelection(updatedReportSelection);
            localStorage.setItem("reportSelection", JSON.stringify(updatedReportSelection));
          } else {
            console.warn("⚠️ [Reports] No se obtuvieron tolerancias del backend");
          }
        } catch (error) {
          console.error("❌ [Reports] Error obteniendo tolerancias del backend:", error);
        }
      };
      
      // Ejecutar la función async
      fetchTolerancesFromBackend();
    }
    } catch (error) {
      console.error("Error parsing report selection:", error)
    }

    // Obtener fecha actual (solo en cliente para evitar diferencias de hidratación)
    const today = new Date()
    const formattedDate = today.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    setCurrentDate(formattedDate)
  }, []);

  // Cargar orden de variables de la planta cuando hay reporte con planta
  useEffect(() => {
    const plantId = reportSelection?.plant?.id
    if (!plantId) {
      setPlantOrderVariables([])
      return
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null
    if (!token) return
    let cancelled = false
    fetch(`${API_BASE_URL}${API_ENDPOINTS.PLANTS_ORDEN_VARIABLES(plantId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.ok && Array.isArray(data.variables)) {
          setPlantOrderVariables(data.variables)
        } else {
          setPlantOrderVariables([])
        }
      })
      .catch(() => { if (!cancelled) setPlantOrderVariables([]) })
    return () => { cancelled = true }
  }, [reportSelection?.plant?.id])

  // Cargar sistemas de la planta en el mismo orden que reportmanager (por orden)
  useEffect(() => {
    const plantId = reportSelection?.plant?.id
    if (!plantId) {
      setPlantSystemsOrder([])
      return
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null
    if (!token) return
    let cancelled = false
    fetch(`${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT(plantId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        const procesos = data.procesos || data || []
        const sorted = [...procesos].sort((a: { orden?: number }, b: { orden?: number }) => {
          const oa = a.orden ?? 999999
          const ob = b.orden ?? 999999
          return oa - ob
        })
        setPlantSystemsOrder(sorted)
      })
      .catch(() => { if (!cancelled) setPlantSystemsOrder([]) })
    return () => { cancelled = true }
  }, [reportSelection?.plant?.id])

  // Nombres de sistemas en el mismo orden que reportmanager (solo los que tienen datos en el reporte)
  const orderedSystemNames = (() => {
    const params = reportSelection?.parameters
    if (!params) return []
    const keys = Object.keys(params)
    if (plantSystemsOrder.length === 0) return keys
    const namesFromApi = plantSystemsOrder.map((s) => s.nombre)
    const ordered = namesFromApi.filter((n) => params[n] !== undefined)
    const rest = keys.filter((n) => !namesFromApi.includes(n))
    return [...ordered, ...rest]
  })()

  // Formatear fecha sin problemas de zona horaria (para strings YYYY-MM-DD)
  const formatFechaLocal = (fechaStr: string | undefined | null): string => {
    if (!fechaStr) return "";
    const trimmed = String(fechaStr).trim();
    if (!trimmed) return "";
    // Si es formato YYYY-MM-DD, parsear manualmente para evitar zona horaria
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
    // Fallback: usar Date normal si no es formato esperado
    return new Date(trimmed).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  const handleNoteChange = (key: string, value: string) => {
    // Los clientes no pueden editar notas
    if (userRole === "client") return
    setReportNotes((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  // Actualizar valor de un parámetro en la tabla de datos (editables)
  const handleParameterValueChange = (systemName: string, variableName: string, value: string) => {
    if (!reportSelection?.parameters || userRole === "client") return
    const trimmed = value.trim()
    const numVal = trimmed === "" || trimmed === "—" ? null : Number(trimmed)
    const valorFinal = numVal !== null && !Number.isNaN(numVal) ? numVal : null

    const updatedParameters = { ...reportSelection.parameters }
    if (!updatedParameters[systemName]) updatedParameters[systemName] = {}
    const current = updatedParameters[systemName][variableName]
    updatedParameters[systemName] = {
      ...updatedParameters[systemName],
      [variableName]: {
        ...(current || {}),
        valor: valorFinal ?? current?.valor ?? null,
        unidad: current?.unidad ?? "",
      },
    }
    const updatedReportSelection = { ...reportSelection, parameters: updatedParameters }
    setReportSelection(updatedReportSelection)
    localStorage.setItem("reportSelection", JSON.stringify(updatedReportSelection))
  }

  const enableEditing = () => {
    // Los clientes no pueden editar
    if (userRole === "client") return
    setIsEditing(true)
  }

  const generatePDF = async () => {
    try {
      const doc = new jsPDF()

      // Configuración inicial
      doc.setFontSize(20)
      doc.text("SERVICIO CRYOINFRA", 105, 20, { align: "center" })

      doc.setFontSize(12)
      doc.text(`Fecha: ${currentDate}`, 20, 35)
      doc.text(`Dirigido a: ${reportNotes["dirigido"] || reportSelection?.plant?.dirigido_a || "ING. "}`, 20, 45)
      doc.text(`Asunto: ${reportNotes["asunto"] || reportSelection?.plant?.mensaje_cliente || "REPORTE DE ANÁLISIS PARA TODOS LOS SISTEMAS"}`, 20, 55)
      doc.text(`Sistema Evaluado: ${reportNotes["sistema"] || (reportSelection ? reportSelection.systemName : "Todos los sistemas") || "Todos los sistemas"}`, 20, 65)
      doc.text(`Ubicación: ${reportNotes["ubicacion"] || "San Luis Potosí, S.L.P."}`, 20, 75)
      
      // Planta (valor del sistema) y fecha
      const plantaValue = reportSelection?.systemName ?? reportSelection?.plant?.nombre ?? "";
      if (plantaValue) {
        doc.text(`Planta: ${plantaValue}`, 20, 85)
      }
      doc.text(`Fecha de generación: ${(reportSelection?.generatedDate ? new Date(reportSelection.generatedDate) : new Date()).toLocaleString('es-ES')}`, 20, 95)

      let currentY = 105

      // Leyenda de colores
      doc.setFontSize(14)
      doc.text("Leyenda de colores", 20, currentY)
      currentY += 10

      const legendData = [
        ["Estado", "Descripción"],
        ["Fuera", "FUERA DE RANGO"],
        ["Límite", "CERCA DE LÍMITE RECOMENDADO"],
        ["Bien", "DENTRO DE RANGO"],
      ]
      autoTable(doc, {
        head: [legendData[0]],
        body: legendData.slice(1),
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 20, right: 20 },
      })

      currentY = (doc as any).lastAutoTable.finalY + 20

      // Tabla comparativa por parámetro
      doc.setFontSize(14)
      doc.text("Análisis Comparativo por Parámetro", 20, currentY)
      currentY += 10

      // Crear tabla comparativa (orden según planta)
      const allParams = new Set<string>();
      Object.values(reportSelection?.parameters || {}).forEach((systemData: any) => {
        Object.keys(systemData).forEach(variable => allParams.add(variable));
      });
      const orderedParamNames = plantOrderVariables.length > 0
        ? [
            ...plantOrderVariables.map((v) => v.nombre).filter((n) => allParams.has(n)),
            ...Array.from(allParams).filter((n) => !plantOrderVariables.some((v) => v.nombre === n)),
          ]
        : Array.from(allParams);

      const systemNames = orderedSystemNames.length > 0 ? orderedSystemNames : Object.keys(reportSelection?.parameters || {});
      const tableHeaders = ["Parámetro", ...systemNames];
      const tableData = orderedParamNames.map((paramName: string) => {
        const row: string[] = [paramName];
        systemNames.forEach((systemName: string) => {
          const systemData = reportSelection?.parameters?.[systemName];
          const paramData = systemData?.[paramName];
          const value = paramData ? `${paramData.valor} ${paramData.unidad}` : "—";
          row.push(value);
        });
        
        return row;
      });
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData as string[][],
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [52, 58, 64] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10 },
      });

      currentY = ((doc as any).lastAutoTable.finalY as number) + 20;

      // Datos detallados por sistema (mismo orden que reportmanager)
      const pdfSystemNames = orderedSystemNames.length > 0 ? orderedSystemNames : Object.keys(reportSelection?.parameters || {});
      pdfSystemNames.forEach((systemName: string) => {
        const parameters = reportSelection?.parameters?.[systemName];
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.text(systemName, 20, currentY);
        currentY += 10;

        const systemTableHeaders = ["Parámetro", "Valor", "Unidad"];
        const systemTableData = Object.entries(parameters || {}).map(([paramName, paramData]: [string, any]) => [
          paramName, 
          paramData?.valor || "N/A", 
          paramData?.unidad || ""
        ]);
        autoTable(doc, {
          head: [systemTableHeaders],
          body: systemTableData as string[][],
          startY: currentY,
          theme: "striped",
          headStyles: { fillColor: [40, 167, 69] },
          margin: { left: 20, right: 20 },
        });

        currentY = ((doc as any).lastAutoTable.finalY as number) + 15;

        // Agregar notas si existen
        const systemNotes = reportNotes[systemName];
        if (systemNotes && systemNotes.trim()) {
          doc.setFontSize(10);
          doc.text("Notas:", 20, currentY);
          const noteLines = doc.splitTextToSize(systemNotes, 170);
          doc.text(noteLines, 20, currentY + 5);
          currentY += noteLines.length * 4 + 10;
        }
      });

      // Guardar el PDF
      const fileName = `Reporte_${currentDate.replace(/\s/g, "_").replace(/,/g, "")}.pdf`
      doc.save(fileName)
      alert("PDF generado exitosamente!")
    } catch (error) {
      console.error("Error detallado generando PDF:", error)
      if (error instanceof Error) {
        alert(`Error al generar el PDF: ${error.message}`)
      } else {
        alert(`Error al generar el PDF: ${String(error)}`)
      }
    }
  }

  const getCellBackgroundColor = (paramName: string, value: string): string => {
    const limitKey = Object.keys(rangeLimits).find((key) => paramName.includes(key))
    const limits = limitKey ? rangeLimits[limitKey] : undefined
    const val = Number.parseFloat(value)

    if (!limits || isNaN(val)) return ""

    if (limits.fuera && evalCondition(val, limits.fuera)) return "#FFC6CE"
    if (limits.limite && evalCondition(val, limits.limite)) return "#FFEB9C"
    if (limits.bien && evalCondition(val, limits.bien)) return "#C5EECE"

    return ""
  }

  // Función para guardar el reporte en el sistema
  const handleSaveReport = async () => {
    if (isSaving) return // Prevenir múltiples clics
    
    setIsSaving(true)
    try {
      // Validar que tenemos datos del reporte
      if (!reportSelection) {
        alert("No hay datos de reporte disponibles")
        return
      }

      // Obtener token de autenticación
      const token = localStorage.getItem("Organomex_token")
      if (!token) {
        alert("No hay token de autenticación")
        return
      }

      // Validar campos críticos antes de enviar
      if (!reportSelection.plant?.id) {
        alert("Error: No se encontró el ID de la planta")
        return
      }
      
      if (!reportSelection.user?.id) {
        alert("Error: No se encontró el ID del usuario")
        return
      }

      const empresaId =
        reportSelection.empresa_id ??
        reportSelection.user?.empresa_id ??
        null

      if (!empresaId) {
        alert("Error: No se encontró el ID de la empresa (empresa_id)")
        return
      }

      // Nota: `proceso_id` ya NO es obligatorio para guardar el reporte.

      // Combinar comentarios globales y por parámetro en un solo objeto JSON
      // Formato: { "global": "...", "pH": "...", "Conductividad": "...", ... }
      // Solo incluir parámetros que tengan comentarios no vacíos
      const comentariosCombinados: Record<string, string> = {};
      
      // Agregar comentario global si existe y no está vacío
      const comentarioGlobal = reportSelection.comentarios?.trim() || "";
      if (comentarioGlobal) {
        comentariosCombinados["global"] = comentarioGlobal;
      }
      
      // Agregar comentarios por parámetro si existen y no están vacíos
      if (parameterComments && Object.keys(parameterComments).length > 0) {
        Object.entries(parameterComments).forEach(([paramName, comment]) => {
          if (comment && comment.trim() !== "") {
            comentariosCombinados[paramName] = comment.trim();
          }
        });
      }

      // Preparar el reportSelection completo para enviar
      const reportDataToSend = {
        ...reportSelection,
        // Asegurar que tenemos todos los campos necesarios
        plant: {
          id: reportSelection.plant?.id,
          nombre: reportSelection.plant?.nombre,
          systemName: reportSelection.systemName,
          mensaje_cliente: reportSelection.plant?.mensaje_cliente,
          dirigido_a: reportSelection.plant?.dirigido_a
        },
        parameters: reportSelection.parameters || {},
        // Comentarios combinados en formato JSON (reemplaza comentarios y parameterComments)
        comentarios: JSON.stringify(comentariosCombinados),
        fecha: reportSelection.fecha || new Date().toISOString().split('T')[0],
        generatedDate: reportSelection.generatedDate || new Date().toISOString(),
        empresa_id: empresaId,
        user: {
          id: reportSelection.user?.id,
          username: reportSelection.user?.username,
          email: reportSelection.user?.email,
          puesto: reportSelection.user?.puesto,
          empresa_id: empresaId
        },
        // Campos requeridos por el backend
        planta_id: reportSelection.plant?.id,
        usuario_id: reportSelection.user?.id,
        // Mantener parameterComments para compatibilidad (pero el backend usará comentarios)
        parameterComments: parameterComments || {}
      }

      // Determinar si es actualización o creación
      const reportId = reportSelection.report_id;
      const isUpdate = !!reportId;
      
      // Determinar endpoint y método HTTP
      const endpoint = isUpdate 
        ? `${API_BASE_URL}${API_ENDPOINTS.REPORT_BY_ID(reportId)}`
        : `${API_BASE_URL}${API_ENDPOINTS.REPORTS}`;
      const method = isUpdate ? "PUT" : "POST";

      // Enviar el reportSelection completo al endpoint
      const response = await fetch(endpoint, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportDataToSend)
      })

      if (!response.ok) {
        // Leer el body solo una vez usando clone() para evitar el error "body stream already read"
        const responseClone = response.clone();
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await responseClone.json();
          console.error("❌ Error del servidor (JSON):", errorData);
          errorMessage = errorData?.msg || errorData?.message || errorMessage;
        } catch (jsonError) {
          try {
            const errorText = await response.text();
            console.error("❌ Error del servidor (texto):", errorText);
            errorMessage = errorText || errorMessage;
          } catch (textError) {
            console.error("❌ No se pudo leer el cuerpo de la respuesta de error");
          }
        }
        
        // Mensaje específico para 404
        if (response.status === 404) {
          if (isUpdate) {
            errorMessage = `No se encontró el reporte con ID ${reportId}. El endpoint PUT puede no estar implementado en el backend.`;
          } else {
            errorMessage = `No se pudo crear el reporte. Error ${response.status}`;
          }
        }
        
        // Mostrar mensaje de error más amigable al usuario
        alert(`Error al ${isUpdate ? "actualizar" : "guardar"} el reporte: ${errorMessage}`);
        setIsSaving(false);
        return;
      }

      const result = await response.json()

      // Validar que el resultado no sea null
      if (!result || (result.ok === false)) {
        const errorMsg = result?.msg || result?.message || "El servidor devolvió un resultado nulo"
        alert(`Error al ${isUpdate ? "actualizar" : "guardar"} el reporte: ${errorMsg}`)
        throw new Error(`Error: ${errorMsg}`)
      }
      
      // Si se creó un nuevo reporte, actualizar el report_id en reportSelection
      if (!isUpdate && result?.id) {
        const updatedReportSelection = {
          ...reportSelection,
          report_id: result.id
        };
        setReportSelection(updatedReportSelection);
        localStorage.setItem("reportSelection", JSON.stringify(updatedReportSelection));
      }
      
      // Mostrar mensaje de éxito (los valores ya están en reportes.datos; no se usa tabla mediciones)
      alert(`Reporte ${isUpdate ? "actualizado" : "guardado"} exitosamente en el sistema${isUpdate ? ` (ID: ${reportId})` : result?.id ? ` (ID: ${result.id})` : ""}`)

    } catch (error) {
      console.error("❌ Error en handleSaveReport:", error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // No mostrar alerta si ya se mostró una anteriormente (en el bloque de respuesta del servidor)
      if (!errorMessage.includes("Error del servidor")) {
        alert(`Error al guardar el reporte: ${errorMessage}`)
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Función para exportar gráfico desde el componente usando ref
  const exportChartFromComponent = async (variableName: string): Promise<string | null> => {
    try {
      const chartRef = chartRefs.current.get(variableName);
      if (!chartRef) {
        console.warn(`⚠️ No se encontró ref para el gráfico: ${variableName}`);
        return null;
      }
      
      const imageData = await chartRef.exportAsImage();
      if (imageData) {
          } else {
        console.warn(`⚠️ No se pudo exportar el gráfico: ${variableName}`);
      }
      
      return imageData;
    } catch (error) {
      console.error(`❌ Error exportando gráfico ${variableName}:`, error);
      return null;
    }
  };

  // Función para cargar imagen y convertir a base64
  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo obtener contexto del canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error('Error cargando imagen'));
      img.src = url.startsWith('/') ? window.location.origin + url : url;
    });
  };

  // Exportar a PDF usando jsPDF y AutoTable directamente
  const exportDOMToPDF = async (reportSelection: ReportSelection | null) => {
    try {
      if (!reportSelection) {
        throw new Error("No hay datos de reporte disponibles");
      }

      // Crear PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidthMM = pdf.internal.pageSize.getWidth(); // 210mm
      const pageHeightMM = pdf.internal.pageSize.getHeight(); // 297mm
      const contentWidthMM = pageWidthMM * 0.7; // 70% del ancho: ~147mm
      const marginLeft = (pageWidthMM - contentWidthMM) / 2; // Centrar el contenido
      const marginTop = 20;
      const marginBottom = 20;
      let currentY = marginTop;
      const spacingMM = 8;

      // Función para verificar espacio y agregar nueva página
      const checkSpaceAndAddPage = (elementHeightMM: number, currentY: number): number => {
        const margin = 10;
        const availableSpace = pageHeightMM - currentY - marginBottom - margin;
        
        if (elementHeightMM > availableSpace) {
          pdf.addPage();
          return marginTop;
        }
        return currentY;
      };

      // Cargar header y footer si existen
      let headerData: string | null = null;
      let footerData: string | null = null;
      
      try {
        const headerImg = document.querySelector('#header-img img') as HTMLImageElement;
        if (headerImg?.src) {
          headerData = await loadImageAsBase64(headerImg.src);
        }
      } catch (error) {
        console.warn("⚠️ No se pudo cargar header:", error);
      }

      try {
        const footerImg = document.querySelector('#footer-img img') as HTMLImageElement;
        if (footerImg?.src) {
          footerData = await loadImageAsBase64(footerImg.src);
          }
        } catch (error) {
        console.warn("⚠️ No se pudo cargar footer:", error);
      }

      // Agregar header
      if (headerData) {
        const headerImg = new window.Image();
        headerImg.src = headerData;
        await new Promise((resolve) => {
          headerImg.onload = () => {
            const headerHeightMM = (headerImg.height / headerImg.width) * pageWidthMM;
            pdf.addImage(headerData!, "JPEG", 0, 0, pageWidthMM, headerHeightMM);
            currentY = headerHeightMM + spacingMM;
            resolve(null);
          };
          headerImg.onerror = () => resolve(null);
        });
      }

      // Información del reporte
      pdf.setFontSize(12);
      const reportInfo = [
        `Dirigido a: ${reportNotes["dirigido"] || reportSelection?.plant?.dirigido_a || "ING."}`,
        `Asunto: ${reportNotes["asunto"] || reportSelection?.plant?.mensaje_cliente || `REPORTE DE ANÁLISIS PARA TODOS LOS SISTEMAS EN LA PLANTA DE ${reportSelection?.plant?.nombre || "NOMBRE DE LA PLANTA"}`}`,
        `Sistema Evaluado: ${reportNotes["sistema"] || reportSelection?.systemName || "Todos los sistemas"}`,
        `Fecha de muestra: ${reportSelection?.fecha || currentDate}`,
      ];

      reportInfo.forEach((line, index) => {
        currentY = checkSpaceAndAddPage(10, currentY);
        const lines = pdf.splitTextToSize(line, contentWidthMM);
        pdf.text(lines, marginLeft, currentY);
        currentY += lines.length * 5 + 2;
      });

      currentY += spacingMM;

      // Leyenda de colores usando AutoTable
      currentY = checkSpaceAndAddPage(30, currentY);
      pdf.setFontSize(14);
      pdf.text("Leyenda de colores", marginLeft, currentY);
      currentY += 8;

      const legendData = [
        ["Estado", "Descripción"],
        ["Fuera", "FUERA DE RANGO"],
        ["Límite", "CERCA DE LÍMITE RECOMENDADO"],
        ["Bien", "DENTRO DE RANGO ÓPTIMO"],
      ];

      autoTable(pdf, {
        head: [legendData[0]],
        body: legendData.slice(1),
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [66, 139, 202] },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.row.index !== undefined) {
            if (data.row.index === 0) {
              data.cell.styles.fillColor = [255, 198, 206]; // Rojo para "Fuera"
            } else if (data.row.index === 1) {
              data.cell.styles.fillColor = [255, 235, 156]; // Amarillo para "Límite"
            } else if (data.row.index === 2) {
              data.cell.styles.fillColor = [197, 238, 206]; // Verde para "Bien"
            }
          }
        },
        margin: { left: marginLeft, right: marginLeft },
        styles: { fontSize: 10 },
      });

      currentY = ((pdf as any).lastAutoTable.finalY as number) + spacingMM;

      // Agregar tabla de Previsualización de Datos Guardados
      if (reportSelection?.parameters && Object.keys(reportSelection.parameters).length > 0) {
        currentY = checkSpaceAndAddPage(30, currentY);
        pdf.setFontSize(14);
        currentY += 8;
        
        // Fecha de medición
        pdf.setFontSize(10);
        const fechaMedicion = reportSelection.fecha 
          ? formatFechaLocal(reportSelection.fecha)
          : currentDate;
        pdf.text(`Fecha de medición: ${fechaMedicion}`, marginLeft, currentY);
        currentY += 8;
        
        // Función auxiliar para convertir color hexadecimal a RGB
        const hexToRgb = (hex: string): [number, number, number] | null => {
          if (!hex || hex === "") return null;
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
          ] : null;
        };
        
        // Preparar datos de la tabla (orden según planta)
        const allVariables = new Set<string>();
        Object.values(reportSelection.parameters).forEach((systemData: any) => {
          Object.keys(systemData).forEach(variable => allVariables.add(variable));
        });
        const orderedVariableList = plantOrderVariables.length > 0
          ? [
              ...plantOrderVariables.map((v) => v.nombre).filter((n) => allVariables.has(n)),
              ...Array.from(allVariables).filter((n) => !plantOrderVariables.some((v) => v.nombre === n)),
            ]
          : Array.from(allVariables);
        
        const systemNames = orderedSystemNames.length > 0 ? orderedSystemNames : Object.keys(reportSelection.parameters);
        const previewTableHeaders = ["Variable", ...systemNames];
        const previewTableData = orderedVariableList.map(variable => {
          // Obtener la unidad del primer sistema que tenga datos para esta variable
          let unidad = '';
          for (const systemName of systemNames) {
            const systemData = reportSelection.parameters[systemName];
            const paramData = systemData[variable];
            if (paramData && paramData.unidad) {
              unidad = paramData.unidad;
              break;
            }
          }
          
          // Mostrar la unidad junto al nombre del parámetro
          const variableWithUnit = unidad ? `${variable} (${unidad})` : variable;
          const row: string[] = [variableWithUnit];
          
          systemNames.forEach((systemName: string) => {
            const systemData = reportSelection.parameters[systemName];
            const paramData = systemData?.[variable];
            // Mostrar solo el valor sin la unidad
            const value = paramData ? String(paramData.valor) : "—";
            row.push(value);
          });
          return row;
        });
        
        // Agregar tabla usando AutoTable con colores
        autoTable(pdf, {
          head: [previewTableHeaders],
          body: previewTableData,
          startY: currentY,
          theme: "grid",
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: marginLeft, right: marginLeft },
          styles: { fontSize: 9 },
          didParseCell: (data: any) => {
            // Solo aplicar colores a las celdas del cuerpo (no al encabezado)
            if (data.section === 'body' && data.column.index > 0) {
              // Obtener el nombre de la variable (primera columna)
              const variableName = previewTableData[data.row.index]?.[0];
              // Extraer el nombre sin la unidad (si tiene formato "Variable (unidad)")
              const variableNameClean = variableName ? variableName.split(' (')[0].trim() : '';
              
              // Obtener el nombre del sistema (columna actual)
              const systemName = systemNames[data.column.index - 1];
              
              // Obtener los datos del parámetro
              const systemData = reportSelection.parameters[systemName];
              const paramData = systemData?.[variableNameClean];
              
              // Misma búsqueda de tolerancia que la vista HTML (objeto plano por nombre/parameterId)
              interface TolShape {
                bien_min?: number | null;
                bien_max?: number | null;
                limite_min?: number | null;
                limite_max?: number | null;
                usar_limite_min?: boolean;
                usar_limite_max?: boolean;
              }
              const tolerances = reportSelection?.variablesTolerancia || {};
              const tolerancesRecord = tolerances as Record<string, unknown>;
              let tolerance: TolShape | null = null;
              const direct = tolerancesRecord[variableNameClean];
              if (direct && typeof direct === 'object') {
                tolerance = direct as TolShape;
              } else {
                const byNombre = Object.values(tolerancesRecord).find((tol: unknown) => 
                  tol && typeof tol === 'object' && (tol as { nombre?: string }).nombre === variableNameClean
                );
                if (byNombre && typeof byNombre === 'object') tolerance = byNombre as TolShape;
              }
              if (!tolerance) {
                const byCase = Object.values(tolerancesRecord).find((tol: unknown) => {
                  const t = tol as { nombre?: string };
                  return t && typeof t === 'object' && t.nombre && 
                    t.nombre.trim().toLowerCase() === variableNameClean.toLowerCase();
                });
                if (byCase && typeof byCase === 'object') tolerance = byCase as TolShape;
              }
              
              // Calcular el color si tenemos datos y tolerancia
              if (paramData && paramData.valor !== undefined && paramData.valor !== null && tolerance) {
                const valorStr = String(paramData.valor);
                const toleranceParam: TolShape = {
                  bien_min: tolerance.bien_min ?? null,
                  bien_max: tolerance.bien_max ?? null,
                  limite_min: tolerance.limite_min ?? null,
                  limite_max: tolerance.limite_max ?? null,
                  usar_limite_min: tolerance.usar_limite_min ?? false,
                  usar_limite_max: tolerance.usar_limite_max ?? false
                };
                
                const cellColorHex = getCellColor(valorStr, toleranceParam);
                if (cellColorHex) {
                  const rgbColor = hexToRgb(cellColorHex);
                  if (rgbColor) {
                    data.cell.styles.fillColor = rgbColor;
                    // Ajustar color del texto para mejor contraste en celdas rojas/amarillas
                    if (cellColorHex === "#FFC6CE" || cellColorHex === "#FFEB9C") {
                      data.cell.styles.textColor = [0, 0, 0]; // Negro para mejor legibilidad
                    }
                  }
                }
              }
            }
          },
        });
        
        currentY = ((pdf as any).lastAutoTable.finalY as number) + spacingMM;
        
        // Agregar sección de comentarios (siempre visible)
        currentY = checkSpaceAndAddPage(20, currentY);
        pdf.setFontSize(12);
        pdf.text("Comentarios:", marginLeft, currentY);
        currentY += 8;
        
        if (reportSelection.comentarios && reportSelection.comentarios.trim()) {
          pdf.setFontSize(10);
          const commentLines = pdf.splitTextToSize(reportSelection.comentarios, contentWidthMM);
          pdf.text(commentLines, marginLeft, currentY);
          currentY += commentLines.length * 4 + spacingMM;
        } else {
          pdf.setFontSize(10);
          pdf.setTextColor(128, 128, 128); // Gris
          pdf.setFont('helvetica', 'italic');
          pdf.text("No hay comentarios registrados.", marginLeft, currentY);
          pdf.setTextColor(0, 0, 0); // Volver a negro
          pdf.setFont('helvetica', 'normal');
          currentY += 8;
        }
      }

      // Capturar y agregar gráficos
      // Calcular variables disponibles para verificar si hay gráficos
      const variablesDisponibles = (() => {
        const variablesMap = new Map<string, string>();
        Object.values(reportSelection?.parameters || {}).forEach((systemData: any) => {
          Object.entries(systemData).forEach(([variableName, paramData]: [string, any]) => {
            if (!variablesMap.has(variableName) && paramData?.unidad) {
              variablesMap.set(variableName, paramData.unidad);
            }
          });
        });
        return Array.from(variablesMap.entries()).map(([nombre, unidad]) => ({
          id: nombre,
          nombre: nombre,
          unidad: unidad
        }));
      })();
      
      // Usar las fechas del estado o calcular si no están disponibles
      const pdfChartStartDate = chartStartDate || (() => {
        const today = new Date();
        const startDateObj = new Date(today);
        startDateObj.setMonth(today.getMonth() - 12);
        return startDateObj.toISOString().split('T')[0];
      })();
      const pdfChartEndDate = chartEndDate || new Date().toISOString().split('T')[0];
      
      // Agregar título de sección de gráficos
      const hasCharts = variablesDisponibles.length > 0;
      if (hasCharts) {
        currentY = checkSpaceAndAddPage(15, currentY);
        pdf.setFontSize(14);
        pdf.text("Gráficos de Series Temporales", marginLeft, currentY);
        currentY += 8;
        
        // Agregar período
        pdf.setFontSize(10);
        const periodText = `Período: ${new Date(pdfChartStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(pdfChartEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        pdf.text(periodText, marginLeft, currentY);
        currentY += spacingMM;
      }
      
      // Exportar gráficos directamente desde los componentes usando refs
      if (hasCharts && variablesDisponibles.length > 0) {
        // Esperar un momento para que los gráficos se rendericen completamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        for (let i = 0; i < variablesDisponibles.length; i++) {
          const variable = variablesDisponibles[i];
          const variableName = variable.nombre;
          const chartTitle = `${variableName} (${variable.unidad})`;

          // Exportar gráfico desde el componente usando ref
          const chartData = await exportChartFromComponent(variableName);
          
          if (chartData) {
            const chartImg = new window.Image();
            chartImg.src = chartData;
            
            await new Promise((resolve) => {
              chartImg.onload = () => {
                const chartHeightMM = (chartImg.height / chartImg.width) * contentWidthMM;
                
                // Agregar título del gráfico
                currentY = checkSpaceAndAddPage(10 + chartHeightMM + spacingMM, currentY);
                pdf.setFontSize(12);
                pdf.text(chartTitle, marginLeft, currentY);
                currentY += 8;
                
                // Agregar el gráfico
                currentY = checkSpaceAndAddPage(chartHeightMM + spacingMM, currentY);
                pdf.addImage(chartData, "JPEG", marginLeft, currentY, contentWidthMM, chartHeightMM);
                currentY += chartHeightMM + spacingMM;
                
                // Buscar y agregar comentarios del gráfico si existen
                const comment = parameterComments[variableName];
                if (comment && comment.trim()) {
                  currentY = checkSpaceAndAddPage(15, currentY);
                  pdf.setFontSize(10);
                  pdf.text("Comentarios:", marginLeft, currentY);
                  currentY += 5;
                  const commentLines = pdf.splitTextToSize(comment, contentWidthMM);
                  pdf.text(commentLines, marginLeft, currentY);
                  currentY += commentLines.length * 4 + spacingMM;
                }
                
                resolve(null);
              };
              chartImg.onerror = () => {
                console.error(`❌ Error cargando imagen del gráfico ${i + 1}`);
                resolve(null);
              };
            });
      } else {
            console.warn(`⚠️ No se pudo exportar el gráfico ${i + 1}: ${chartTitle}`);
          }
        }
      }

      // Agregar tabla histórica por sistema (igual que dashboard-historicos)
      // Solo agregar si el checkbox está seleccionado
      if (includeTableInPDF && reportSelection?.parameters && Object.keys(reportSelection.parameters).length > 0) {
        currentY = checkSpaceAndAddPage(20, currentY);
        pdf.setFontSize(14);
        pdf.text("Historial de Reportes por Sistema", marginLeft, currentY);
        currentY += 8;
        
        // Agregar período
        pdf.setFontSize(10);
        const periodText = `Período: ${new Date(pdfChartStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(pdfChartEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        pdf.text(periodText, marginLeft, currentY);
        currentY += spacingMM;
        
        // Obtener token para las peticiones
        const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
        const plantName = reportSelection?.plant?.nombre;
        const plantId = reportSelection?.plant?.id;

        // Obtener reportes para construir histórico desde reportes.datos (en lugar de tabla mediciones)
        let reportesFiltrados: any[] = [];
        if (token && plantId) {
          try {
            const reportesRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (reportesRes.ok) {
              const reportesData = await reportesRes.json();
              const reportes: any[] = reportesData.reportes || [];
              const start = new Date(pdfChartStartDate);
              const end = new Date(pdfChartEndDate);
              end.setHours(23, 59, 59, 999);
              reportesFiltrados = reportes.filter((report: any) => {
                const rPlantaId = report.planta_id || report.datos?.plant?.id;
                if (rPlantaId !== plantId) return false;
                const fechaReporte = report.datos?.fecha || report.fecha || report.created_at;
                if (!fechaReporte) return false;
                const fecha = new Date(fechaReporte);
                return !isNaN(fecha.getTime()) && fecha >= start && fecha <= end;
              });
            }
          } catch (e) {
            console.error("Error obteniendo reportes para PDF:", e);
          }
        }

        // Iterar sobre cada sistema (mismo orden que reportmanager)
        for (const systemName of orderedSystemNames.length > 0 ? orderedSystemNames : Object.keys(reportSelection.parameters)) {
          // Obtener todos los parámetros del sistema desde la API
          let parameters: Array<{ id: string; nombre: string; unidad: string }> = [];
          let historicalData: HistoricalDataByDate = {};

          try {
            if (token && plantName) {
              const systemsResponse = await fetch(
                `${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT_NAME(plantName)}`,
                { headers: { Authorization: `Bearer ${token}` } }
              );

              if (systemsResponse.ok) {
                const systemsData = await systemsResponse.json();
                const systemsList = systemsData.procesos || systemsData || [];
                const systemInfo = systemsList.find((sys: any) => sys.nombre === systemName);

                if (systemInfo?.id) {
                  const varsResponse = await fetch(
                    `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(systemInfo.id)}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                  );

                  if (varsResponse.ok) {
                    const varsData = await varsResponse.json();
                    const variablesList = varsData.variables || varsData || [];
                    parameters = variablesList.map((v: any) => ({
                      id: v.id,
                      nombre: v.nombre,
                      unidad: v.unidad || ""
                    }));
                  }

                  // Construir historicalData desde reportes.datos (columna JSON)
                  const toFechaYMDForPDF = (raw: string | number | Date): string => {
                    if (!raw) return "";
                    const s = typeof raw === "string" ? raw.split("T")[0] : new Date(raw).toISOString().split("T")[0];
                    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(raw).toISOString().split("T")[0];
                  };
                  reportesFiltrados.forEach((report: any) => {
                    const datos = report.datos || report.reportSelection || {};
                    const fechaReporte = datos.fecha || report.fecha || report.created_at;
                    if (!fechaReporte) return;
                    const fechaStr = toFechaYMDForPDF(fechaReporte);
                    if (!fechaStr || !historicalData[fechaStr]) historicalData[fechaStr] = {};
                    const paramsForSystem = datos.parameters?.[systemName] || {};
                    const parameterComments = datos.parameterComments || {};
                    parameters.forEach((param) => {
                      const paramData = paramsForSystem[param.nombre];
                      const valor = paramData?.valor ?? paramData?.value;
                      if (valor === undefined || valor === null || Number.isNaN(Number(valor))) return;
                      historicalData[fechaStr][param.id] = {
                        valor: Number(valor),
                        unidad: paramData?.unidad ?? param.unidad ?? "",
                        comentarios: parameterComments[param.nombre] ?? parameterComments[param.id] ?? datos.comentarios ?? ""
                      };
                    });
                    if (datos.comentarios && !historicalData[fechaStr].comentarios_globales) {
                      historicalData[fechaStr].comentarios_globales = datos.comentarios;
                    }
                  });
                }
              }
            }
          } catch (error) {
            console.error(`Error obteniendo datos para sistema ${systemName}:`, error);
          }
          
          if (parameters.length === 0) continue;
          
          // Título del sistema
          currentY = checkSpaceAndAddPage(15, currentY);
          pdf.setFontSize(12);
          pdf.text(`Sistema: ${systemName}`, marginLeft, currentY);
          currentY += 8;
          
          // Calcular valores ALTO y BAJO usando param.id (igual que dashboard-historicos)
          const highLowValues: { [key: string]: { alto: number, bajo: number } } = {};
          parameters.forEach(param => {
            const values = Object.values(historicalData)
              .map(dateData => {
                // Usar param.id para buscar valores (igual que dashboard-historicos)
                const paramData = dateData[param.id];
                return paramData && typeof paramData === 'object' && 'valor' in paramData ? paramData.valor : undefined;
              })
              .filter((val): val is number => val !== undefined);
            
            if (values.length > 0) {
              highLowValues[param.id] = {
                alto: Math.max(...values),
                bajo: Math.min(...values)
              };
            } else {
              highLowValues[param.id] = { alto: 0, bajo: 0 };
            }
          });
          
          // Ordenar fechas
          const sortedDates = Object.keys(historicalData).sort((a, b) => 
            new Date(a).getTime() - new Date(b).getTime()
          );
          
          // Preparar datos de la tabla (incluyendo columna de COMENTARIOS)
          const tableHeaders = ["PARAMETROS", ...parameters.map(p => `${p.nombre}\n(${p.unidad})`), "COMENTARIOS"];
          
          // Fila ALTO
          const altoRow = ["ALTO", ...parameters.map(p => 
            highLowValues[p.id]?.alto.toFixed(2) || "—"
          ), "—"];
          
          // Fila BAJO
          const bajoRow = ["BAJO", ...parameters.map(p => 
            highLowValues[p.id]?.bajo.toFixed(2) || "—"
          ), "—"];
          
          // Fila FECHA/RANGOS
          const rangosRow = ["FECHA/RANGOS", ...parameters.map(p => {
            const tolerances = (reportSelection?.variablesTolerancia?.[systemName] || {}) as unknown as Record<string, { limite_min?: number | null; limite_max?: number | null }>;
            let tolerance = tolerances[p.id];
            
            if (!tolerance) {
              tolerance = Object.values(tolerances).find((tol: any) => tol && typeof tol === 'object') as any;
            }
            
            if (!tolerance) return "—";
            
            const min = tolerance.limite_min;
            const max = tolerance.limite_max;
            
            if (min !== undefined && min !== null && max !== undefined && max !== null) {
              return `${min} - ${max}`;
            } else if (min !== undefined && min !== null) {
              return `Min ${min}`;
            } else if (max !== undefined && max !== null) {
              return `Max ${max}`;
            }
            return "—";
          }), "—"];
          
          // Filas de datos históricos
          const dataRows: string[][] = [];
          sortedDates.forEach((fecha) => {
            const dateData = historicalData[fecha];
            // Formatear fecha sin problemas de zona horaria
            const match = String(fecha).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
            const fechaFormateada = match
              ? (() => {
                  const [, year, month, day] = match;
                  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
                  return date.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit'
                  });
                })()
              : new Date(fecha).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: '2-digit'
                });
            
            const row = [
              fechaFormateada,
              ...parameters.map((param) => {
                // Usar param.id para buscar valores (igual que dashboard-historicos)
                const value = dateData[param.id];
                const valor = value && typeof value === 'object' && 'valor' in value ? value.valor : undefined;
                return valor !== undefined ? valor.toFixed(2) : "—";
              }),
              parseCommentDisplay(dateData.comentarios_globales)
            ];
            dataRows.push(row);
          });
          
          // Crear tabla con AutoTable
          const tableData = [altoRow, bajoRow, rangosRow, ...dataRows];
          
          // Reducir el tamaño de la tabla en un 35% (65% del tamaño original)
          // Si el tamaño original era 95%, ahora será: 95% * 0.65 = 61.75%
          const tableWidthMM = pageWidthMM * 0.6175; // 65% del tamaño original (95% * 0.65)
          // Alinear la tabla a la izquierda con un margen pequeño
          const tableMarginLeft = 10; // Margen izquierdo pequeño para pegar la tabla a la izquierda
          const tableMarginRight = pageWidthMM - tableWidthMM - tableMarginLeft; // El resto del espacio a la derecha
          
          autoTable(pdf, {
            head: [tableHeaders],
            body: tableData,
            startY: currentY,
            theme: "grid",
            tableWidth: tableWidthMM, // Especificar el ancho de la tabla explícitamente
            headStyles: { 
              fillColor: [31, 78, 121], // Azul oscuro
              textColor: [255, 255, 255],
              fontSize: 5.85, // Reducido 35% (9 * 0.65)
              halign: 'center',
              cellPadding: 0.975 // Reducido 35% (1.5 * 0.65)
            },
            bodyStyles: {
              fontSize: 4.875, // Reducido 35% (7.5 * 0.65)
              halign: 'center',
              cellPadding: 0.975 // Reducido 35% (1.5 * 0.65)
            },
            columnStyles: {
              0: { halign: 'left', cellWidth: 18.2 }, // Reducido 35% (28 * 0.65)
            },
            didParseCell: (data: any) => {
              // Aplicar cellWidth: 9.1 a todas las columnas excepto la primera (reducido 35%)
              if (data.column.index > 0) {
                data.cell.styles.cellWidth = 9.1; // Reducido 35% (14 * 0.65)
              }
              
              // Alinear columna de COMENTARIOS a la izquierda
              if (data.column.index === tableHeaders.length - 1) {
                data.cell.styles.halign = 'left';
              }
              
              // Colorear filas ALTO y BAJO en verde claro
              if (data.section === 'body' && data.row.index !== undefined) {
                if (data.row.index === 0 || data.row.index === 1) {
                  // Filas ALTO y BAJO
                  data.cell.styles.fillColor = [220, 255, 220]; // Verde claro
                } else if (data.row.index === 2) {
                  // Fila FECHA/RANGOS
                  data.cell.styles.fillColor = [31, 78, 121]; // Azul oscuro
                  data.cell.styles.textColor = [255, 255, 255];
                } else {
                  // Filas de datos históricos - alternar colores
                  const dataIndex = data.row.index - 3; // Restar 3 por ALTO, BAJO, RANGOS
                  if (dataIndex % 2 === 0) {
                    data.cell.styles.fillColor = [245, 255, 245]; // Verde muy claro
                  } else {
                    data.cell.styles.fillColor = [255, 240, 245]; // Rosa claro
                  }
                }
              }
            },
            margin: { left: tableMarginLeft, right: tableMarginRight },
            styles: { 
              fontSize: 4.875, // Reducido 35% (7.5 * 0.65)
              cellPadding: 0.975 // Reducido 35% (1.5 * 0.65)
            },
          });
          
          currentY = ((pdf as any).lastAutoTable.finalY as number) + spacingMM;
        }
      }

      // Comentarios globales
      if (reportSelection.comentarios) {
        currentY = checkSpaceAndAddPage(20, currentY);
        pdf.setFontSize(12);
        pdf.text("Comentarios globales:", marginLeft, currentY);
        currentY += 6;
        const commentLines = pdf.splitTextToSize(reportSelection.comentarios, contentWidthMM);
        pdf.setFontSize(10);
        pdf.text(commentLines, marginLeft, currentY);
        currentY += commentLines.length * 5 + spacingMM;
      }

      // Pie de página: Planta (dato del sistema) y fecha de generación
      currentY = checkSpaceAndAddPage(30, currentY);
      pdf.setFontSize(10);
      const plantaLabel = reportSelection?.systemName ?? reportSelection?.plant?.nombre ?? "";
      pdf.text(`Planta: ${plantaLabel}`, marginLeft, currentY);
      currentY += 5;
      pdf.text(`Fecha de generación: ${(reportSelection?.generatedDate ? new Date(reportSelection.generatedDate) : new Date()).toLocaleString('es-ES')}`, marginLeft, currentY);
      currentY += spacingMM;

    // Agregar footer a la última página
      if (footerData) {
    const totalPages = pdf.internal.pages.length;
    pdf.setPage(totalPages);
        const footerImg = new window.Image();
        footerImg.src = footerData;
        await new Promise((resolve) => {
          footerImg.onload = () => {
            const footerHeightMM = (footerImg.height / footerImg.width) * pageWidthMM;
            const footerY = pageHeightMM - footerHeightMM - marginBottom;
            pdf.addImage(footerData!, "JPEG", 0, footerY, pageWidthMM, footerHeightMM);
            resolve(null);
          };
          footerImg.onerror = () => resolve(null);
        });
      }

      // Descargar PDF
    const fileName = `Reporte_${(reportSelection?.plant?.nombre || "General").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
    pdf.save(fileName);
    alert("✅ PDF descargado exitosamente!");
    
  } catch (error) {
    console.error("❌ Error en exportDOMToPDF:", error);
    if (error instanceof Error) {
        alert(`Error al generar PDF: ${error.message}\n\nRevisa la consola para más detalles.`);
      } else {
        alert(`Error al generar PDF: ${String(error)}\n\nRevisa la consola para más detalles.`);
    }
    throw error;
  }
};

  // Función para descargar el reporte en PDF (solo descarga, no guarda)
  const handleDownloadPDF = async () => {
    if (isDownloading) return // Prevenir múltiples clics
    
    setIsDownloading(true)
    try {
      // Validar que tenemos datos del reporte
      if (!reportSelection) {
        alert("No hay datos de reporte disponibles")
        return
      }

      await exportDOMToPDF(reportSelection)
      
    } catch (error) {
      console.error("❌ Error en handleDownloadPDF:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsDownloading(false)
    }
  }
  
  // Función para obtener el color de celda según los límites
  // Usa la misma lógica que getInputColor en dashboard-reportmanager
  function getCellColor(valorStr: string, param: any) {
    if (valorStr === undefined || valorStr === null || valorStr === "") return "";
    const valor = parseFloat(valorStr);
    if (isNaN(valor)) return "";
    
    const {
      bien_min,
      bien_max,
      limite_min,
      limite_max,
      usar_limite_min,
      usar_limite_max,
    } = param;
    
    // CASO 1: Verificar primero los límites críticos (limite_min/limite_max) - ROJO
    if (usar_limite_min && limite_min !== null && limite_min !== undefined) {
      if (valor < limite_min) {
        return "#FFC6CE"; // Rojo - fuera del límite crítico mínimo
      }
    }
    
    if (usar_limite_max && limite_max !== null && limite_max !== undefined) {
      if (valor > limite_max) {
        return "#FFC6CE"; // Rojo - fuera del límite crítico máximo
      }
    }
    
    // CASO 2: Verificar si excede bien_max (sin bien_min) - ROJO
    // Si no hay bien_min pero sí hay bien_max, solo es rojo si excede bien_max
    if ((bien_min === null || bien_min === undefined) && 
        bien_max !== null && bien_max !== undefined) {
      if (valor > bien_max) {
        return "#FFC6CE"; // Rojo - excede el máximo
      }
      // Si no excede bien_max, es verde
      return "#C6EFCE"; // Verde - dentro del rango aceptable
    }
    
    // CASO 3: Verificar si está por debajo de bien_min (sin bien_max) - ROJO
    // Si no hay bien_max pero sí hay bien_min, solo es rojo si está por debajo de bien_min
    if ((bien_max === null || bien_max === undefined) && 
        bien_min !== null && bien_min !== undefined) {
      if (valor < bien_min) {
        return "#FFC6CE"; // Rojo - por debajo del mínimo
      }
      // Si no está por debajo de bien_min, es verde
      return "#C6EFCE"; // Verde - dentro del rango aceptable
    }
    
    // CASO 4: Si existen ambos bienMin y bienMax (sin limite_min/limite_max)
    if (!usar_limite_min && !usar_limite_max && 
        bien_min !== null && bien_min !== undefined && 
        bien_max !== null && bien_max !== undefined) {
      
      if (valor < bien_min || valor > bien_max) {
        return "#FFC6CE"; // Rojo - fuera del rango bien
      } else {
        return "#C6EFCE"; // Verde - dentro del rango bien
      }
    }
    
    // CASO 5: Verificar rango de advertencia (amarillo)
    // Si está por debajo del rango bien_min pero por encima del límite_min
    if (usar_limite_min && limite_min !== null && limite_min !== undefined) {
      if (valor >= limite_min && bien_min !== null && bien_min !== undefined && valor < bien_min) {
        return "#FFEB9C"; // Amarillo
      }
    }
    
    // Si está por encima del rango bien_max pero por debajo del límite_max
    if (usar_limite_max && limite_max !== null && limite_max !== undefined) {
      if (valor <= limite_max && bien_max !== null && bien_max !== undefined && valor > bien_max) {
        return "#FFEB9C"; // Amarillo
      }
    }
    
    // CASO 6: Si está dentro del rango bien_min y bien_max (verde)
    if (bien_min !== null && bien_min !== undefined && bien_max !== null && bien_max !== undefined) {
      if (valor >= bien_min && valor <= bien_max) {
        return "#C6EFCE"; // Verde
      }
    }
    
    // CASO 7: Si no hay límites definidos o solo hay bien_max sin bien_min y no excede
    // Por defecto, mostrar verde (no rojo) cuando no hay límites o cuando no se excede el máximo
    return "#C6EFCE"; // Verde por defecto si no hay límites o no se excede el máximo
  }

  // Obtener variables disponibles para gráficos desde parameters con sus unidades y sistemas
  const variablesDisponibles = (() => {
    const variablesMap = new Map<string, { unidad: string; sistemas: string[] }>(); // Map<variableName, {unidad, sistemas[]}>
    const sysNames = orderedSystemNames.length > 0 ? orderedSystemNames : Object.keys(reportSelection?.parameters || {});
    sysNames.forEach((systemName: string) => {
      const systemData = reportSelection?.parameters?.[systemName] || {};
      Object.entries(systemData).forEach(([variableName, paramData]: [string, any]) => {
        if (paramData?.unidad) {
          if (!variablesMap.has(variableName)) {
            variablesMap.set(variableName, { unidad: paramData.unidad, sistemas: [systemName] });
          } else {
            // Si la variable ya existe, agregar el sistema si no está ya incluido
            const existing = variablesMap.get(variableName)!;
            if (!existing.sistemas.includes(systemName)) {
              existing.sistemas.push(systemName);
            }
          }
        }
      });
    });
    
    return Array.from(variablesMap.entries()).map(([nombre, data]) => ({
      id: nombre, // Usar el nombre como ID para los gráficos
      nombre: nombre,
      unidad: data.unidad,
      sistemas: data.sistemas // Lista de sistemas donde aparece esta variable
    }));
  })();
  
  // Calcular fechas para los últimos 12 meses (solo en cliente)
  const [chartStartDate, setChartStartDate] = useState<string>("")
  const [chartEndDate, setChartEndDate] = useState<string>("")
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Intentar cargar fechas desde reportSelection primero
    if (reportSelection?.chartStartDate && reportSelection?.chartEndDate) {
      setChartStartDate(reportSelection.chartStartDate);
      setChartEndDate(reportSelection.chartEndDate);
    } else {
      // Si no hay fechas en reportSelection, calcular desde hoy (últimos 12 meses)
      const today = new Date()
      const endDate = today.toISOString().split('T')[0]
      const startDateObj = new Date(today)
      startDateObj.setMonth(today.getMonth() - 12)
      const startDate = startDateObj.toISOString().split('T')[0]
      setChartStartDate(startDate)
      setChartEndDate(endDate)
    }
  }, [reportSelection])

  // Construir datos para gráficos desde reportes.datos (solo tabla reportes, no mediciones)
  useEffect(() => {
    if (!reportSelection?.plant?.id || !chartStartDate || !chartEndDate) {
      setChartDataFromReportes({});
      return;
    }
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null;
    if (!token) {
      setChartDataFromReportes({});
      return;
    }
    
    const startNorm = chartStartDate.includes("T") ? chartStartDate.split("T")[0] : chartStartDate;
    const endNorm = chartEndDate.includes("T") ? chartEndDate.split("T")[0] : chartEndDate;

    fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const reportes: any[] = data.reportes || [];
        const byVariable: Record<string, Array<{ fecha: string; sistema: string; valor: number }>> = {};

        const toFechaYMD = (raw: string | number | Date): string => {
          if (!raw) return "";
          const s = typeof raw === "string" ? raw.split("T")[0] : new Date(raw).toISOString().split("T")[0];
          return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(raw).toISOString().split("T")[0];
        };
        
        reportes.forEach((report: any) => {
          const datos = report.datos || report.reportSelection || {};
          const fechaRaw = datos.fecha || report.fecha || report.created_at;
          if (!fechaRaw) return;
          const fecha = toFechaYMD(fechaRaw);
          if (!fecha || fecha < startNorm || fecha > endNorm) return;
          const plantaId = report.planta_id || datos.plant?.id;
          if (plantaId !== reportSelection.plant.id) return;

          const parametersData = datos.parameters || {};
          Object.entries(parametersData).forEach(([sistema, params]: [string, any]) => {
            if (!params || typeof params !== "object") return;
            const sistemaNorm = (sistema || "").trim();
            Object.entries(params).forEach(([variableName, paramData]: [string, any]) => {
              const valor = paramData?.valor ?? paramData?.value;
              if (valor == null || Number.isNaN(Number(valor))) return;
              if (!byVariable[variableName]) byVariable[variableName] = [];
              byVariable[variableName].push({ fecha, sistema: sistemaNorm, valor: Number(valor) });
            });
          });
        });

        setChartDataFromReportes(byVariable);
      })
      .catch(() => { if (!cancelled) setChartDataFromReportes({}); });
    return () => { cancelled = true; };
  }, [reportSelection?.plant?.id, chartStartDate, chartEndDate])
  
  // Función para obtener parámetros de un sistema desde la API (igual que dashboard-historicos)
  const getSystemParameters = async (systemName: string): Promise<Array<{ id: string; nombre: string; unidad: string }>> => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
      if (!token) return []
      
      // Obtener el ID del sistema desde su nombre
      const plantName = reportSelection?.plant?.nombre
      if (!plantName) return []
      
      // Obtener todos los sistemas de la planta
      const systemsResponse = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT_NAME(plantName)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      if (!systemsResponse.ok) {
        console.error(`Error obteniendo sistemas para planta ${plantName}`)
        return []
      }
      
      const systemsData = await systemsResponse.json()
      const systemsList = systemsData.procesos || systemsData || []
      
      // Buscar el sistema por nombre
      const systemInfo = systemsList.find((sys: any) => sys.nombre === systemName)
      if (!systemInfo || !systemInfo.id) {
        console.warn(`Sistema "${systemName}" no encontrado`)
        return []
      }
      
      // Obtener todos los parámetros del sistema usando el ID (igual que dashboard-historicos)
      const varsResponse = await fetch(
        `${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(systemInfo.id)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      
      if (!varsResponse.ok) {
        console.error(`Error obteniendo variables del sistema ${systemName}`)
        return []
      }
      
      const varsData = await varsResponse.json()
      const variablesList = varsData.variables || varsData || []
      
      // Mapear a formato esperado (igual que dashboard-historicos)
      return variablesList.map((v: any) => ({
        id: v.id,
        nombre: v.nombre,
        unidad: v.unidad || ""
      }))
    } catch (error) {
      console.error(`Error obteniendo parámetros del sistema ${systemName}:`, error)
      return []
    }
  }
  
  // Función para cargar datos históricos por sistema desde reportes.datos (columna JSON)
  const fetchHistoricalDataForSystem = async (systemName: string) => {
    if (!reportSelection || !chartStartDate || !chartEndDate) return

    setHistoricalLoading(prev => ({ ...prev, [systemName]: true }))
    setHistoricalError(prev => ({ ...prev, [systemName]: null }))

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null
      const plantId = reportSelection?.plant?.id

      const allParameters = await getSystemParameters(systemName)
      setSystemParameters(prev => ({ ...prev, [systemName]: allParameters }))

      if (!token || !plantId) {
        setHistoricalDataBySystem(prev => ({ ...prev, [systemName]: {} }))
        return
      }

      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("Organomex_token")
          localStorage.removeItem("Organomex_user")
          router.push("/logout")
          return
        }
        throw new Error("No se pudieron cargar los reportes.")
      }

      const data = await res.json()
      const reportes: any[] = data.reportes || []
      const start = new Date(chartStartDate)
      const end = new Date(chartEndDate)
      end.setHours(23, 59, 59, 999)

      const reportesFiltrados = reportes.filter((report: any) => {
        const rPlantaId = report.planta_id || report.datos?.plant?.id
        if (rPlantaId !== plantId) return false
        const fechaReporte = report.datos?.fecha || report.fecha || report.created_at
        if (!fechaReporte) return false
        const fecha = new Date(fechaReporte)
        return !isNaN(fecha.getTime()) && fecha >= start && fecha <= end
      })

      const organizedData: HistoricalDataByDate = {}
      reportesFiltrados.forEach((report: any) => {
        const datos = report.datos || report.reportSelection || {}
        const fechaReporte = datos.fecha || report.fecha || report.created_at
        if (!fechaReporte) return
        // Normalizar fecha a YYYY-MM-DD sin problemas de zona horaria
        const toFechaYMD = (raw: string | number | Date): string => {
          if (!raw) return "";
          const s = typeof raw === "string" ? raw.split("T")[0] : new Date(raw).toISOString().split("T")[0];
          return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(raw).toISOString().split("T")[0];
        };
        const fechaStr = toFechaYMD(fechaReporte);
        if (!fechaStr || !organizedData[fechaStr]) organizedData[fechaStr] = {}
        const paramsForSystem = datos.parameters?.[systemName] || {}
        const parameterComments = datos.parameterComments || {}
        allParameters.forEach((param) => {
          const paramData = paramsForSystem[param.nombre]
          const valor = paramData?.valor ?? paramData?.value
          if (valor === undefined || valor === null || Number.isNaN(Number(valor))) return
          organizedData[fechaStr][param.id] = {
            valor: Number(valor),
            unidad: paramData?.unidad ?? param.unidad ?? "",
            comentarios: parameterComments[param.nombre] ?? parameterComments[param.id] ?? datos.comentarios ?? ""
          }
        })
        if (datos.comentarios && !organizedData[fechaStr].comentarios_globales) {
          organizedData[fechaStr].comentarios_globales = datos.comentarios
        }
      })

      setHistoricalDataBySystem(prev => ({ ...prev, [systemName]: organizedData }))
    } catch (e: any) {
      setHistoricalError(prev => ({ ...prev, [systemName]: `Error al cargar datos históricos: ${e.message}` }))
      console.error(e)
    } finally {
      setHistoricalLoading(prev => ({ ...prev, [systemName]: false }))
    }
  }
  
  // Cargar datos históricos cuando cambie reportSelection o fechas
  useEffect(() => {
    if (!reportSelection || !chartStartDate || !chartEndDate) return
    
    const systemNames = orderedSystemNames.length > 0 ? orderedSystemNames : Object.keys(reportSelection.parameters || {})
    systemNames.forEach(systemName => {
      fetchHistoricalDataForSystem(systemName)
    })
  }, [reportSelection, chartStartDate, chartEndDate])
  
  // Helper functions para cálculos de históricos (igual que dashboard-historicos)
  const getHighLowValues = (systemName: string, parameters: Array<{ id: string; nombre: string; unidad: string }>) => {
    const historicalData = historicalDataBySystem[systemName] || {}
    const highLow: { [key: string]: { alto: number, bajo: number } } = {}
    
    parameters.forEach(param => {
      // Usar param.id para buscar valores (igual que dashboard-historicos)
      const values = Object.values(historicalData)
        .map(dateData => {
          const paramData = dateData[param.id]
          return paramData && typeof paramData === 'object' && 'valor' in paramData ? paramData.valor : undefined
        })
        .filter((val): val is number => val !== undefined)
      
      if (values.length > 0) {
        highLow[param.id] = {
          alto: Math.max(...values),
          bajo: Math.min(...values)
        }
      } else {
        highLow[param.id] = { alto: 0, bajo: 0 }
      }
    })
    
    return highLow
  }
  
  const getAcceptableRange = (systemName: string, parameterId: string): string => {
    // La estructura es plana: { [parameterId]: {...}, [parameterName]: {...} }
    const tolerances = reportSelection?.variablesTolerancia || {}
    // Buscar la tolerancia - el key puede ser el ID o el nombre
    // Intentar primero por ID, luego por nombre
    let tolerance = tolerances[parameterId] as any
    
    if (!tolerance) {
      // Si no se encuentra por ID, buscar en todos los valores por nombre
      tolerance = Object.values(tolerances).find((tol: any) => 
        tol && typeof tol === 'object' && tol.nombre === parameterId
      ) as any
    }
    
    if (!tolerance) return "—"
    
    // Usar limite_min y limite_max (igual que dashboard-historicos)
    const min = tolerance.limite_min
    const max = tolerance.limite_max
    
    if (min !== undefined && min !== null && max !== undefined && max !== null) {
      return `${min} - ${max}`
    } else if (min !== undefined && min !== null) {
      return `Min ${min}`
    } else if (max !== undefined && max !== null) {
      return `Max ${max}`
    }
    return "—"
  }
  
  const isValueOutOfRange = (systemName: string, parameterId: string, value: number): boolean => {
    const tolerances = (reportSelection?.variablesTolerancia?.[systemName] ?? {}) as Record<string, { limite_min?: number | null; limite_max?: number | null }>
    let tolerance = tolerances[parameterId]
    
    if (!tolerance) {
      tolerance = Object.values(tolerances).find((tol: any) => tol && typeof tol === 'object') as any
    }
    
    if (!tolerance) return false
    
    // Verificar contra limite_min y limite_max (igual que dashboard-historicos)
    const min = tolerance.limite_min
    const max = tolerance.limite_max
    
    if (min !== undefined && min !== null && value < min) return true
    if (max !== undefined && max !== null && value > max) return true
    return false
  }
  
  const formatDate = (dateStr: string): string => {
    // Si es formato YYYY-MM-DD, parsear manualmente para evitar zona horaria
    const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:T|$)/);
    if (match) {
      const [, year, month, day] = match;
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
    // Fallback: usar Date normal si no es formato esperado
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  }

  // Extraer texto de comentario: si viene como JSON {"global":"..."} mostrar solo el valor
  const parseCommentDisplay = (value: unknown): string => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "object" && value !== null && "global" in value && typeof (value as { global?: string }).global === "string") {
      return (value as { global: string }).global
    }
    if (typeof value === "string") {
      const trimmed = value.trim()
      if (trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed) as { global?: string }
          if (typeof parsed?.global === "string") return parsed.global
        } catch {
          /* no es JSON válido, devolver tal cual */
        }
      }
      return trimmed || "—"
    }
    return String(value)
  }

  return (
    <ProtectedRoute>
      <div className="min-vh-100 bg-light">
        {/* Navigation */}
        <Navbar role={userRole} />

        {/* Header */}
        <div className="container-fluid bg-primary text-white py-3">
          <div className="container">
            <h1 className="h4 mb-0">Vista Previa del Reporte</h1>
            <p className="mb-0">
              <strong>Fecha:</strong> {currentDate}
            </p>
            {reportSelection && (
              <div className="mt-2">
                <small>
                  <strong>Planta:</strong> {reportSelection.systemName ?? reportSelection.plant?.nombre ?? "—"} | 
                  <strong> Fecha de generación:</strong> {reportSelection.generatedDate ? new Date(reportSelection.generatedDate).toLocaleString('es-ES') : currentDate}
                </small>
              </div>
            )}
          </div>
        </div>

        {/* Report Content */}
        <div id="reporte-pdf-wrapper">
          <div id="reporte-pdf" className="container py-4">
          <div className="card shadow">
            <div className="card-body">
              {/* Report Header */}
              <div className="mb-4">
                {/* Header Image */}
                <div id="header-img" className="text-center">
                  {imagesLoaded ? (
                    <Image
                      src="/images/header.jpeg"
                      alt="Header del reporte"
                      width={800}
                      height={150}
                      className="w-100"
                      style={{ width: "auto", height: "auto", objectFit: "cover" }}
                      priority
                    />
                  ) : (
                    <div className="bg-secondary text-white py-4" style={{ minHeight: "150px" }}>
                      <div className="d-flex flex-column justify-content-center h-100">
                        <h5>HEADER IMAGE</h5>
                        <small>Coloca header.jpeg en /public/images/reports/</small>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mb-4 ml-10 mr-10">
                  <div className="row">
                  <div className="col-12">
                    <p>
                      <strong>Dirigido a: </strong>
                      <span
                        contentEditable={isEditing && userRole !== "client"}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => userRole !== "client" && handleNoteChange("dirigido", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "300px", display: "inline-block", cursor: userRole === "client" ? "default" : "text" }}
                      >
                        {reportNotes["dirigido"] || reportSelection?.plant?.dirigido_a || "ING."}
                      </span>
                    </p>

                    <p>
                      <strong>Asunto: </strong>
                      <span
                        contentEditable={isEditing && userRole !== "client"}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => userRole !== "client" && handleNoteChange("asunto", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "400px", display: "inline-block", cursor: userRole === "client" ? "default" : "text" }}
                      >
                        {reportNotes["asunto"] || reportSelection?.plant?.mensaje_cliente ||
                          `REPORTE DE ANÁLISIS PARA TODOS LOS SISTEMAS EN LA PLANTA DE ${(reportSelection?.plant?.nombre) || "NOMBRE DE LA PLANTA"}`}
                      </span>
                    </p>

                    <p>
                      <strong>Sistema Evaluado: </strong>
                      <span
                        contentEditable={isEditing && userRole !== "client"}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => userRole !== "client" && handleNoteChange("sistema", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "300px", display: "inline-block", cursor: userRole === "client" ? "default" : "text" }}
                      >
                        {reportNotes["sistema"] || (reportSelection?.systemName ?? "Todos los sistemas")}
                      </span>
                    </p>

                    <p>
                      <strong>Fecha de muestra: </strong>
                      <span
                        contentEditable={isEditing && userRole !== "client"}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => userRole !== "client" && handleNoteChange("fecha_muestra", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "200px", display: "inline-block", cursor: userRole === "client" ? "default" : "text" }}
                      >
                        {reportSelection?.fecha || currentDate}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Legend Table */}
              <div className="mb-4 ml-10 mr-10">
                <h5>
                  <strong>Leyenda de colores</strong>
                </h5>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ backgroundColor: "#FFC6CE" }}>
                          <strong>Fuera</strong>
                        </td>
                        <td>FUERA DE RANGO</td> 
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: "#FFEB9C" }}>
                          <strong>Límite</strong>
                        </td>
                        <td>CERCA DE LÍMITE RECOMENDADO</td>
                      </tr>
                      <tr>
                        <td style={{ backgroundColor: "#C5EECE" }}>
                          <strong>Bien</strong>
                        </td>
                        <td>
                          DENTRO DE RANGO OPTIMO
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Previsualización de Datos Guardados */}
              {reportSelection?.parameters && Object.keys(reportSelection.parameters).length > 0 && (
                <div className="mb-4 ml-10 mr-10">
                  
                  
                  {/* Fecha de medición */}
                  <div className="mb-4">
                    <h6 className="text-base font-semibold text-blue-800">
                      Fecha de medición: {reportSelection.fecha ? formatFechaLocal(reportSelection.fecha) : currentDate}
                    </h6>
                  </div>

                  {/* Tabla de datos */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-300 bg-white">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-4 py-2 text-left font-semibold">Variable</th>
                          {orderedSystemNames.map(systemName => (
                            <th key={systemName} className="border px-4 py-2 text-center font-semibold">
                              {systemName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const allVariables = new Set<string>();
                          Object.values(reportSelection.parameters).forEach((systemData: any) => {
                            Object.keys(systemData).forEach(variable => allVariables.add(variable));
                          });
                          const orderedVariableList = plantOrderVariables.length > 0
                            ? [
                                ...plantOrderVariables.map((v) => v.nombre).filter((n) => allVariables.has(n)),
                                ...Array.from(allVariables).filter((n) => !plantOrderVariables.some((v) => v.nombre === n)),
                              ]
                            : Array.from(allVariables);
                          
                          return orderedVariableList.map(variable => {
                            // Obtener la unidad del primer sistema que tenga datos para esta variable
                            let unidad = '';
                            for (const systemName of orderedSystemNames) {
                              const systemData = reportSelection.parameters[systemName];
                              const paramData = systemData?.[variable];
                              if (paramData && paramData.unidad) {
                                unidad = paramData.unidad;
                                break;
                              }
                            }
                            
                            return (
                              <tr key={variable} className="hover:bg-gray-50">
                                <td className="border px-4 py-2 font-medium">
                                  {variable}{unidad ? ` (${unidad})` : ''}
                                </td>
                                {orderedSystemNames.map(systemName => {
                                  const systemData = reportSelection.parameters[systemName];
                                  const paramData = systemData?.[variable];
                                  
                                  // Buscar tolerancia para esta variable
                                  // La estructura guardada es: { [parameterId]: { nombre, ... }, [parameterName]: { nombre, ... } }
                                  const tolerances = reportSelection?.variablesTolerancia || {};
                                  let tolerance: any = null;
                                  
                                  // Estrategia de búsqueda múltiple:
                                  // 1. Buscar por nombre de variable (key directo) - más común
                                  if (tolerances[variable]) {
                                    tolerance = tolerances[variable];
                                  } 
                                  // 2. Buscar en todos los valores por nombre
                                  else {
                                    tolerance = Object.values(tolerances).find((tol: any) => 
                                      tol && typeof tol === 'object' && tol.nombre === variable
                                    ) as any;
                                  }
                                  
                                  // 3. Si aún no se encuentra, intentar búsqueda parcial (por si hay espacios o diferencias)
                                  if (!tolerance) {
                                    tolerance = Object.values(tolerances).find((tol: any) => 
                                      tol && typeof tol === 'object' && 
                                      tol.nombre && 
                                      tol.nombre.trim().toLowerCase() === variable.trim().toLowerCase()
                                    ) as any;
                                  }

                                  // Aplicar color según los límites
                                  let cellColor = "";
                                  if (paramData && paramData.valor !== undefined && paramData.valor !== null && tolerance) {
                                    const valorStr = String(paramData.valor);
                                    const toleranceParam = {
                                      bien_min: tolerance.bien_min ?? null,
                                      bien_max: tolerance.bien_max ?? null,
                                      limite_min: tolerance.limite_min ?? null,
                                      limite_max: tolerance.limite_max ?? null,
                                      usar_limite_min: tolerance.usar_limite_min ?? false,
                                      usar_limite_max: tolerance.usar_limite_max ?? false
                                    };
                                    cellColor = getCellColor(valorStr, toleranceParam);
                                  }
                                  
                                  // Crear objeto de estilo con backgroundColor
                                  // Asegurar que el estilo se aplique incluso si hay conflictos con Tailwind
                                  const cellStyle: React.CSSProperties = cellColor ? {
                                    backgroundColor: cellColor,
                                    color: cellColor === "#FFC6CE" || cellColor === "#FFEB9C" ? "#000000" : undefined,
                                    // Forzar que el estilo tenga prioridad
                                    borderColor: cellColor
                                  } : {};
                                  
                                  const displayValue = paramData?.valor != null ? paramData.valor : "";
                                  const isEditable = userRole !== "client";

                                  return (
                                    <td 
                                      key={systemName} 
                                      className="border px-2 py-1 text-center align-middle"
                                      style={cellStyle}
                                    >
                                      {isEditable ? (
                                        <input
                                          type="text"
                                          inputMode="decimal"
                                          className="w-full min-w-[3rem] max-w-[5rem] mx-auto px-2 py-1 text-center text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-inherit"
                                          value={displayValue === "" ? "" : String(displayValue)}
                                          placeholder="—"
                                          onChange={(e) => handleParameterValueChange(systemName, variable, e.target.value)}
                                          aria-label={`Valor ${variable} en ${systemName}`}
                                        />
                                      ) : (
                                        paramData?.valor != null ? paramData.valor : "—"
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Sección de comentarios - Solo mostrar si hay contenido o si no es cliente */}
                  {(userRole !== "client" || (reportSelection?.comentarios && reportSelection.comentarios.trim() !== "")) && (
                    <div className="mt-4 pt-4 border-t">
                      <textarea
                        id="preview-comments"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        placeholder="Agregar comentarios sobre estos datos..."
                        value={reportSelection.comentarios || ""}
                        onChange={(e) => {
                          if (reportSelection && userRole !== "client") {
                            const updatedReportSelection = {
                              ...reportSelection,
                              comentarios: e.target.value
                            }
                            setReportSelection(updatedReportSelection)
                            localStorage.setItem("reportSelection", JSON.stringify(updatedReportSelection))
                          }
                        }}
                        disabled={userRole === "client"}
                        readOnly={userRole === "client"}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Gráficos de Series Temporales */}
              {variablesDisponibles.length > 0 && (
                <div className="mb-4 ml-10 mr-10">
                  <h5>Gráficos de Series Temporales</h5>
                  {chartStartDate && chartEndDate && (
                    <p className="text-sm text-muted mb-3">
                      Período: {new Date(chartStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(chartEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                  
                  {/* Mostrar todos los gráficos */}
                  <div className="space-y-6">
                    {variablesDisponibles.map((variable) => {
                      // Crear ref para este gráfico si no existe
                      if (!chartRefs.current.has(variable.nombre)) {
                        chartRefs.current.set(variable.nombre, null as any)
                      }
                      
                      // Usar el primer sistema donde aparece la variable, o intentar todos si hay múltiples
                      // El componente SensorTimeSeriesChart buscará datos por cliente primero, luego por proceso
                      const primarySystemName = variable.sistemas && variable.sistemas.length > 0 
                        ? variable.sistemas[0] 
                        : undefined;

                      return (
                      <div key={variable.id} className="border rounded-lg p-4 bg-white">
                        <div>
                          {chartStartDate && chartEndDate && (
                            <div className="max-w-4xl [&_svg]:max-h-96">
                              <SensorTimeSeriesChart
                                ref={(ref) => {
                                  if (ref) {
                                    chartRefs.current.set(variable.nombre, ref)
                                  }
                                }}
                                variable={variable.nombre}
                                startDate={chartStartDate}
                                endDate={chartEndDate}
                                apiBase={API_BASE_URL}
                                unidades={variable.unidad}
                                clientName={reportSelection?.plant?.nombre}
                                processName={primarySystemName}
                                userId={reportSelection?.user?.id}
                                medicionesFromReportes={chartDataFromReportes[variable.nombre] || []}
                              />
                            </div>
                          )}
                        </div>
                        
                        {/* Sección de comentarios por parámetro - Solo mostrar si hay contenido o si no es cliente */}
                        {(userRole !== "client" || (parameterComments[variable.nombre] && parameterComments[variable.nombre].trim() !== "")) && (
                          <div className="mt-4 pt-4 border-t">
                            <label htmlFor={`comment-${variable.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                              Comentarios para {variable.nombre}:
                            </label>
                            <textarea
                              id={`comment-${variable.id}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              rows={3}
                              placeholder="Agregar comentarios sobre este parámetro..."
                              value={parameterComments[variable.nombre] || ""}
                              onChange={(e) => userRole !== "client" && handleParameterCommentChange(variable.nombre, e.target.value)}
                              disabled={userRole === "client"}
                              readOnly={userRole === "client"}
                            />
                          </div>
                        )}
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Tablas Históricas por Sistema */}
              {reportSelection?.parameters && Object.keys(reportSelection.parameters).length > 0 && (
                <div className="mb-4 ml-10 mr-10">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="mb-0">Historial de Reportes por Sistema</h5>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeTableInPDF"
                        checked={includeTableInPDF}
                        onChange={(e) => userRole !== "client" && setIncludeTableInPDF(e.target.checked)}
                        disabled={userRole === "client"}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="includeTableInPDF" className="text-sm text-gray-700 cursor-pointer">
                        Incluir tabla en PDF
                      </label>
                    </div>
                  </div>
                  {chartStartDate && chartEndDate && (
                    <p className="text-sm text-muted mb-3">
                      Período: {new Date(chartStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(chartEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}                    </p>
                  )}
                  
                  {orderedSystemNames.map((systemName) => {
                    const parameters = systemParameters[systemName] || []
                    const historicalData = historicalDataBySystem[systemName] || {}
                    const isLoading = historicalLoading[systemName] || false
                    const error = historicalError[systemName]
                    const sortedDates = Object.keys(historicalData).sort((a, b) => 
                      new Date(a).getTime() - new Date(b).getTime()
                    )
                    const highLowValues = getHighLowValues(systemName, parameters)
                    
                    // Si no hay parámetros y no está cargando, intentar cargarlos
                    if (parameters.length === 0 && !isLoading) {
                      if (reportSelection && chartStartDate && chartEndDate) {
                        fetchHistoricalDataForSystem(systemName)
                      }
                      return (
                        <div key={systemName} className="mb-6">
                          <h6 className="mb-3 font-semibold">Sistema: {systemName}</h6>
                          <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>
                        </div>
                      )
                    }
                    
                    if (parameters.length === 0) return null
                    
                    return (
                      <div key={systemName} className="mb-6">
                        <h6 className="mb-3 font-semibold">Sistema: {systemName}</h6>
                        {isLoading ? (
                          <div className="flex items-center justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          </div>
                        ) : error ? (
                          <div className="bg-red-50 border border-red-200 rounded-md p-4">
                            <p className="text-sm text-red-700">{error}</p>
                          </div>
                        ) : sortedDates.length === 0 ? (
                          <div className="text-center py-10 text-gray-500">
                            No se encontraron datos históricos para el rango de fechas seleccionado.
                          </div>
                        ) : (
                          <div className="w-full overflow-x-auto">
                            <table className="w-full border border-gray-300 bg-white text-xs table-fixed">
                              <thead>
                                <tr className="bg-blue-800 text-white">
                                  <th className="border px-2 py-2 text-left font-semibold w-24">
                                    PARAMETROS
                                  </th>
                                  {parameters.map((param) => (
                                    <th key={param.id} className="border px-1 py-2 text-center font-semibold">
                                      <div className="text-xs">{param.nombre}</div>
                                      <div className="text-xs font-normal">({param.unidad})</div>
                                    </th>
                                  ))}
                                  <th className="border px-2 py-2 text-left font-semibold w-32">COMENTARIOS</th>
                                </tr>
                              </thead>
                              <tbody>
                                {/* Fila ALTO */}
                                <tr className="bg-green-100">
                                  <td className="border px-2 py-2 font-semibold bg-green-100">
                                    ALTO
                                  </td>
                                  {parameters.map((param) => (
                                    <td key={param.id} className="border px-1 py-2 text-center text-xs">
                                      {highLowValues[param.id]?.alto.toFixed(2) || "—"}
                                    </td>
                                  ))}
                                  <td className="border px-2 py-2 text-xs">—</td>
                                </tr>
                                {/* Fila BAJO */}
                                <tr className="bg-green-100">
                                  <td className="border px-2 py-2 font-semibold bg-green-100">
                                    BAJO
                                  </td>
                                  {parameters.map((param) => (
                                    <td key={param.id} className="border px-1 py-2 text-center text-xs">
                                      {highLowValues[param.id]?.bajo.toFixed(2) || "—"}
                                    </td>
                                  ))}
                                  <td className="border px-2 py-2 text-xs">—</td>
                                </tr>
                                {/* Fila RANGOS */}
                                <tr className="bg-blue-800 text-white">
                                  <td className="border px-2 py-2 font-semibold bg-blue-800">
                                    FECHA/RANGOS
                                  </td>
                                  {parameters.map((param) => (
                                    <td key={param.id} className="border px-1 py-2 text-center text-xs">
                                      {getAcceptableRange(systemName, param.id)}
                                    </td>
                                  ))}
                                  <td className="border px-2 py-2 text-xs">—</td>
                                </tr>
                                {/* Filas de datos por fecha */}
                                {sortedDates.map((fecha, index) => {
                                  const dateData = historicalData[fecha]
                                  const isEven = index % 2 === 0
                                  return (
                                    <tr
                                      key={fecha}
                                      className={isEven ? "bg-green-50" : "bg-pink-50"}
                                    >
                                      <td className={`border px-2 py-2 font-medium text-xs ${
                                        isEven ? "bg-green-50" : "bg-pink-50"
                                      }`}>
                                        {formatDate(fecha)}
                                      </td>
                                      {parameters.map((param) => {
                                        // Usar param.id para buscar valores (igual que dashboard-historicos)
                                        const value = dateData[param.id]
                                        const valor = value && typeof value === 'object' && 'valor' in value ? value.valor : undefined
                                        const isOutOfRange = valor !== undefined && isValueOutOfRange(systemName, param.id, valor)
                                        
                                        return (
                                          <td
                                            key={param.id}
                                            className={`border px-1 py-2 text-center text-xs ${
                                              isOutOfRange ? "bg-yellow-300 font-semibold" : ""
                                            }`}
                                          >
                                            {valor !== undefined ? valor.toFixed(2) : "—"}
                                          </td>
                                        )
                                      })}
                                      <td className={`border px-2 py-2 text-xs ${
                                        isEven ? "bg-green-50" : "bg-pink-50"
                                      }`}>
                                        {parseCommentDisplay(dateData.comentarios_globales)}
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              </div>
               {/* Footer Image */}
                <div id="footer-img" className="text-center">
                  {imagesLoaded ? (
                    <Image
                      src="/images/footer-textless.png"
                      alt="Footer del reporte"
                      width={800}
                      height={100}
                      className="w-100"
                      style={{ width: "100%", height: "auto", objectFit: "cover" }}
                    />
                  ) : (
                    <div className="bg-secondary text-white py-4" style={{ minHeight: "100px" }}>
                      <div className="d-flex flex-column justify-content-center h-100">
                        <h6>FOOTER IMAGE</h6>
                        <small>Coloca footer-textless.png en /public/images/reports/</small>
                      </div>
                    </div>
                  )}
                </div>
              {/* Instructions for images */}
              {!imagesLoaded && (
                <div className="alert alert-info">
                  <h6>📁 Para mostrar las imágenes del reporte:</h6>
                  <ol className="mb-0">
                    <li>
                      Crea la carpeta: <code>public/images/reports/</code>
                    </li>
                    <li>
                      Coloca tus imágenes:
                      <ul>
                        <li>
                          <code>header.jpeg</code> - Imagen de encabezado
                        </li>
                        <li>
                          <code>footer-textless.png</code> - Imagen de pie de página
                        </li>
                      </ul>
                    </li>
                    <li>Recarga la página</li>
                  </ol>
                </div>
               )}
              
               </div>
             </div>
           </div>
          </div>
       

        {/* Action Buttons */}
        <div className="container py-4">
          <div className="text-center">
            <div className="btn-group" role="group">
              <Link href="/dashboard" className="btn btn-secondary">
                <i className="material-icons me-2">arrow_back</i>
                Volver
              </Link>
                {/* <button className="btn btn-warning" onClick={enableEditing}>
                  <i className="material-icons me-2">edit</i>
                  Editar
                </button> */}
              {/* <button
                className="btn btn-info me-2"
                onClick={() => {
                  try {
                    const doc = new jsPDF()
                    doc.text("Prueba de PDF", 20, 20)
                    doc.save("prueba.pdf")
                    alert("Prueba exitosa!")
                  } catch (error) {
                    console.error("Error en prueba:", error)
                    alert(`Error en prueba: ${error}`)
                  }
                }}
              >
                <i className="material-icons me-2">bug_report</i>
                Prueba PDF
              </button> */}
              {/* Botón Guardar - Solo para no clientes */}
              {userRole !== "client" && (
                <button 
                  className="btn btn-success"
                  onClick={handleSaveReport}
                  disabled={isSaving || isDownloading}
                >
                  {isSaving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="material-icons me-2">save</i>
                      Guardar
                    </>
                  )}
                </button>
              )}
              {/* Botón Descargar PDF - Disponible para todos, incluyendo clientes */}
              <button 
                className="btn btn-danger"
                onClick={handleDownloadPDF}
                disabled={isSaving || isDownloading}
              >
                {isDownloading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <i className="material-icons me-2">download</i>
                    Descargar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <ScrollArrow />
    </ProtectedRoute>
  )
}
