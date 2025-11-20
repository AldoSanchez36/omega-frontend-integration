"use client"

import ProtectedRoute from "@/components/ProtectedRoute"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { jsPDF } from "jspdf"
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

  // Exportar DOM a PDF con html2canvas (captura exacta de lo que se ve)
  const exportDOMToPDF = async (reportSelection: ReportSelection | null) => {
    try {
      console.log("🎯 Iniciando exportDOMToPDF...");
      
      const wrapper = document.getElementById("reporte-pdf-wrapper") as HTMLElement | null;
      if (!wrapper) throw new Error("Elemento 'reporte-pdf-wrapper' no encontrado");
      
      console.log("📦 Wrapper encontrado:", wrapper);

      // Esperar a que las imágenes dentro del wrapper estén listas
      const imgs = Array.from(wrapper.querySelectorAll("img"));
      console.log("🖼️ Imágenes encontradas:", imgs.length);
      
      await Promise.all(
        imgs.map((img) =>
          img.complete && img.naturalWidth !== 0
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res(); // no bloquear si falla
              })
        )
      );

      console.log("🎨 Capturando con html2canvas...");
      // Capturar a canvas
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: true,
        windowWidth: document.documentElement.clientWidth,
        scrollX: 0,
        scrollY: -window.scrollY,
      });

      console.log("🖼️ Canvas creado:", { width: canvas.width, height: canvas.height });
      const imgData = canvas.toDataURL("image/png");

      console.log("📄 Creando PDF...");
      // Crear PDF A4 y paginar si es alto
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log("📐 Dimensiones PDF:", { pageWidth, pageHeight, imgWidth, imgHeight });

      if (imgHeight <= pageHeight) {
        console.log("📄 Agregando imagen a una página");
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      } else {
        console.log("📄 Agregando imagen a múltiples páginas");
        let y = 0;
        let page = 1;
        while (y < imgHeight) {
          console.log(`🧾 Renderizando página ${page}, offsetY=${y.toFixed(2)}mm`);
          pdf.addImage(imgData, "PNG", 0, -y, imgWidth, imgHeight);
          y += pageHeight;
          if (y < imgHeight) pdf.addPage();
          page++;
        }
      }

      const fileName = `Reporte_${(reportSelection?.plant?.nombre || "General").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      console.log("💾 Descargando PDF:", fileName);
      pdf.save(fileName);
      
      console.log("✅ PDF descargado exitosamente");
      alert("✅ PDF descargado exitosamente!");
      
    } catch (error) {
      console.error("❌ Error en exportDOMToPDF:", error);
      throw error;
    }
  };


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
    const parsedReportSelection = reportSelectionRaw ? JSON.parse(reportSelectionRaw) : null;
    console.log("📄 Reports - Datos recibidos del localStorage:", parsedReportSelection);
    console.log("📊 Reports - Parámetros recibidos:", parsedReportSelection?.parameters);
    console.log("📊 Reports - Tolerancias recibidas:", parsedReportSelection?.variablesTolerancia);
    setReportSelection(parsedReportSelection);

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
        cliente_id: reportSelection.user?.id
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
      alert("✅ Reporte guardado exitosamente en el sistema")
      
    } catch (error) {
      console.error("❌ Error en handleSaveReport:", error)
      alert(`Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

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

  // Obtener variables disponibles para gráficos desde parameters
  const variablesDisponibles = (() => {
    const allVariables = new Set<string>();
    Object.values(reportSelection?.parameters || {}).forEach((systemData: any) => {
      Object.keys(systemData).forEach(variable => allVariables.add(variable));
    });
    
    return Array.from(allVariables).map(variable => ({
      id: variable, // Usar el nombre como ID para los gráficos
      nombre: variable
    }));
  })();

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

              {/* Comparative Analysis Table */}
              <div className="mb-4 ml-10 mr-10">
                <h5>Análisis Comparativo por Parámetro</h5>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead className="table-dark">
                      <tr>
                        <th>Variable</th>
                        {Object.keys(reportSelection?.parameters || {}).map(systemName => (
                          <th key={systemName} className="text-center">{systemName}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Obtener todas las variables únicas
                        const allVariables = new Set<string>();
                        Object.values(reportSelection?.parameters || {}).forEach((systemData: any) => {
                          Object.keys(systemData).forEach(variable => allVariables.add(variable));
                        });
                        
                        return Array.from(allVariables).map(variable => (
                          <tr key={variable} className="hover:bg-gray-50">
                            <td className="font-medium">{variable}</td>
                            {Object.keys(reportSelection?.parameters || {}).map(systemName => {
                              const systemData = reportSelection?.parameters?.[systemName];
                              const paramData = systemData?.[variable];
                              
                              // Buscar las tolerancias para esta variable
                              let toleranceData = null;
                              if (reportSelection?.variablesTolerancia) {
                                // Primero intentar con la nueva estructura (por sistema)
                                if (reportSelection.variablesTolerancia[systemName] && reportSelection.variablesTolerancia[systemName][variable]) {
                                  toleranceData = reportSelection.variablesTolerancia[systemName][variable];
                                } else {
                                  // Buscar por nombre de variable en la estructura actual (por ID de parámetro)
                                  // Las tolerancias se guardan con el ID del parámetro como clave
                                  Object.keys(reportSelection.variablesTolerancia).forEach(varId => {
                                    const varData = reportSelection.variablesTolerancia[varId];
                                    if (varData && typeof varData === 'object' && !Array.isArray(varData)) {
                                      // Verificar si el nombre de la variable coincide
                                      if (varData.nombre === variable) {
                                        toleranceData = varData;
                                      }
                                    }
                                  });
                                }
                              }
                              
                              const bgColor = paramData && toleranceData ? getCellColor(paramData.valor?.toString() || "", toleranceData) : "";
                              return (
                                <td key={systemName} className="text-center" style={{ backgroundColor: bgColor }}>
                                  {paramData ? `${paramData.valor} ${paramData.unidad}` : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        ));
                      })()}
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
                          <p><strong>Fecha de generación:</strong> {(reportSelection?.generatedDate ? new Date(reportSelection.generatedDate) : new Date()).toLocaleString('es-ES')}</p>
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
