"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

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

export default function Reporte() {
  const router = useRouter()
  const [savedSystemData, setSavedSystemData] = useState<SystemData>({})
  const [reportNotes, setReportNotes] = useState<{ [key: string]: string }>({})
  const [currentDate, setCurrentDate] = useState("")
  const [isEditing, setIsEditing] = useState(true)
  const [imagesLoaded, setImagesLoaded] = useState(false)

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
    const checkImages = async () => {
      // Como las imágenes están en public, simplemente las marcamos como disponibles
      setImagesLoaded(true)
    }

    checkImages()

    // Cargar datos del localStorage o usar datos mock
    const storedData = JSON.parse(localStorage.getItem("savedSystemData") || "{}")
    const storedNotes = JSON.parse(localStorage.getItem("reportNotes") || "{}")

    // Si no hay datos, usar datos mock
    if (Object.keys(storedData).length === 0) {
      const mockData: SystemData = {
        "AGUA CEA": [
          { name: "pH", value: "7.2", unit: "pH", checked: true },
          { name: "Conductividad", value: "250", unit: "µS/cm", checked: true },
          { name: "Dureza total", value: "85", unit: "mg/L", checked: true },
          { name: "Temperatura", value: "22", unit: "°C", checked: true },
        ],
        "AGUA DE REPUESTO": [
          { name: "pH", value: "7.8", unit: "pH", checked: true },
          { name: "Conductividad", value: "450", unit: "µS/cm", checked: true },
          { name: "Dureza total", value: "150", unit: "mg/L", checked: true },
          { name: "Temperatura", value: "25", unit: "°C", checked: true },
        ],
        "TORRE DE ENFRIAMIENTO": [
          { name: "pH", value: "8.5", unit: "pH", checked: true },
          { name: "Conductividad", value: "650", unit: "µS/cm", checked: true },
          { name: "Dureza total", value: "220", unit: "mg/L", checked: true },
          { name: "Temperatura", value: "35", unit: "°C", checked: true },
        ],
        "DRY COOLER": [
          { name: "pH", value: "7.0", unit: "pH", checked: true },
          { name: "Conductividad", value: "180", unit: "µS/cm", checked: true },
          { name: "Dureza total", value: "65", unit: "mg/L", checked: true },
          { name: "Temperatura", value: "28", unit: "°C", checked: true },
        ],
      }
      setSavedSystemData(mockData)
    } else {
      setSavedSystemData(storedData)
    }

    setReportNotes(storedNotes)

    // Obtener fecha actual
    const today = new Date()
    const formattedDate = today.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    setCurrentDate(formattedDate)
  }, [])

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
      doc.text(`Sistema Evaluado: ${reportNotes["sistema"] || "Todos los sistemas"}`, 20, 65)
      doc.text(`Ubicación: ${reportNotes["ubicacion"] || "San Luis Potosí, S.L.P."}`, 20, 75)

      let currentY = 90

      // Leyenda de colores
      doc.setFontSize(14)
      doc.text("Leyenda de colores", 20, currentY)
      currentY += 10

      const legendData = [
        ["Estado", "Descripción", "Rango"],
        ["Fuera", "FUERA DE RANGO", "> 8"],
        ["Límite", "CERCA DE LÍMITE RECOMENDADO", "7.5 - 8"],
        ["Bien", "DENTRO DE RANGO", "7"],
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
      const allParams = new Set<string>()
      Object.values(savedSystemData).forEach((system) => {
        system.forEach((param) => {
          if (param.checked) allParams.add(param.name)
        })
      })

      const tableHeaders = ["Parámetro", "AGUA CEA", "AGUA DE REPUESTO", "TORRE DE ENFRIAMIENTO", "DRY COOLER"]
      const tableData = Array.from(allParams).map((paramName) => {
        const row = [paramName]
        ;["AGUA CEA", "AGUA DE REPUESTO", "TORRE DE ENFRIAMIENTO", "DRY COOLER"].forEach((systemName) => {
          const systemParams = savedSystemData[systemName] || []
          const param = systemParams.find((p) => p.name === paramName)
          const value = param ? param.value || "N/A" : "—"
          row.push(value)
        })
        return row
      })
      autoTable(doc, {
        head: [tableHeaders],
        body: tableData,
        startY: currentY,
        theme: "grid",
        headStyles: { fillColor: [52, 58, 64] },
        margin: { left: 20, right: 20 },
        styles: { fontSize: 10 },
      })

      currentY = (doc as any).lastAutoTable.finalY + 20

      // Datos detallados por sistema
      Object.entries(savedSystemData).forEach(([systemName, parameters]) => {
        if (currentY > 250) {
          doc.addPage()
          currentY = 20
        }

        doc.setFontSize(14)
        doc.text(systemName, 20, currentY)
        currentY += 10

        const systemTableHeaders = ["Parámetro", "Valor", "Unidad"]
        const systemTableData = parameters
          .filter((param) => param.checked)
          .map((param) => [param.name, param.value || "N/A", param.unit])
        autoTable(doc, {
          head: [systemTableHeaders],
          body: systemTableData,
          startY: currentY,
          theme: "striped",
          headStyles: { fillColor: [40, 167, 69] },
          margin: { left: 20, right: 20 },
        })

        currentY = (doc as any).lastAutoTable.finalY + 15

        // Agregar notas si existen
        const systemNotes = reportNotes[systemName]
        if (systemNotes && systemNotes.trim()) {
          doc.setFontSize(10)
          doc.text("Notas:", 20, currentY)
          const noteLines = doc.splitTextToSize(systemNotes, 170)
          doc.text(noteLines, 20, currentY + 5)
          currentY += noteLines.length * 4 + 10
        }
      })

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

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            Omega
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/dashboard">
              Dashboard
            </Link>
            <Link className="nav-link active" href="/reports">
              Reportes
            </Link>
            <Link className="nav-link" href="/dashboard-manager">
              Dashboard Manager
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="container-fluid bg-primary text-white py-3">
        <div className="container">
          <h1 className="h4 mb-0">Vista Previa del Reporte</h1>
          <p className="mb-0">
            <strong>Fecha:</strong> {currentDate}
          </p>
        </div>
      </div>

      {/* Header Image */}
      <div id="header-img" className="text-center">
        {imagesLoaded ? (
          <Image
            src="/images/header.jpeg"
            alt="Header del reporte"
            width={800}
            height={150}
            className="w-100"
            style={{ height: "auto", maxHeight: "200px", objectFit: "cover" }}
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

      {/* Report Content */}
      <div id="report-container" className="container py-4">
        <div className="card shadow">
          <div className="card-body">
            {/* Report Header */}
            <div className="mb-4">
              <div className="text-end mb-3">
                <strong>Ubicación y fecha: </strong>
                <span
                  contentEditable={isEditing}
                  suppressContentEditableWarning={true}
                  onBlur={(e) => handleNoteChange("ubicacion", e.currentTarget.innerText)}
                  className="border-bottom"
                  style={{ minWidth: "200px", display: "inline-block" }}
                >
                  {reportNotes["ubicacion"] || "San Luis Potosí, S.L.P. a 28 de Mayo 2024"}
                </span>
              </div>

              <h3 className="text-center mb-4">
                <strong>SERVICIO CRYOINFRA</strong>
              </h3>

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
                        "REPORTE DE ANÁLISIS PARA TODOS LOS SISTEMAS EN LA PLANTA DE HIDROGENO SLP"}
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
                      {reportNotes["sistema"] || "Todos los sistemas"}
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
                      {reportNotes["fecha_muestra"] || currentDate}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Legend Table */}
            <div className="mb-4">
              <h5>
                <strong>Leyenda de colores</strong>
              </h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead>
                    <tr>
                      <th>Estado</th>
                      <th>Descripción</th>
                      <th>Rango</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ backgroundColor: "#FFC6CE" }}>
                        <strong>Fuera</strong>
                      </td>
                      <td>FUERA DE RANGO</td>
                      <td>{rangeLimits["pH"]?.fuera || "> 8"}</td>
                    </tr>
                    <tr>
                      <td style={{ backgroundColor: "#FFEB9C" }}>
                        <strong>Límite</strong>
                      </td>
                      <td>CERCA DE LÍMITE RECOMENDADO</td>
                      <td>{rangeLimits["pH"]?.limite || "7.5 - 8"}</td>
                    </tr>
                    <tr>
                      <td style={{ backgroundColor: "#C5EECE" }}>
                        <strong>Bien</strong>
                      </td>
                      <td>DENTRO DE RANGO</td>
                      <td>{rangeLimits["pH"]?.bien || "7"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparative Analysis Table */}
            <div className="mb-4">
              <h5>Análisis Comparativo por Parámetro</h5>
              <div className="table-responsive">
                <table className="table table-bordered">
                  <thead className="table-dark">
                    <tr>
                      <th>Parámetro</th>
                      <th>AGUA CEA</th>
                      <th>AGUA DE REPUESTO</th>
                      <th>TORRE DE ENFRIAMIENTO</th>
                      <th>DRY COOLER</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const allParams = new Set<string>()
                      Object.values(savedSystemData).forEach((system) => {
                        system.forEach((param) => {
                          if (param.checked) allParams.add(param.name)
                        })
                      })
                      return Array.from(allParams).map((paramName) => (
                        <tr key={paramName}>
                          <td>
                            <strong>{paramName}</strong>
                          </td>
                          {["AGUA CEA", "AGUA DE REPUESTO", "TORRE DE ENFRIAMIENTO", "DRY COOLER"].map((systemName) => {
                            const systemParams = savedSystemData[systemName] || []
                            const param = systemParams.find((p) => p.name === paramName)
                            const value = param ? param.value || "N/A" : "—"

                            return (
                              <td
                                key={systemName}
                                contentEditable={isEditing}
                                suppressContentEditableWarning={true}
                                onBlur={(e) => {
                                  const updatedValue = e.currentTarget.innerText
                                  setSavedSystemData((prev) => {
                                    const updated = { ...prev }
                                    const targetParam = updated[systemName]?.find((p) => p.name === paramName)
                                    if (targetParam) {
                                      targetParam.value = updatedValue
                                    }
                                    return updated
                                  })
                                }}
                                className={isEditing ? "border border-primary" : ""}
                                style={{
                                  backgroundColor: getCellBackgroundColor(paramName, value),
                                  cursor: isEditing ? "text" : "default",
                                }}
                              >
                                {value}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
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

      {/* Footer Image */}
      <div id="footer-img" className="text-center">
        {imagesLoaded ? (
          <Image
            src="/images/footer-textless.png"
            alt="Footer del reporte"
            width={800}
            height={100}
            className="w-100"
            style={{ height: "auto", maxHeight: "150px", objectFit: "cover" }}
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

      {/* Action Buttons */}
      <div className="container py-4">
        <div className="text-center">
          <div className="btn-group" role="group">
            <Link href="/dashboard" className="btn btn-secondary">
              <i className="material-icons me-2">arrow_back</i>
              Volver
            </Link>
            <button className="btn btn-warning" onClick={enableEditing}>
              <i className="material-icons me-2">edit</i>
              Editar
            </button>
            <button
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
            </button>
            <button className="btn btn-danger" onClick={generatePDF}>
              <i className="material-icons me-2">picture_as_pdf</i>
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
