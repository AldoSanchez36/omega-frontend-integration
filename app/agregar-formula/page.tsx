"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
// Si tu Navbar es export default, cambia a: import Navbar from "@/components/Navbar"
import { Navbar } from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"

// Utilidad para extraer proceso_id de cualquier estructura
function extractProcesoId(obj: any): string | undefined {
  if (!obj || typeof obj !== "object") return undefined
  if (obj.proceso_id) return obj.proceso_id
  if (obj.finalprocesoid) return obj.finalprocesoid
  if (obj.procesoId) return obj.procesoId
  if (obj.procesoID) return obj.procesoID
  if (obj.proceso && (obj.proceso.id || obj.proceso.proceso_id)) return obj.proceso.id || obj.proceso.proceso_id
  if (obj.variable) return extractProcesoId(obj.variable)
  if (obj.data) return extractProcesoId(obj.data)
  for (const key of Object.keys(obj)) {
    const val = obj[key]
    if (typeof val === "object") {
      const found = extractProcesoId(val)
      if (found) return found
    }
  }
  return undefined
}

type VarDef = { nombre: string; prueba: string }
// VariableOption incluye proceso_id para poder INFERIRLO al guardar
type VariableOption = { id: string; nombre: string; unidad?: string; proceso_id?: string }

export default function CrearFormulaPage() {
  const router = useRouter()
  // Inicializa como null y se setea en useEffect
  // const [token, setToken] = useState<string | null>(null)

  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  useEffect(() => {
    if (typeof window !== "undefined") {
      // setToken(localStorage.getItem("Organomex_token"))
      const u = localStorage.getItem("Organomex_user")
      if (u) setUserRole(JSON.parse(u)?.puesto || "user")
    }
  }, [])

  // --- estado principal ---
  const [numVars, setNumVars] = useState<number>(2)
  const [vars, setVars] = useState<VarDef[]>([
    { nombre: "x", prueba: "2" },
    { nombre: "y", prueba: "3" },
  ])
  const [expresion, setExpresion] = useState<string>("x + y * 2")
  const [nombre, setNombre] = useState<string>("")
  const [guardando, setGuardando] = useState<boolean>(false)
  const [preview, setPreview] = useState<string | number>("")

  // ▼ variables disponibles y selección de la variable-resultado
  const [variablesOptions, setVariablesOptions] = useState<VariableOption[]>([])
  const [variableResultadoId, setVariableResultadoId] = useState<string>("")

  // nombres de variables a persistir
  const variablesUsadas = useMemo(
    () => vars.map(v => v.nombre.trim()).filter(Boolean),
    [vars]
  )

  // generar / ajustar cantidad de variables
  const handleGenerarCampos = () => {
    const n = Math.max(1, Number(numVars || 1))
    const copia = [...vars]
    if (n > copia.length) {
      const faltan = n - copia.length
      for (let i = 0; i < faltan; i++) {
        const letra = String.fromCharCode(97 + (copia.length % 26)) // a,b,c...
        copia.push({ nombre: letra, prueba: "" })
      }
    } else if (n < copia.length) {
      copia.length = n
    }
    setVars(copia)
    setNumVars(n)
  }

  const handleChangeVar = (i: number, field: keyof VarDef, value: string) => {
    setVars(prev => {
      const cp = [...prev]
      cp[i] = { ...cp[i], [field]: value }
      return cp
    })
  }

  // evaluar fórmula con valores de prueba
  const evaluar = () => {
    try {
      if (!expresion.trim()) return setPreview("")
      const nombres = variablesUsadas
      const valores = nombres.map(n => {
        const v = vars.find(v => v.nombre.trim() === n)
        const num = Number(v?.prueba ?? "")
        if (Number.isNaN(num)) throw new Error(`El valor de prueba para "${n}" no es numérico`)
        return num
      })
      // eslint-disable-next-line no-new-func
      const fn = new Function(...nombres, `return (${expresion});`)
      setPreview(fn(...valores))
    } catch (e: any) {
      setPreview(`⚠ ${e?.message || "No se pudo evaluar"}`)
    }
  }

  // cargar TODAS las variables (con su proceso_id) para poder inferir proceso al guardar
  useEffect(() => {
    const loadVariables = async () => {
      const token = getToken()
      if (!token) {
        alert("No hay token de autenticación. Por favor, inicia sesión de nuevo.")
        return
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/variables`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const json = await res.json().catch(() => ({}))
        console.log("Respuesta variables:", json) // DEPURACIÓN

        let arr: any[] = []
        if (Array.isArray(json?.variables)) arr = json.variables
        else if (Array.isArray(json?.data)) arr = json.data
        else if (Array.isArray(json)) arr = json

        const lista: VariableOption[] = arr.map((v: any) => ({
          id: String(v.id ?? v.variable_id ?? ""),
          nombre: String(v.nombre ?? v.name ?? "Variable"),
          unidad: v.unidad,
          // Ajuste: soporta proceso_id, procesoId, finalprocesoid, proceso?.id
          proceso_id: v.proceso_id ?? v.procesoId ?? v.finalprocesoid ?? v.proceso?.id ?? v.procesoID ?? v.procesoID ?? null,
        }))

        setVariablesOptions(lista)
        if (lista.length) setVariableResultadoId(lista[0].id)
      } catch {
        // noop
      }
    }

    loadVariables()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // guardar (usa EXACTO el formato pedido y endpoint /api/formulas/crear)
  const handleGuardar = async () => {
    if (!nombre.trim()) return alert("El nombre de la fórmula es obligatorio")
    if (!expresion.trim()) return alert("La expresión es obligatoria")
    if (!variableResultadoId) return alert("Selecciona el parámetro (variable) resultado")

    // inferir proceso_id a partir de la variable seleccionada (tu BD lo exige NOT NULL)
    const varOpt = variablesOptions.find(v => v.id === variableResultadoId)
    let finalProcesoId = varOpt?.proceso_id

    // Si no vino en el listado, intenta pedir el detalle
    if (!finalProcesoId) {
      const token = getToken()
      if (!token) {
        alert("No hay token de autenticación. Por favor, inicia sesión de nuevo.")
        return
      }
      try {
        const resVar = await fetch(`${API_BASE_URL}/api/variables/${variableResultadoId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (resVar.ok) {
          const v = await resVar.json().catch(() => ({}))
          console.log("Detalle variable:", v) // DEPURACIÓN
          finalProcesoId = extractProcesoId(v)
        }
      } catch {
        /* noop */
      }
      if (!finalProcesoId) {
        return alert("No se pudo inferir el proceso de la variable seleccionada.")
      }
    }

    const payload = {
      nombre: nombre.trim(),
      expresion: expresion.trim(), // <--- ¡Aquí va la fórmula!
      proceso_id: finalProcesoId,
      variables_usadas: variablesUsadas,
      variable_resultado_id: variableResultadoId,
    }

    console.log("Payload enviado al guardar fórmula:", payload)
    await doPost(payload)
  }

  // helper para el POST
  async function doPost(payload: any) {
    const token = getToken()
    if (!token) {
      alert("No hay token de autenticación. Por favor, inicia sesión de nuevo.")
      return
    }
    try {
      setGuardando(true)
      console.log("Payload enviado al guardar fórmula:", payload)
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.FORMULA_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("Error backend:", data)
        return alert(data?.message || "No se pudo guardar la fórmula")
      }
      alert("Fórmula guardada correctamente")
      router.push("/dashboard")
    } catch (err) {
      console.error(err)
      alert("Error guardando la fórmula")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role={userRole} />

        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="container max-w-4xl mx-auto">
            <div className="bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-gray-100">
              {/* Header */}
              <header className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-200">
                <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                  <span className="material-icons text-3xl">functions</span>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Creador de Fórmulas</h1>
                  <p className="text-gray-500 mt-1">Define, evalúa y guarda tus propias fórmulas matemáticas.</p>
                </div>
              </header>

              <div className="space-y-12">
                {/* Paso 1: Variables */}
                <section>
                  <div className="flex items-center mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg mr-4">
                      1
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Definir Variables</h2>
                  </div>

                  <Card className="bg-gray-50 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
                      <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de variables</label>
                        <Input
                          type="number"
                          min={1}
                          value={numVars}
                          onChange={(e) => setNumVars(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <Button onClick={handleGenerarCampos} className="btn-primary w-full sm:w-auto">
                        <span className="material-icons mr-2">add_circle_outline</span>
                        Generar Campos
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mt-6">
                      {vars.map((v, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variable {i + 1}</label>
                            <Input
                              placeholder={`v${i + 1}`}
                              value={v.nombre}
                              onChange={(e) => handleChangeVar(i, "nombre", e.target.value)}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Valor de prueba</label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={v.prueba}
                              onChange={(e) => handleChangeVar(i, "prueba", e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </section>

                {/* Paso 2: Construir operación */}
                <section>
                  <div className="flex items-center mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg mr-4">
                      2
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Construir Operación</h2>
                  </div>

                  <Card className="bg-gray-50 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100 space-y-6">
                    {/* Input sin ícono de lápiz */}
                    <div className="relative">
                      <Input
                        value={expresion}
                        onChange={(e) => setExpresion(e.target.value)}
                        placeholder="x + y * 2"
                        className="font-mono text-lg"
                      />
                    </div>

                    <p className="text-xs text-gray-500 mt-2">
                      Usa los nombres de las variables definidas. Operadores permitidos: +, -, *, /, (, ).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Nombre de la fórmula */}
                      <div>
                        <label htmlFor="nombre-formula" className="block text-sm font-medium text-gray-700 mb-1">Nombre de la fórmula</label>
                        <Input
                          id="nombre-formula"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Ej. Cálculo de Área"
                          className="w-full"
                          aria-label="Nombre de la fórmula"
                        />
                      </div>

                      {/* Parámetro (variable) resultado */}
                      <div>
                        <label htmlFor="variable-resultado" className="block text-sm font-medium text-gray-700 mb-1">
                          Parámetro (variable) resultado
                        </label>
                        {variablesOptions.length === 0 ? (
                          <div className="text-sm text-red-500 bg-red-50 rounded p-2 mt-1" role="alert">
                            No hay variables disponibles para seleccionar.
                          </div>
                        ) : (
                          <Select
                            value={variableResultadoId}
                            onValueChange={setVariableResultadoId}
                            disabled={variablesOptions.length === 0}
                          >
                            <SelectTrigger id="variable-resultado" className="w-full" aria-label="Parámetro (variable) resultado">
                              <SelectValue placeholder={"Selecciona la variable resultado"} />
                            </SelectTrigger>
                            <SelectContent className="bg-[#f6f6f6] text-gray-900">
                              {variablesOptions.map((v) => (
                                <SelectItem key={v.id} value={v.id} aria-label={v.nombre + (v.unidad ? ` (${v.unidad})` : "")}>
                                  {v.nombre}{v.unidad ? ` (${v.unidad})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          Esta es la variable que se calculará al aplicar la fórmula.
                        </p>
                      </div>
                    </div>
                  </Card>
                </section>

                {/* Paso 3: Vista previa */}
                <section>
                  <div className="flex items-center mb-5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-lg mr-4">
                      3
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-800">Vista Previa y Resultados</h2>
                  </div>

                  <Card className="bg-gray-50 p-6 sm:p-8 rounded-2xl shadow-lg border border-gray-100">
                    <div className="mb-4">
                      <h3 className="text-lg font-medium text-gray-800">Fórmula ingresada:</h3>
                      <p className="text-2xl font-mono text-blue-600 p-4 bg-blue-50 rounded-lg mt-2">{expresion || "—"}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-md">
                      <p className="text-lg">Resultado con valores de prueba:</p>
                      <p className="text-3xl font-bold">{preview === "" ? "—" : String(preview)}</p>
                    </div>
                  </Card>
                </section>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row items-center justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <Button variant="secondary" onClick={evaluar} className="btn-secondary w-full sm:w-auto">
                    <span className="material-icons mr-2">play_circle_outline</span>
                    Evaluar de nuevo
                  </Button>
                  <Button onClick={handleGuardar} disabled={guardando} className="btn-primary w-full sm:w-auto font-semibold">
                    <span className="material-icons mr-2">save</span>
                    {guardando ? "Guardando…" : "Guardar Fórmula"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("Organomex_token")
}
