"use client"

import ProtectedRoute from "@/components/ProtectedRoute"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import Navbar from "@/components/Navbar"
import html2canvas from "html2canvas"
import { SensorTimeSeriesChart } from "@/components/SensorTimeSeriesChart"
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

interface Medicion {
  id: string;
  fecha: string;
  valor: number;
  variable_id: string;
  proceso_id: string;
  sistema: string;
  comentarios?: string;
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
  parameters: ReportParameter[];
  mediciones: Medicion[];
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
  
  // Estado para gráficos
  const [selectedVariableForChart, setSelectedVariableForChart] = useState<string>("")

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

    // Obtener usuario y rol
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('Organomex_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserRole(userData.puesto || "user")
      }
    }

    // Obtener reportSelection
    const reportSelectionRaw = localStorage.getItem("reportSelection");
    setReportSelection(reportSelectionRaw ? JSON.parse(reportSelectionRaw) : null);

    // Obtener fecha actual
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
      doc.text(`Dirigido a: ${reportNotes["dirigido"] || "ING. ABDIEL ZENTELLA"}`, 20, 45)
      doc.text(`Asunto: ${reportNotes["asunto"] || "REPORTE DE ANÁLISIS PARA TODOS LOS SISTEMAS"}`, 20, 55)
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
      (reportSelection?.parameters || []).forEach((param: any) => {
        if (param.checked) allParams.add(param.nombre);
      });

      // Since parameters is an array, we need to group by system
      // This is a placeholder - you'll need to adjust based on your actual data structure
      const systemNames: string[] = [];
      const tableHeaders = ["Parámetro", ...systemNames.map((_, idx) => `S${idx + 1}`)];
      const tableData = Array.from(allParams).map((paramName: string) => {
        const row: string[] = [paramName];
        systemNames.forEach((systemName: string) => {
          // Find parameters for this specific system
          // This is a placeholder - adjust based on how your data is structured
          const systemParam = reportSelection?.parameters?.find((param: ReportParameter) => 
            param.nombre === paramName
            // && param.systemName === systemName // Add system identification if available
          );
          const value = systemParam ? systemParam.limite_min?.toString() || systemParam.limite_max?.toString() || "N/A" : "—";
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
        const systemTableData = (parameters as any[])
          .filter((param: any) => param.checked)
          .map((param: any) => [param.name, param.value || "N/A", param.unit]);
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

  // Función para descargar el reporte en PDF
  const handleDownloadPDF = async () => {
    try {
      console.log("🚀 Iniciando proceso de guardado de reporte...")
      
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

      // Obtener el proceso_id basado en el nombre de la planta
      let proceso_id = null
      
      console.log("🔍 Verificando datos para consulta de procesos:")
      console.log("reportSelection.plant?.nombre:", reportSelection.plant?.nombre)
      console.log("reportSelection.systemName:", reportSelection.systemName)
      console.log("¿Tiene planta?:", !!reportSelection.plant?.nombre)
      console.log("¿Tiene systemName?:", !!reportSelection.systemName)
      
      if (reportSelection.plant?.nombre && reportSelection.systemName) {
        try {
          console.log("🔍 Obteniendo proceso_id para:", {
            planta: reportSelection.plant.nombre,
            systemName: reportSelection.systemName
          })

          const endpoint = `${API_BASE_URL}${API_ENDPOINTS.SYSTEMS_BY_PLANT_NAME(reportSelection.plant.nombre)}`
          console.log("🌐 Endpoint a consultar:", endpoint)

          const procesosResponse = await fetch(endpoint, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })

          console.log("📡 Respuesta de procesos:", {
            status: procesosResponse.status,
            statusText: procesosResponse.statusText,
            ok: procesosResponse.ok
          })

          if (procesosResponse.ok) {
            const procesos = await procesosResponse.json()
            console.log("📋 Procesos encontrados:", procesos)
            console.log("🔍 Buscando proceso con nombre:", reportSelection.systemName)

            // Buscar el proceso que coincida con el systemName
            const procesoEncontrado = procesos.find((proceso: any) => {
              console.log("Comparando:", {
                procesoNombre: proceso.nombre,
                systemName: reportSelection.systemName,
                coincide: proceso.nombre === reportSelection.systemName
              })
              return proceso.nombre === reportSelection.systemName
            })

            if (procesoEncontrado) {
              proceso_id = procesoEncontrado.id
              console.log("✅ Proceso encontrado:", {
                id: proceso_id,
                nombre: procesoEncontrado.nombre
              })
            } else {
              console.warn("⚠️ No se encontró proceso con systemName:", reportSelection.systemName)
              console.log("📋 Procesos disponibles:", procesos.map((p: any) => p.nombre))
            }
          } else {
            console.warn("⚠️ Error obteniendo procesos:", procesosResponse.status)
            const errorText = await procesosResponse.text()
            console.error("❌ Error detallado:", errorText)
          }
        } catch (error) {
          console.warn("⚠️ Error consultando procesos:", error)
        }
      } else {
        console.log("⚠️ No se puede consultar procesos - datos faltantes:", {
          tienePlanta: !!reportSelection.plant?.nombre,
          tieneSystemName: !!reportSelection.systemName
        })
      }

      // Preparar el reportSelection completo para enviar
      const reportDataToSend = {
        ...reportSelection,
        // Asegurar que tenemos todos los campos necesarios
        plant: {
          id: reportSelection.plant?.id,
          nombre: reportSelection.plant?.nombre,
          systemName: reportSelection.systemName
        },
        parameters: reportSelection.parameters || [],
        mediciones: reportSelection.mediciones || [],
        comentarios: reportSelection.comentarios || "",
        fecha: reportSelection.fecha || new Date().toISOString().split('T')[0],
        generatedDate: reportSelection.generatedDate || new Date().toISOString(),
        user: {
          id: reportSelection.user?.id, // Usuario conectado que está generando el reporte
          username: reportSelection.user?.username,
          email: reportSelection.user?.email,
          puesto: reportSelection.user?.puesto
        },
        proceso_id: proceso_id // Agregar el proceso_id obtenido
      }

      console.log("👤 Usuario generador:", reportDataToSend.user)
      console.log("🆔 ID del usuario generador:", reportDataToSend.user.id)
      console.log("📄 Datos del reporte a enviar:", reportDataToSend)
      console.log("🔍 Proceso ID obtenido:", proceso_id)
      console.log("📋 Payload completo que se enviará al servidor:")
      console.log(JSON.stringify(reportDataToSend, null, 2))

      // Verificar que el proceso_id esté incluido
      if (reportDataToSend.proceso_id) {
        console.log("✅ Proceso ID incluido en el payload:", reportDataToSend.proceso_id)
      } else {
        console.warn("⚠️ Proceso ID NO incluido en el payload")
      }

      // Enviar el reportSelection completo al nuevo endpoint
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

      // Generar y descargar el PDF
      const doc = new jsPDF("p", "pt", "a4")
    
      const reportElement = document.getElementById("reporte-pdf")
      if (!reportElement) {
        throw new Error("Elemento del reporte no encontrado")
      }
    
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
      })
    
      const imgData = canvas.toDataURL("image/png")
      const imgProps = doc.getImageProperties(imgData)
      const pdfWidth = doc.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width
    
      doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
      
      // Generar nombre de archivo con timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
      const fileName = `Reporte_${reportSelection.plant?.nombre || 'General'}_${timestamp}.pdf`
      
      //doc.save(fileName)
      
      alert("✅ Reporte guardado y PDF descargado exitosamente!")
      
    } catch (error) {
      console.error("❌ Error en handleDownloadPDF:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  // Función para obtener el color de celda según los límites
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
    // Verde: bien
    if (bien_min !== null && bien_max !== null && valor >= bien_min && valor <= bien_max) {
      return "#C5EECE";
    }
    // Amarillo: cerca de límite inferior
    if (
      usar_limite_min &&
      limite_min !== null && bien_min !== null &&
      valor >= limite_min && valor < bien_min
    ) {
      return "#FFEB9C";
    }
    // Amarillo: cerca de límite superior
    if (
      usar_limite_max &&
      limite_max !== null && bien_max !== null &&
      valor > bien_max && valor <= limite_max
    ) {
      return "#FFEB9C";
    }
    // Rojo: fuera de rango
    if (
      (bien_min !== null && valor < bien_min && (!usar_limite_min || limite_min === null || valor < limite_min)) ||
      (bien_max !== null && valor > bien_max && (!usar_limite_max || limite_max === null || valor > limite_max)) ||
      (usar_limite_min && limite_min !== null && valor < limite_min) ||
      (usar_limite_max && limite_max !== null && valor > limite_max)
    ) {
      return "#FFC6CE";
    }
    return "";
  }

  // Obtener todos los sistemas únicos de las mediciones
  const sistemasUnicos = Array.from(
    new Set(
      (reportSelection?.mediciones || []).flatMap((med: any) => Object.keys(med.valores || {}))
    )
  ).sort();

  // Función auxiliar para agrupar mediciones por parámetro
  const agruparMedicionesPorParametro = () => {
    const mediciones = reportSelection?.mediciones || [];
    const parametrosAgrupados: Record<string, any[]> = {};
    
    // Agrupar mediciones por variable_id
    mediciones.forEach((med: any) => {
      if (!parametrosAgrupados[med.variable_id]) {
        parametrosAgrupados[med.variable_id] = [];
      }
      parametrosAgrupados[med.variable_id].push(med);
    });
    
    // Convertir a array de objetos con valores combinados
    return Object.entries(parametrosAgrupados).map(([variableId, medicionesParam]) => {
      // Combinar todos los valores de sistema
      const valoresCombinados: Record<string, any> = {};
      medicionesParam.forEach((med: any) => {
        Object.assign(valoresCombinados, med.valores || {});
      });
      
      // Obtener información del parámetro
      const param = (reportSelection?.parameters || []).find(
        (p) => p.id === variableId
      ) || {};
      
      const primerMedicion = medicionesParam[0];
      
      return {
        variable_id: variableId,
        nombre: primerMedicion?.nombre || "Parámetro desconocido",
        valores: valoresCombinados,
        param: param
      };
    });
  };
  
  const parametrosAgrupados = agruparMedicionesPorParametro();

  // Obtener variables disponibles para gráficos
  const variablesDisponibles = parametrosAgrupados.map(param => ({
    id: param.variable_id,
    nombre: param.nombre
  }));

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
                        {reportNotes["dirigido"] || "ING. ABDIEL ZENTELLA"}
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
                        {reportNotes["asunto"] ||
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

              {/* Comparative Analysis Table */}
              <div className="mb-4 ml-10 mr-10">
                <h5>Análisis Comparativo por Parámetro</h5>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-dark">
                      <tr>
                        <th>Parámetro</th>
                        {sistemasUnicos.map((sis: any) => (
                          <th key={String(sis)}>{String(sis)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parametrosAgrupados.map((paramGroup: any) => {
                        return (
                          <tr key={paramGroup.variable_id}>
                            <td><strong>{paramGroup.nombre}</strong></td>
                            {sistemasUnicos.map((sis: any) => {
                              const valor = paramGroup.valores?.[sis] ?? "";
                              const bgColor = getCellColor(valor, paramGroup.param);
                              return (
                                <td key={sis} style={{ backgroundColor: bgColor }}>{valor}</td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Gráficos de Series Temporales */}
              {variablesDisponibles.length > 0 && (
                <div className="mb-4 ml-10 mr-10">
                  <h5>Gráficos de Series Temporales</h5>
                  
                  {/* Selector de variable */}
                  <div className="mb-4">
                    <label htmlFor="variable-select" className="form-label">
                      Selecciona una variable para visualizar su gráfico:
                    </label>
                    <select
                      id="variable-select"
                      className="form-select"
                      value={selectedVariableForChart}
                      onChange={(e) => setSelectedVariableForChart(e.target.value)}
                    >
                      <option value="">Selecciona una variable...</option>
                      {variablesDisponibles.map((variable) => (
                        <option key={variable.id} value={variable.id}>
                          {variable.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gráfico */}
                  {selectedVariableForChart && (
                    <div className="card">
                      <div className="card-body">
                        <SensorTimeSeriesChart
                          variable={variablesDisponibles.find(v => v.id === selectedVariableForChart)?.nombre || ""}
                          startDate={reportSelection?.fecha || new Date().toISOString().split('T')[0]}
                          endDate={new Date().toISOString().split('T')[0]}
                          apiBase={API_BASE_URL}
                          unidades=""
                          processName={reportSelection?.systemName}
                        />
                      </div>
                    </div>
                  )}
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
                          <p><strong>Fecha de generación:</strong> {new Date(reportSelection.generatedDate).toLocaleString('es-ES')}</p>
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
              <button onClick={handleDownloadPDF}>Descargar PDF</button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
