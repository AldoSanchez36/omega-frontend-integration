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
  parameters: {
    [systemName: string]: {
      [parameterName: string]: {
        valor: number;
        unidad: string;
        valorOriginal?: number;
        formulaAplicada?: string;
        calculado?: boolean;
      };
    };
  };
  variablesTolerancia: {
    [systemName: string]: {
      [parameterId: string]: {
        limite_min: number | null;
        limite_max: number | null;
        bien_min: number | null;
        bien_max: number | null;
        usar_limite_min: boolean;
        usar_limite_max: boolean;
      };
    };
  };
  parameterComments?: {
    [variableName: string]: string;
  };
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
  
  // Estado para comentarios por parámetro/variable
  const [parameterComments, setParameterComments] = useState<{ [variableName: string]: string }>({})
  
  // Estado para gráficos
  const [selectedVariableForChart, setSelectedVariableForChart] = useState<string>("")
  
  // Refs para exportar gráficos directamente desde los componentes
  const chartRefs = useRef<Map<string, ChartExportRef>>(new Map())
  
  // Función para obtener o crear ref para un gráfico
  const getChartRef = (variableName: string): ChartExportRef | null => {
    return chartRefs.current.get(variableName) || null
  }
  
  // Función para manejar cambios en comentarios de parámetros
  const handleParameterCommentChange = (variableName: string, comment: string) => {
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
        setUserRole(userData.puesto || "user")
      } catch (error) {
        console.error("Error parsing user data:", error)
      }
    }

    // Obtener reportSelection
    try {
    const reportSelectionRaw = localStorage.getItem("reportSelection");
    const parsedReportSelection = reportSelectionRaw ? JSON.parse(reportSelectionRaw) : null;
    console.log("📄 Reports - Datos recibidos del localStorage:", parsedReportSelection);
    console.log("📊 Reports - Parámetros recibidos:", parsedReportSelection?.parameters);
    console.log("📊 Reports - Tolerancias recibidas:", parsedReportSelection?.variablesTolerancia);
    setReportSelection(parsedReportSelection);
    
    // Cargar comentarios guardados si existen
    if (parsedReportSelection?.parameterComments) {
      setParameterComments(parsedReportSelection.parameterComments);
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

  const handleNoteChange = (key: string, value: string) => {
    setReportNotes((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const enableEditing = () => {
    setIsEditing(true)
  }

  const generatePDF = async () => {
    try {
      console.log("Generando PDF...")

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
      
      // Add metadata if available
      if (reportSelection?.user) {
        doc.text(`Planta: ${reportSelection.user.username}`, 20, 85)
        doc.text(`Sistema: ${reportSelection.systemName}`, 20, 95)
        doc.text(`Generado por: ${reportSelection.user.username}`, 20, 105)
      }

      let currentY = reportSelection?.user ? 120 : 90

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

      // Crear tabla comparativa
      const allParams = new Set<string>();
      Object.values(reportSelection?.parameters || {}).forEach((systemData: any) => {
        Object.keys(systemData).forEach(variable => allParams.add(variable));
      });

      const systemNames = Object.keys(reportSelection?.parameters || {});
      const tableHeaders = ["Parámetro", ...systemNames];
      const tableData = Array.from(allParams).map((paramName: string) => {
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

      // Datos detallados por sistema
      (Object.entries(reportSelection?.parameters || {}) as [string, any][]).forEach(([systemName, parameters]: [string, any]) => {
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

      console.log("PDF generado exitosamente:", fileName)
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
    try {
      console.log("💾 Iniciando proceso de guardado de reporte...")
      
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
        parameters: reportSelection.parameters || [],
        comentarios: reportSelection.comentarios || "",
        fecha: reportSelection.fecha || new Date().toISOString().split('T')[0],
        generatedDate: reportSelection.generatedDate || new Date().toISOString(),
        user: {
          id: reportSelection.user?.id,
          username: reportSelection.user?.username,
          email: reportSelection.user?.email,
          puesto: reportSelection.user?.puesto
        },
        cliente_id: reportSelection.user?.id,
        parameterComments: parameterComments // Incluir comentarios por parámetro
      }

      console.log("📋 Payload completo que se enviará al servidor:")
      console.log(JSON.stringify(reportDataToSend, null, 2))

      // Enviar el reportSelection completo al endpoint
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.REPORTS}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reportDataToSend)
      })

      console.log("📡 Respuesta del servidor:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        let errorData = {}
        let errorText = ""
        
        try {
          errorData = await response.json()
          console.error("❌ Error del servidor (JSON):", errorData)
        } catch {
          errorText = await response.text()
          console.error("❌ Error del servidor (texto):", errorText)
        }
        
        throw new Error(`Error del servidor: ${response.status} - ${JSON.stringify(errorData) || errorText}`)
      }

      const result = await response.json()
      console.log("✅ Reporte guardado exitosamente:", result)
      
      // Ahora guardar las mediciones individuales por parámetro
      if (reportSelection.parameters && reportSelection.fecha) {
        console.log("💾 Guardando mediciones individuales por parámetro...")
        
        try {
          // Obtener todos los sistemas de la planta para mapear nombres a IDs
          const systemsResponse = await fetch(
            `${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT_NAME(reportSelection.plant?.nombre || "")}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          )
          
          let systemsMap: Record<string, { id: string; nombre: string }> = {}
          if (systemsResponse.ok) {
            const systemsData = await systemsResponse.json()
            const systemsList = systemsData.procesos || systemsData || []
            systemsList.forEach((sys: any) => {
              systemsMap[sys.nombre] = { id: sys.id, nombre: sys.nombre }
            })
          }
          
          // Crear array de promesas para obtener variables de cada sistema
          const variablePromises = Object.entries(reportSelection.parameters).map(async ([systemName, systemParams]: [string, any]) => {
            const systemInfo = systemsMap[systemName]
            if (!systemInfo) {
              console.warn(`⚠️ Sistema "${systemName}" no encontrado, saltando...`)
              return { systemName, variables: null, systemParams: null }
            }
            
            // Obtener parámetros del sistema para mapear nombres a IDs
            try {
              const varsResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.VARIABLES_BY_SYSTEM(systemInfo.id)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
              })
              
              if (!varsResponse.ok) {
                console.error(`❌ Error obteniendo variables del sistema ${systemName}`)
                return { systemName, variables: null, systemParams: null }
              }
              
              const varsData = await varsResponse.json()
              const variablesList = varsData.variables || varsData || []
              const variablesMap: Record<string, { id: string; nombre: string }> = {}
              variablesList.forEach((v: any) => {
                variablesMap[v.nombre] = { id: v.id, nombre: v.nombre }
              })
              
              return { systemName, variables: variablesMap, systemParams, systemInfo }
            } catch (error) {
              console.error(`❌ Error obteniendo variables del sistema ${systemName}:`, error)
              return { systemName, variables: null, systemParams: null }
            }
          })
          
          // Esperar a que se obtengan todas las variables
          const systemsData = await Promise.all(variablePromises)
          
          // Crear array de mediciones a guardar
          const measurementsToSave: any[] = []
          
          systemsData.forEach(({ systemName, variables, systemParams, systemInfo }) => {
            if (!variables || !systemParams || !systemInfo) return
            
            // Iterar sobre cada parámetro del sistema
            Object.entries(systemParams).forEach(([parameterName, paramData]: [string, any]) => {
              const variableInfo = variables[parameterName]
              if (!variableInfo) {
                console.warn(`⚠️ Variable "${parameterName}" no encontrada en sistema "${systemName}", saltando...`)
                return
              }
              
              // Normalizar fecha a formato YYYY-MM-DD
              let fechaNormalizada = reportSelection.fecha
              if (fechaNormalizada) {
                // Si viene como ISO string completo, extraer solo la fecha
                if (fechaNormalizada.includes('T')) {
                  fechaNormalizada = fechaNormalizada.split('T')[0]
                }
                // Si viene en otro formato, intentar parsearlo
                const fechaDate = new Date(fechaNormalizada)
                if (!isNaN(fechaDate.getTime())) {
                  fechaNormalizada = fechaDate.toISOString().split('T')[0]
                }
              }
              
              // Obtener comentario del parámetro si existe
              const parameterComment = parameterComments[parameterName] || reportSelection.comentarios || ""
              
              // Crear medición individual
              const measurement = {
                fecha: fechaNormalizada,
                comentarios: parameterComment,
                valor: paramData.valor,
                variable_id: variableInfo.id,
                proceso_id: systemInfo.id,
                sistema: systemName, // Usar el nombre del sistema como sistema (S01, S02, etc.)
                usuario_id: reportSelection.user?.id || null,
                planta_id: reportSelection.plant?.id || null,
              }
              
              console.log(`📝 Creando medición: ${parameterName} - ${systemName} - Fecha: ${fechaNormalizada} - Comentario: ${parameterComment}`)
              
              measurementsToSave.push(measurement)
            })
          })
          
          // Guardar todas las mediciones
          if (measurementsToSave.length > 0) {
            console.log(`📊 Guardando ${measurementsToSave.length} mediciones...`)
            
            const saveResults = await Promise.allSettled(
              measurementsToSave.map(async (measurement) => {
                const measResponse = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify(measurement)
                })
                
                if (!measResponse.ok) {
                  const errorData = await measResponse.json().catch(() => ({}))
                  throw new Error(`Error ${measResponse.status}: ${JSON.stringify(errorData)}`)
                }
                
                return measResponse.json()
              })
            )
            
            const successful = saveResults.filter(r => r.status === 'fulfilled').length
            const failed = saveResults.filter(r => r.status === 'rejected').length
            
            console.log(`✅ ${successful} mediciones guardadas exitosamente`)
            if (failed > 0) {
              console.warn(`⚠️ ${failed} mediciones fallaron al guardarse`)
              saveResults.forEach((result, index) => {
                if (result.status === 'rejected') {
                  console.error(`❌ Error guardando medición ${index + 1}:`, result.reason)
                }
              })
            }
            
            if (failed === 0) {
              alert("✅ Reporte y mediciones guardados exitosamente en el sistema")
            } else {
              alert(`✅ Reporte guardado. ${successful} mediciones guardadas, ${failed} fallaron.`)
            }
          } else {
            console.warn("⚠️ No se encontraron mediciones para guardar")
            alert("✅ Reporte guardado exitosamente en el sistema")
          }
        } catch (error) {
          console.error("❌ Error guardando mediciones individuales:", error)
          alert("✅ Reporte guardado, pero hubo errores al guardar las mediciones individuales")
        }
      } else {
        alert("✅ Reporte guardado exitosamente en el sistema")
      }
      
    } catch (error) {
      console.error("❌ Error en handleSaveReport:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
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
      
      console.log(`📸 Exportando gráfico desde componente: ${variableName}`);
      const imageData = await chartRef.exportAsImage();
      
      if (imageData) {
        console.log(`✅ Gráfico ${variableName} exportado: ${(imageData.length / 1024).toFixed(2)}KB`);
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
      console.log("🎯 Iniciando generación de PDF con jsPDF y AutoTable...");
      
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

      // Capturar y agregar gráficos
      console.log("📊 Buscando sección de gráficos...");
      
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
        const periodText = `Período: ${new Date(pdfChartStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(pdfChartEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} (Últimos 12 meses)`;
        pdf.text(periodText, marginLeft, currentY);
        currentY += spacingMM;
      }
      
      // Exportar gráficos directamente desde los componentes usando refs
      if (hasCharts && variablesDisponibles.length > 0) {
        console.log(`📊 Exportando ${variablesDisponibles.length} gráficos desde componentes...`);
        
        // Esperar un momento para que los gráficos se rendericen completamente
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        for (let i = 0; i < variablesDisponibles.length; i++) {
          const variable = variablesDisponibles[i];
          const variableName = variable.nombre;
          const chartTitle = `${variableName} (${variable.unidad})`;
          
          console.log(`📸 Exportando gráfico ${i + 1}/${variablesDisponibles.length}: ${chartTitle}`);
          
          // Exportar gráfico desde el componente usando ref
          const chartData = await exportChartFromComponent(variableName);
          
          if (chartData) {
            console.log(`✅ Gráfico ${i + 1} exportado exitosamente`);
            
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
                
                console.log(`✅ Gráfico ${i + 1} agregado al PDF`);
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
      } else {
        console.log("ℹ️ No hay gráficos para exportar");
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

      // Detalles de mediciones
      if (reportSelection.user) {
        currentY = checkSpaceAndAddPage(30, currentY);
        pdf.setFontSize(14);
        pdf.text("Detalles de Mediciones", marginLeft, currentY);
        currentY += 8;
        pdf.setFontSize(10);
        pdf.text(`Planta: ${reportSelection.user.username}`, marginLeft, currentY);
        currentY += 5;
        pdf.text(`Sistema: ${reportSelection.systemName}`, marginLeft, currentY);
        currentY += 5;
        pdf.text(`Generado por: ${reportSelection.user.username}`, marginLeft, currentY);
        currentY += 5;
        pdf.text(`Fecha de generación: ${(reportSelection?.generatedDate ? new Date(reportSelection.generatedDate) : new Date()).toLocaleString('es-ES')}`, marginLeft, currentY);
        currentY += spacingMM;
    }

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
    console.log("💾 Descargando PDF:", fileName);
    pdf.save(fileName);
    
    console.log("✅ PDF descargado exitosamente");
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
    try {
      console.log("📄 Iniciando descarga de PDF...")
      
      // Validar que tenemos datos del reporte
      if (!reportSelection) {
        alert("No hay datos de reporte disponibles")
        return
      }

      // Generar y descargar el PDF directamente
      console.log("📄 Generando PDF...")
      await exportDOMToPDF(reportSelection)
      
    } catch (error) {
      console.error("❌ Error en handleDownloadPDF:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
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

  // Obtener variables disponibles para gráficos desde parameters con sus unidades
  const variablesDisponibles = (() => {
    const variablesMap = new Map<string, string>(); // Map<variableName, unidad>
    
    Object.values(reportSelection?.parameters || {}).forEach((systemData: any) => {
      Object.entries(systemData).forEach(([variableName, paramData]: [string, any]) => {
        // Si la variable ya existe, mantener la unidad existente o usar la nueva si no tenía
        if (!variablesMap.has(variableName) && paramData?.unidad) {
          variablesMap.set(variableName, paramData.unidad);
        }
      });
    });
    
    return Array.from(variablesMap.entries()).map(([nombre, unidad]) => ({
      id: nombre, // Usar el nombre como ID para los gráficos
      nombre: nombre,
      unidad: unidad
    }));
  })();
  
  // Calcular fechas para los últimos 12 meses (solo en cliente)
  const [chartStartDate, setChartStartDate] = useState<string>("")
  const [chartEndDate, setChartEndDate] = useState<string>("")
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const today = new Date()
    const endDate = today.toISOString().split('T')[0]
    const startDateObj = new Date(today)
    startDateObj.setMonth(today.getMonth() - 12)
    const startDate = startDateObj.toISOString().split('T')[0]
    
    setChartStartDate(startDate)
    setChartEndDate(endDate)
  }, [])

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
            {reportSelection?.user && (
              <div className="mt-2">
                <small>
                  <strong>Planta:</strong> {reportSelection.user.username} | 
                  <strong> Sistema:</strong> {reportSelection.systemName} | 
                  <strong> Generado por:</strong> {reportSelection.user.username}
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
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => handleNoteChange("dirigido", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "300px", display: "inline-block" }}
                      >
                        {reportNotes["dirigido"] || reportSelection?.plant?.dirigido_a || "ING."}
                      </span>
                    </p>

                    <p>
                      <strong>Asunto: </strong>
                      <span
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => handleNoteChange("asunto", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "400px", display: "inline-block" }}
                      >
                        {reportNotes["asunto"] || reportSelection?.plant?.mensaje_cliente ||
                          `REPORTE DE ANÁLISIS PARA TODOS LOS SISTEMAS EN LA PLANTA DE ${(reportSelection?.plant?.nombre) || "NOMBRE DE LA PLANTA"}`}
                      </span>
                    </p>

                    <p>
                      <strong>Sistema Evaluado: </strong>
                      <span
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => handleNoteChange("sistema", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "300px", display: "inline-block" }}
                      >
                        {reportNotes["sistema"] || (reportSelection?.systemName ?? "Todos los sistemas")}
                      </span>
                    </p>

                    <p>
                      <strong>Fecha de muestra: </strong>
                      <span
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onBlur={(e) => handleNoteChange("fecha_muestra", e.currentTarget.innerText)}
                        className="border-bottom"
                        style={{ minWidth: "200px", display: "inline-block" }}
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

              {/* Gráficos de Series Temporales */}
              {variablesDisponibles.length > 0 && (
                <div className="mb-4 ml-10 mr-10">
                  <h5>Gráficos de Series Temporales</h5>
                  {chartStartDate && chartEndDate && (
                    <p className="text-sm text-muted mb-3">
                      Período: {new Date(chartStartDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(chartEndDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} (Últimos 12 meses)
                    </p>
                  )}
                  
                  {/* Mostrar todos los gráficos */}
                  <div className="space-y-6">
                    {variablesDisponibles.map((variable) => {
                      // Crear ref para este gráfico si no existe
                      if (!chartRefs.current.has(variable.nombre)) {
                        chartRefs.current.set(variable.nombre, null as any)
                      }
                      
                      return (
                      <div key={variable.id} className="border rounded-lg p-4 bg-white">
                        <h3 className="text-lg font-semibold mb-4">{variable.nombre} ({variable.unidad})</h3>
                        
                        <div>
                          <h4 className="text-md font-medium mb-2">Gráfico de Series Temporales</h4>
                          {chartStartDate && chartEndDate && (
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
                              processName={reportSelection?.systemName}
                              userId={reportSelection?.user?.id}
                            />
                          )}
                        </div>
                        
                        {/* Sección de comentarios por parámetro */}
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
                            onChange={(e) => handleParameterCommentChange(variable.nombre, e.target.value)}
                          />
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {reportSelection?.comentarios && (
                <div className="mb-2 ml-10 mr-10">
                  <strong>Comentarios globales:</strong> {reportSelection.comentarios}
                </div>
              )}

              {/* Detailed Measurements Section */}
              {reportSelection?.user && (
                <div className="mb-4 ml-10 mr-10">
                  <h5>Detalles de Mediciones</h5>
                  <div className="card">
                    <div className="card-body">
                      <div className="row">
                        <div className="col-md-6">
                          <p><strong>Planta:</strong> {reportSelection.user.username}</p>
                          <p><strong>Sistema:</strong> {reportSelection.systemName}</p>
                        </div>
                        <div className="col-md-6">
                          <p><strong>Generado por:</strong> {reportSelection.user.username}</p>
                          <p><strong>Fecha de generación:</strong> {reportSelection?.generatedDate ? new Date(reportSelection.generatedDate).toLocaleString('es-ES') : currentDate}</p>
                        </div>
                      </div>
                    </div>
                  </div>
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
              {userRole !== "client" && (
                <>
                  <button 
                    className="btn btn-success"
                    onClick={handleSaveReport}
                  >
                    <i className="material-icons me-2">save</i>
                    Guardar
                  </button>
                  <button 
                    className="btn btn-danger"
                    onClick={handleDownloadPDF}
                  >
                    <i className="material-icons me-2">download</i>
                    Descargar PDF
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
