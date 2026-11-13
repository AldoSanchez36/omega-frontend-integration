"use client"

import { useEffect, useMemo, useState } from "react"
import ProtectedRoute from "@/components/ProtectedRoute"
import { Navbar } from "@/components/Navbar"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

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

type VarDef = { id: string; nombre: string; prueba: string }
// VariableOption incluye proceso_id para poder INFERIRLO al guardar
type VariableOption = { id: string; nombre: string; unidad?: string; proceso_id?: string }

type ExprPart =
  | { kind: "var"; id: string; nombre: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" | "(" | ")" }
  | { kind: "num"; value: string }

const OPERATORS: Array<ExprPart & { kind: "op" }> = [
  { kind: "op", value: "+" },
  { kind: "op", value: "-" },
  { kind: "op", value: "*" },
  { kind: "op", value: "/" },
  { kind: "op", value: "(" },
  { kind: "op", value: ")" },
]

function partsToExpression(parts: ExprPart[]): string {
  if (parts.length === 0) return ""
  return parts
    .map((p) => {
      if (p.kind === "var") return p.nombre
      if (p.kind === "num") return p.value
      return p.value
    })
    .join(" ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
}

/** Evalúa expresión sustituyendo nombres reales (pueden tener espacios/°/()) por tokens seguros. */
function evaluateNamedExpression(
  expression: string,
  bindings: Array<{ nombre: string; value: number }>
): number {
  const sorted = [...bindings]
    .filter((b) => b.nombre.trim())
    .sort((a, b) => b.nombre.length - a.nombre.length)

  let expr = expression.trim()
  const params: string[] = []
  const values: number[] = []

  sorted.forEach((b, i) => {
    const token = `__v${i}`
    if (expr.includes(b.nombre)) {
      expr = expr.split(b.nombre).join(token)
    }
    params.push(token)
    values.push(b.value)
  })

  if (!/^[a-zA-Z0-9_\s+\-*/().]+$/.test(expr)) {
    throw new Error("La expresión contiene caracteres no permitidos (usa solo +, -, *, /, paréntesis y las variables seleccionadas)")
  }

  // eslint-disable-next-line no-new-func
  const fn = new Function(...params, `return (${expr});`)
  const result = fn(...values)
  if (typeof result !== "number" || Number.isNaN(result) || !Number.isFinite(result)) {
    throw new Error("El resultado no es un número válido")
  }
  return result
}

export default function AgregarFormula() {
  const [userRole, setUserRole] = useState<"admin" | "user" | "client" | "guest">("guest")

  // Helper function to get token
  const getToken = () => {
    return typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null
  }
  useEffect(() => {
    if (typeof window !== "undefined") {
      const u = localStorage.getItem("Organomex_user")
      if (u) setUserRole(JSON.parse(u)?.puesto || "user")
    }
  }, [])

  // --- estado principal ---
  const [numVars, setNumVars] = useState<number>(2)
  const [vars, setVars] = useState<VarDef[]>([
    { id: "", nombre: "", prueba: "2" },
    { id: "", nombre: "", prueba: "3" },
  ])
  const [exprParts, setExprParts] = useState<ExprPart[]>([])
  const [numeroInsertar, setNumeroInsertar] = useState<string>("")
  const [nombre, setNombre] = useState<string>("")
  const [guardando, setGuardando] = useState<boolean>(false)
  const [preview, setPreview] = useState<string | number>("")

  // ▼ variables disponibles y selección de la variable-resultado
  const [variablesOptions, setVariablesOptions] = useState<VariableOption[]>([])
  const [variableResultadoId, setVariableResultadoId] = useState<string>("")

  const expresion = useMemo(() => partsToExpression(exprParts), [exprParts])

  // nombres de variables a persistir (solo las que realmente están en la expresión)
  const variablesUsadas = useMemo(() => {
    const namesInExpr = exprParts
      .filter((p): p is Extract<ExprPart, { kind: "var" }> => p.kind === "var")
      .map((p) => p.nombre)
    const unique = Array.from(new Set(namesInExpr))
    if (unique.length > 0) return unique
    return vars.map((v) => v.nombre.trim()).filter(Boolean)
  }, [exprParts, vars])

  // generar / ajustar cantidad de variables
  const handleGenerarCampos = () => {
    const n = Math.max(1, Number(numVars || 1))
    const copia = [...vars]
    if (n > copia.length) {
      const usedIds = new Set(copia.map((v) => v.id).filter(Boolean))
      const faltan = n - copia.length
      for (let i = 0; i < faltan; i++) {
        const next = variablesOptions.find((opt) => !usedIds.has(opt.id))
        if (next) {
          usedIds.add(next.id)
          copia.push({ id: next.id, nombre: next.nombre, prueba: "0" })
        } else {
          copia.push({ id: "", nombre: "", prueba: "0" })
        }
      }
    } else if (n < copia.length) {
      const removed = copia.splice(n)
      const removedIds = new Set(removed.map((r) => r.id).filter(Boolean))
      if (removedIds.size > 0) {
        setExprParts((prev) => prev.filter((p) => p.kind !== "var" || !removedIds.has(p.id)))
      }
    }
    setVars(copia)
    setNumVars(n)
  }

  const handleSelectVar = (index: number, variableId: string) => {
    const opt = variablesOptions.find((v) => v.id === variableId)
    if (!opt) return
    setVars((prev) => {
      const oldId = prev[index]?.id
      const cp = [...prev]
      cp[index] = { id: opt.id, nombre: opt.nombre, prueba: cp[index]?.prueba ?? "0" }
      if (oldId && oldId !== opt.id) {
        setExprParts((parts) =>
          parts.map((p) =>
            p.kind === "var" && p.id === oldId ? { kind: "var", id: opt.id, nombre: opt.nombre } : p
          )
        )
      }
      return cp
    })
  }

  const handleChangePrueba = (index: number, value: string) => {
    setVars((prev) => {
      const cp = [...prev]
      cp[index] = { ...cp[index], prueba: value }
      return cp
    })
  }

  const insertVar = (v: VarDef) => {
    if (!v.id || !v.nombre) return
    setExprParts((prev) => [...prev, { kind: "var", id: v.id, nombre: v.nombre }])
  }

  const insertOp = (value: ExprPart & { kind: "op" }) => {
    setExprParts((prev) => [...prev, value])
  }

  const insertNumero = () => {
    const raw = numeroInsertar.trim()
    if (!raw || Number.isNaN(Number(raw))) return
    setExprParts((prev) => [...prev, { kind: "num", value: raw }])
    setNumeroInsertar("")
  }

  const undoLastPart = () => {
    setExprParts((prev) => prev.slice(0, -1))
  }

  const clearExpression = () => {
    setExprParts([])
    setPreview("")
  }

  // evaluar fórmula con valores de prueba
  const evaluar = () => {
    try {
      if (!expresion.trim()) return setPreview("")
      const namesInExpr = Array.from(
        new Set(
          exprParts
            .filter((p): p is Extract<ExprPart, { kind: "var" }> => p.kind === "var")
            .map((p) => p.nombre)
        )
      )
      if (namesInExpr.length === 0) {
        throw new Error("Inserta al menos una variable en la operación")
      }
      const bindings = namesInExpr.map((n) => {
        const v = vars.find((item) => item.nombre.trim() === n)
        const num = Number(v?.prueba ?? "")
        if (Number.isNaN(num)) throw new Error(`El valor de prueba para "${n}" no es numérico`)
        return { nombre: n, value: num }
      })
      setPreview(evaluateNamedExpression(expresion, bindings))
    } catch (e: any) {
      setPreview(`⚠ ${e?.message || "No se pudo evaluar"}`)
    }
  }

  // Re-evaluar al cambiar expresión o valores de prueba
  useEffect(() => {
    if (!expresion.trim()) {
      setPreview("")
      return
    }
    evaluar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expresion, vars])

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
        if (lista.length) {
          setVariableResultadoId((prev) => prev || lista[0].id)
          setVars((prev) => {
            if (prev.some((v) => v.id)) return prev
            return prev.map((v, i) => {
              const opt = lista[Math.min(i, lista.length - 1)]
              const distinct = lista[i] ?? opt
              return {
                id: distinct.id,
                nombre: distinct.nombre,
                prueba: v.prueba || "0",
              }
            })
          })
          setExprParts((prev) => {
            if (prev.length > 0) return prev
            if (lista.length >= 2) {
              return [
                { kind: "var", id: lista[0].id, nombre: lista[0].nombre },
                { kind: "op", value: "+" },
                { kind: "var", id: lista[1].id, nombre: lista[1].nombre },
              ]
            }
            if (lista.length === 1) {
              return [{ kind: "var", id: lista[0].id, nombre: lista[0].nombre }]
            }
            return prev
          })
        }
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
    if (vars.some((v) => !v.id || !v.nombre.trim())) {
      return alert("Selecciona variables existentes para todos los campos de Variable 1, 2, …")
    }

    // Obtener proceso_id de la variable seleccionada (requerido por BD)
    const varOpt = variablesOptions.find(v => v.id === variableResultadoId)
    let finalProcesoId = varOpt?.proceso_id

    // Si no se puede obtener el proceso_id, usar un proceso genérico o el primero disponible
    if (!finalProcesoId) {
      // Intentar obtener el detalle de la variable
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
          finalProcesoId = extractProcesoId(v)
        }
      } catch {
        /* noop */
      }
      
      // Si aún no se puede obtener, intentar obtener un proceso válido
      if (!finalProcesoId) {
        try {
          // Intentar obtener el primer proceso disponible
          const resProcesos = await fetch(`${API_BASE_URL}/api/procesos`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (resProcesos.ok) {
            const procesosData = await resProcesos.json().catch(() => ({}))
            const procesos = procesosData.procesos || procesosData.data || procesosData || []
            if (procesos.length > 0) {
              finalProcesoId = procesos[0].id
            }
          }
        } catch {
          // noop
        }
        
        // Si aún no hay proceso, mostrar error más específico
        if (!finalProcesoId) {
          return alert("No se pudo determinar el proceso para la fórmula. Verifica que existan procesos en el sistema.")
        }
      }
    }

    const payload = {
      nombre: nombre.trim(),
      expresion: expresion.trim(), // <--- ¡Aquí va la fórmula!
      proceso_id: finalProcesoId,
      variables_usadas: variablesUsadas,
      variable_resultado_id: variableResultadoId,
    }

    // Validar que todos los campos requeridos estén presentes
    if (!payload.nombre || !payload.expresion || !payload.proceso_id || !payload.variable_resultado_id) {
      return alert("Faltan campos requeridos para guardar la fórmula")
    }

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
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.FORMULA_CREATE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        return alert(`Error ${res.status}: ${data?.message || data?.error || "No se pudo guardar la fórmula"}`)
      }
      alert("Fórmula guardada correctamente")
      // No redirigir automáticamente - el usuario puede seguir trabajando en la página
    } catch (err) {
      alert("Error guardando la fórmula")
    } finally {
      setGuardando(false)
    }
  }
  // ▼ NUEVO: Estado para gestión de fórmulas
  const [formulas, setFormulas] = useState<any[]>([])
  const [loadingFormulas, setLoadingFormulas] = useState(false)
  const [errorFormulas, setErrorFormulas] = useState<string | null>(null)
  const [editFormula, setEditFormula] = useState<any | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteFormula, setDeleteFormula] = useState<any | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editNombre, setEditNombre] = useState("")
  const [editExpresion, setEditExpresion] = useState("")
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Cargar fórmulas existentes
  useEffect(() => {
    async function fetchFormulas() {
      setLoadingFormulas(true)
      setErrorFormulas(null)
      try {
        const token = getToken()
        const res = await fetch(`${API_BASE_URL}/api/formulas`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json().catch(() => ({}))
        let arr: any[] = []
        if (Array.isArray(json?.formulas)) arr = json.formulas
        else if (Array.isArray(json?.data)) arr = json.data
        else if (Array.isArray(json)) arr = json
        setFormulas(arr)
      } catch (e: any) {
        setErrorFormulas("No se pudieron cargar las fórmulas")
      } finally {
        setLoadingFormulas(false)
      }
    }
    fetchFormulas()
  }, [])

  // Refrescar fórmulas tras editar/eliminar
  async function refreshFormulas() {
    setLoadingFormulas(true)
    setErrorFormulas(null)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/api/formulas`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      let arr: any[] = []
      if (Array.isArray(json?.formulas)) arr = json.formulas
      else if (Array.isArray(json?.data)) arr = json.data
      else if (Array.isArray(json)) arr = json
      setFormulas(arr)
    } catch (e: any) {
      setErrorFormulas("No se pudieron cargar las fórmulas")
    } finally {
      setLoadingFormulas(false)
    }
  }

  // --- Editar fórmula ---
  function handleOpenEdit(f: any) {
    setEditFormula(f)
    setEditNombre(f.nombre)
    setEditExpresion(f.expresion)
    setShowEditModal(true)
  }
  async function handleSaveEdit() {
    if (!editFormula) return
    setSavingEdit(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/api/formulas/${editFormula.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ nombre: editNombre, expresion: editExpresion }),
      })
      if (!res.ok) throw new Error("No se pudo actualizar la fórmula")
      setShowEditModal(false)
      setEditFormula(null)
      await refreshFormulas()
    } catch (e: any) {
      alert(e.message || "Error al actualizar la fórmula")
    } finally {
      setSavingEdit(false)
    }
  }

  // --- Eliminar fórmula ---
  function handleOpenDelete(f: any) {
    setDeleteFormula(f)
    setShowDeleteModal(true)
  }
  async function handleConfirmDelete() {
    if (!deleteFormula) return
    setDeleting(true)
    try {
      const token = getToken()
      const res = await fetch(`${API_BASE_URL}/api/formulas/${deleteFormula.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("No se pudo eliminar la fórmula")
      setShowDeleteModal(false)
      setDeleteFormula(null)
      await refreshFormulas()
    } catch (e: any) {
      alert(e.message || "Error al eliminar la fórmula")
    } finally {
      setDeleting(false)
    }
  }

  const previewIsError = typeof preview === "string" && preview.startsWith("⚠")

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-100">
        <Navbar role={userRole} />

        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          {/* Header */}
          <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-700 to-blue-800 text-white shadow-md">
            <div className="flex items-center gap-4 px-5 py-5 sm:px-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
                <span className="material-icons text-3xl">functions</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Creador de Fórmulas</h1>
                <p className="text-sm text-sky-100">
                  Elige variables del dataset, arma la operación con clics y guarda el resultado.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.15fr]">
            {/* Columna izquierda: variables + destino */}
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                    1
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Variables de entrada</h2>
                    <p className="text-xs text-slate-500">Mismo catálogo que el destino del resultado</p>
                  </div>
                </div>

                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Cantidad</label>
                    <Input
                      type="number"
                      min={1}
                      value={numVars}
                      onChange={(e) => setNumVars(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <Button onClick={handleGenerarCampos} className="bg-sky-600 hover:bg-sky-700 text-white">
                    Actualizar campos
                  </Button>
                </div>

                <div className="space-y-3">
                  {vars.map((v, i) => {
                    const selectedElsewhere = new Set(
                      vars.filter((_, idx) => idx !== i).map((item) => item.id).filter(Boolean)
                    )
                    return (
                      <div
                        key={i}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-3"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Entrada {i + 1}
                          </span>
                          {v.id ? (
                            <button
                              type="button"
                              onClick={() => insertVar(v)}
                              className="text-xs font-medium text-sky-700 hover:text-sky-900"
                            >
                              + Insertar en fórmula
                            </button>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_6.5rem]">
                          {variablesOptions.length === 0 ? (
                            <div className="rounded bg-red-50 p-2 text-sm text-red-600" role="alert">
                              No hay variables disponibles.
                            </div>
                          ) : (
                            <Select
                              value={v.id || undefined}
                              onValueChange={(value) => handleSelectVar(i, value)}
                            >
                              <SelectTrigger id={`variable-usada-${i}`} aria-label={`Variable ${i + 1}`}>
                                <SelectValue placeholder="Selecciona variable" />
                              </SelectTrigger>
                              <SelectContent className="bg-white text-slate-900">
                                {variablesOptions.map((opt) => (
                                  <SelectItem
                                    key={opt.id}
                                    value={opt.id}
                                    disabled={selectedElsewhere.has(opt.id) && opt.id !== v.id}
                                  >
                                    {opt.nombre}{opt.unidad ? ` (${opt.unidad})` : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div>
                            <Input
                              type="number"
                              placeholder="Prueba"
                              value={v.prueba}
                              onChange={(e) => handleChangePrueba(i, e.target.value)}
                              aria-label={`Valor de prueba variable ${i + 1}`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                    3
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Destino y nombre</h2>
                    <p className="text-xs text-slate-500">Dónde se aplica y cómo se identifica</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="nombre-formula" className="mb-1 block text-sm font-medium text-slate-700">
                      Nombre de la fórmula
                    </label>
                    <Input
                      id="nombre-formula"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Cálculo de ΔT"
                    />
                  </div>

                  <div>
                    <label htmlFor="variable-resultado" className="mb-1 block text-sm font-medium text-slate-700">
                      Variable que recibirá el resultado
                    </label>
                    {variablesOptions.length === 0 ? (
                      <div className="rounded bg-red-50 p-2 text-sm text-red-600" role="alert">
                        No hay variables disponibles para seleccionar.
                      </div>
                    ) : (
                      <Select
                        value={variableResultadoId}
                        onValueChange={setVariableResultadoId}
                        disabled={variablesOptions.length === 0}
                      >
                        <SelectTrigger id="variable-resultado" aria-label="Variable resultado">
                          <SelectValue placeholder="Selecciona la variable destino" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-slate-900">
                          {variablesOptions.map((v) => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.nombre}{v.unidad ? ` (${v.unidad})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Se aplicará automáticamente a esta variable en los procesos donde aparezca.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Columna derecha: constructor + preview */}
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-sm font-bold text-white">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Construir operación</h2>
                    <p className="text-xs text-slate-500">Haz clic en variables y operadores — sin escribir nombres</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Insertar variable
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {vars.filter((v) => v.id && v.nombre).length === 0 ? (
                      <span className="text-sm text-slate-400">Define variables en el paso 1</span>
                    ) : (
                      vars
                        .filter((v) => v.id && v.nombre)
                        .map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => insertVar(v)}
                            className="max-w-full truncate rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-left text-sm font-medium text-sky-900 transition hover:border-sky-400 hover:bg-sky-100"
                            title={v.nombre}
                          >
                            {v.nombre}
                          </button>
                        ))
                    )}
                  </div>
                </div>

                <div className="mb-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Operadores
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OPERATORS.map((op) => (
                      <button
                        key={op.value}
                        type="button"
                        onClick={() => insertOp(op)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 font-mono text-lg font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
                        aria-label={`Insertar ${op.value}`}
                      >
                        {op.value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Número constante
                  </p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={numeroInsertar}
                      onChange={(e) => setNumeroInsertar(e.target.value)}
                      placeholder="Ej. 2"
                      className="max-w-[8rem]"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          insertNumero()
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={insertNumero}>
                      Insertar número
                    </Button>
                  </div>
                </div>

                <div className="mb-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 min-h-[5.5rem]">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Expresión
                    </p>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={undoLastPart} className="h-7 px-2 text-xs">
                        Borrar último
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={clearExpression} className="h-7 px-2 text-xs text-red-600">
                        Limpiar
                      </Button>
                    </div>
                  </div>
                  {exprParts.length === 0 ? (
                    <p className="text-sm text-slate-400">La fórmula aparecerá aquí al seleccionar piezas…</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {exprParts.map((part, idx) => (
                        <span
                          key={`${part.kind}-${idx}-${part.kind === "var" ? part.id : part.value}`}
                          className={
                            part.kind === "var"
                              ? "rounded-md bg-sky-600 px-2 py-1 text-sm font-medium text-white"
                              : part.kind === "num"
                                ? "rounded-md bg-amber-100 px-2 py-1 font-mono text-sm text-amber-900"
                                : "rounded-md bg-slate-200 px-2 py-1 font-mono text-sm font-semibold text-slate-800"
                          }
                        >
                          {part.kind === "var" ? part.nombre : part.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  Cadena guardada: <span className="font-mono text-slate-700">{expresion || "—"}</span>
                </p>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-semibold text-slate-900">Vista previa</h2>
                <div
                  className={`mb-4 flex flex-col gap-1 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                    previewIsError
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  <span className="text-sm font-medium">Resultado con valores de prueba</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {preview === "" ? "—" : String(preview)}
                  </span>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={evaluar}>
                    Evaluar de nuevo
                  </Button>
                  <Button
                    type="button"
                    onClick={handleGuardar}
                    disabled={guardando}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold"
                  >
                    {guardando ? "Guardando…" : "Guardar fórmula"}
                  </Button>
                </div>
              </section>
            </div>
          </div>

          {/* Gestor de fórmulas */}
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Gestión de fórmulas</h2>
            {loadingFormulas ? (
              <div className="text-slate-500">Cargando fórmulas...</div>
            ) : errorFormulas ? (
              <div className="text-red-500">{errorFormulas}</div>
            ) : formulas.length === 0 ? (
              <div className="text-slate-400">No hay fórmulas registradas.</div>
            ) : (
              <ul className="space-y-3">
                {formulas.map((f) => (
                  <li key={f.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{f.nombre}</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(f)} aria-label="Editar fórmula" className="h-8 w-8 p-0">
                          <span className="material-icons text-sm">edit</span>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleOpenDelete(f)} aria-label="Eliminar fórmula" className="h-8 w-8 p-0">
                          <span className="material-icons text-sm">delete</span>
                        </Button>
                      </div>
                    </div>
                    <div className="break-all font-mono text-sm text-sky-700">{f.expresion}</div>
                  </li>
                ))}
              </ul>
            )}

            {showEditModal && (
              <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                  <div className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
                    <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditModal(false)} aria-label="Cerrar">
                      <X size={18} />
                    </button>
                    <h3 className="mb-3 text-base font-bold">Editar fórmula</h3>
                    <div className="mb-3">
                      <Label className="text-sm">Nombre</Label>
                      <Input value={editNombre} onChange={(e) => setEditNombre(e.target.value)} className="mt-1" />
                    </div>
                    <div className="mb-3">
                      <Label className="text-sm">Operación</Label>
                      <Input value={editExpresion} onChange={(e) => setEditExpresion(e.target.value)} className="mt-1 font-mono" />
                    </div>
                    <div className="mt-4 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={savingEdit} className="px-3 py-1 text-sm">Cancelar</Button>
                      <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-sky-600 hover:bg-sky-700 px-3 py-1 text-sm font-semibold text-white">
                        {savingEdit ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Dialog>
            )}

            {showDeleteModal && (
              <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                  <div className="relative w-full max-w-md rounded-lg bg-white p-4 shadow-lg">
                    <button className="absolute right-2 top-2 text-gray-400 hover:text-gray-600" onClick={() => setShowDeleteModal(false)} aria-label="Cerrar">
                      <X size={18} />
                    </button>
                    <h3 className="mb-3 text-base font-bold">Eliminar fórmula</h3>
                    <p className="mb-4 text-sm">
                      ¿Seguro que deseas eliminar la fórmula <span className="font-semibold">{deleteFormula?.nombre}</span>? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting} className="px-3 py-1 text-sm">Cancelar</Button>
                      <Button onClick={handleConfirmDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700 px-3 py-1 text-sm font-semibold text-white">
                        {deleting ? "Eliminando..." : "Eliminar"}
                      </Button>
                    </div>
                  </div>
                </div>
              </Dialog>
            )}
          </section>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("Organomex_token")
}
