"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import Navbar from "@/components/Navbar"
import ProtectedRoute from "@/components/ProtectedRoute"
import { API_BASE_URL } from "@/config/constants"

type Proceso = { id: string; nombre: string; descripcion?: string }

type VarDef = {
  nombre: string
  prueba: string
}

const CANDIDATE_SYSTEM_ENDPOINTS = [
  "/api/procesos",            // si tu backend expone /api/procesos
  "/api/sistemas",            // alternativa
  "/api/procesos/listar",     // alternativa
  "/api/sistemas/listar",     // alternativa
]

export default function CrearFormulaPage() {
  const router = useRouter()

  const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("Organomex_user")
      if (storedUser) {
        const user = JSON.parse(storedUser)
        setUserRole(user?.puesto || "user")
      }
    }
  }, [])

  const [numVars, setNumVars] = useState<number>(2)
  const [vars, setVars] = useState<VarDef[]>([
    { nombre: "x", prueba: "2" },
    { nombre: "y", prueba: "3" },
  ])

  const [expresion, setExpresion] = useState<string>("x+y")
  const [nombre, setNombre] = useState<string>("")
  const [procesoId, setProcesoId] = useState<string>("")

  const [procesos, setProcesos] = useState<Proceso[]>([])
  const [loadingProcesos, setLoadingProcesos] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [preview, setPreview] = useState<string | number>("")

  // --------- helpers ----------
  const variablesUsadas = useMemo(
    () => vars.map(v => String(v.nombre || "").trim()).filter(Boolean),
    [vars]
  )

  const handleGenerarCampos = () => {
    if (numVars < 1) {
      setNumVars(1)
      return
    }
    const copia = [...vars]
    if (numVars > copia.length) {
      const faltan = numVars - copia.length
      for (let i = 0; i < faltan; i++) {
        const letra = String.fromCharCode(97 + (copia.length % 26)) // a,b,c...
        copia.push({ nombre: letra, prueba: "" })
      }
    } else if (numVars < copia.length) {
      copia.length = numVars
    }
    setVars(copia)
  }

  const handleChangeVar = (idx: number, field: keyof VarDef, value: string) => {
    setVars(prev => {
      const copia = [...prev]
      copia[idx] = { ...copia[idx], [field]: value }
      return copia
    })
  }

  // Evaluar expresión con Function para vista previa
  const evaluar = () => {
    try {
      if (!expresion.trim()) {
        setPreview("")
        return
      }
      const nombres = variablesUsadas
      const valores = variablesUsadas.map((n) => {
        const found = vars.find(v => v.nombre.trim() === n)
        const num = Number(found?.prueba ?? "")
        if (Number.isNaN(num)) throw new Error(`El valor de prueba para "${n}" no es numérico`)
        return num
      })
      // eslint-disable-next-line no-new-func
      const fn = new Function(...nombres, `return (${expresion});`)
      const res = fn(...valores)
      setPreview(res)
    } catch (err: any) {
      console.error("Error evaluando expresión:", err)
      setPreview(`⚠ ${err?.message || "No se pudo evaluar"}`)
    }
  }

  // Cargar procesos desde el backend (prueba múltiples endpoints)
  useEffect(() => {
    const loadProcesos = async () => {
      if (!API_BASE_URL) return
      setLoadingProcesos(true)
      try {
        let lista: Proceso[] = []
        for (const path of CANDIDATE_SYSTEM_ENDPOINTS) {
          const url = `${API_BASE_URL}${path}`
          try {
            const res = await fetch(url, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (!res.ok) continue
            const json = await res.json().catch(() => ({}))
            const arr =
              Array.isArray(json?.procesos) ? json.procesos :
              Array.isArray(json?.data) ? json.data :
              Array.isArray(json) ? json : []
            if (arr.length > 0) {
              lista = arr.map((p: any) => ({
                id: String(p.id ?? p._id ?? ""),
                nombre: String(p.nombre ?? p.name ?? "Proceso"),
                descripcion: p.descripcion ?? p.description ?? "",
              }))
              break
            }
          } catch {
            // probar siguiente endpoint
          }
        }
        setProcesos(lista)
        if (!procesoId && lista.length > 0) setProcesoId(lista[0].id)
      } finally {
        setLoadingProcesos(false)
      }
    }
    loadProcesos()
  }, [token, procesoId])

  // Guardar fórmula (POST)
  const handleGuardar = async (e?: React.FormEvent) => {
    e?.preventDefault?.()
    console.log("[handleGuardar] Inicia…")
    try {
      if (!API_BASE_URL) {
        alert("Falta configurar API_BASE_URL")
        return
      }
      if (!nombre.trim()) {
        alert("El nombre de la fórmula es obligatorio")
        return
      }
      if (!expresion.trim()) {
        alert("La expresión es obligatoria")
        return
      }
      if (!procesoId) {
        alert("Selecciona un proceso")
        return
      }
      const payload = {
        nombre: nombre.trim(),
        expresion: expresion.trim(),
        proceso_id: procesoId,
        variables_usadas: variablesUsadas,
      }
      console.log("POST ->", `${API_BASE_URL}/api/formulas/crear`, payload)

      setGuardando(true)
      const res = await fetch(`${API_BASE_URL}/api/formulas/crear`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      console.log("Respuesta:", res.status, res.statusText)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error("Error backend:", data)
        alert(`No se pudo guardar: ${data?.message || res.statusText}`)
        return
      }
      alert("Fórmula guardada correctamente")
      router.push("/dashboard") // ajusta el destino si quieres
    } catch (err) {
      console.error("Fallo guardando fórmula:", err)
      alert("Error guardando la fórmula")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar role={userRole} />
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Σ Crear Fórmula</h1>
            </div>

            {/* Paso 1: Definir variables */}
            <section className="space-y-3 mb-8">
              <h2 className="text-lg font-semibold">Paso 1: Definir Variables</h2>
              <div className="flex gap-3 items-end">
                <div className="w-40">
                  <Label>Número de Variables</Label>
                  <Input
                    type="number"
                    min={1}
                    value={numVars}
                    onChange={(e) => setNumVars(Number(e.target.value))}
                  />
                </div>
                <Button type="button" onClick={handleGenerarCampos}>
                  + Generar Campos
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {vars.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Variable {idx + 1}</Label>
                      <Input
                        placeholder={`v${idx + 1}`}
                        value={v.nombre}
                        onChange={(e) => handleChangeVar(idx, "nombre", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Valor de prueba</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={v.prueba}
                        onChange={(e) => handleChangeVar(idx, "prueba", e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Paso 2: Definir operación */}
            <section className="space-y-3 mb-8">
              <h2 className="text-lg font-semibold">Paso 2: Definir Operación</h2>
              <div>
                <Label>Fórmula</Label>
                <Input
                  placeholder="Ej. x + y / 2"
                  value={expresion}
                  onChange={(e) => setExpresion(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usa los nombres de las variables definidas arriba. Operadores: +, -, *, /, (, )
                </p>
              </div>
            </section>

            {/* Paso 3: Meta y proceso */}
            <form onSubmit={handleGuardar} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre de la fórmula</Label>
                  <Input
                    placeholder="Ej. F1"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Proceso</Label>
                  <Select
                    value={procesoId}
                    onValueChange={setProcesoId}
                    disabled={loadingProcesos || procesos.length === 0}
                  >
                    <SelectTrigger>
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

              <div className="flex gap-3">
                <Button type="button" variant="secondary" onClick={evaluar}>
                  Evaluar Fórmula
                </Button>
                <Button type="submit" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar Fórmula"}
                </Button>
              </div>
            </form>

            {/* Vista previa */}
            <section className="mt-8">
              <h3 className="font-semibold mb-2">Vista Previa de la Fórmula</h3>
              <div className="text-sm text-gray-700 mb-2">
                {expresion}
              </div>
              <div className="rounded border bg-green-50 p-3">
                <div className="text-gray-600 text-sm mb-1">Resultado con valores de prueba:</div>
                <div className="text-xl font-semibold">{String(preview ?? "")}</div>
              </div>
            </section>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
