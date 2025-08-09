"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import Navbar from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"

type Proceso = { id: string; nombre: string; descripcion?: string }
type VarDef = { nombre: string; prueba: string }

export default function CrearFormulaPage() {
  const router = useRouter()
  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null

  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  useEffect(() => {
    if (typeof window !== "undefined") {
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
  const [procesoId, setProcesoId] = useState<string>("")
  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loadingProcesos, setLoadingProcesos] = useState<boolean>(false)
  const [guardando, setGuardando] = useState<boolean>(false)
  const [preview, setPreview] = useState<string | number>("")

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

  // cargar procesos (ajusta si tu endpoint es otro)
  useEffect(() => {
    const fetchProcesos = async () => {
      setLoadingProcesos(true)
      try {
        const res = await fetch(`${API_BASE_URL}/api/procesos`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json().catch(() => ({}))
        const arr = Array.isArray(data?.procesos) ? data.procesos : Array.isArray(data) ? data : []
        const lista: Proceso[] = arr.map((p: any) => ({
          id: String(p.id ?? p._id ?? ""),
          nombre: String(p.nombre ?? "Proceso"),
          descripcion: p.descripcion ?? "",
        }))
        setProcesos(lista)
        if (!procesoId && lista.length) setProcesoId(lista[0].id)
      } finally {
        setLoadingProcesos(false)
      }
    }
    fetchProcesos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // guardar (usa EXACTO el formato que pediste y el endpoint /api/formulas/crear)
  const handleGuardar = async () => {
    if (!nombre.trim()) return alert("El nombre de la fórmula es obligatorio")
    if (!expresion.trim()) return alert("La expresión es obligatoria")
    if (!procesoId) return alert("Selecciona un proceso")

    const payload = {
      nombre: nombre.trim(),
      expresion: expresion.trim(),
      proceso_id: procesoId,
      variables_usadas: variablesUsadas,
      // creador_id lo debe inferir el backend desde el token (o agrégalo aquí si tu backend lo requiere)
    }

    try {
      setGuardando(true)
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
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Escribe tu fórmula</label>
                      <div className="relative">
                        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">create</span>
                        <Input
                          value={expresion}
                          onChange={(e) => setExpresion(e.target.value)}
                          placeholder="x + y * 2"
                          className="pl-10 font-mono text-lg"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Usa los nombres de las variables definidas. Operadores permitidos: +, -, *, /, (, ).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la fórmula</label>
                        <Input
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Ej. Cálculo de Área"
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Proceso asociado</label>
                        <Select
                          value={procesoId}
                          onValueChange={setProcesoId}
                          disabled={loadingProcesos || procesos.length === 0}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={loadingProcesos ? "Cargando..." : "Selecciona un proceso"} />
                          </SelectTrigger>
                          <SelectContent className="bg-[#f6f6f6] text-gray-900">
                            {procesos.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
