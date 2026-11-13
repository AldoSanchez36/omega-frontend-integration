"use client"

import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from '@/config/constants'

export interface Formula {
  id: string
  nombre: string
  expresion: string
  proceso_id: string
  variables_usadas: string[]
  variable_resultado_id: string
  /** Nombre del destino si el backend lo incluye (fallback de matching) */
  variable_resultado_nombre?: string
}

interface FormulaCalculation {
  parameterId: string
  parameterName: string
  originalValue: number
  calculatedValue: number
  formula: Formula
  applied: boolean
}

export interface FormulaSuggestion {
  parameterId: string
  value: number
  formulaName: string
  formulaId: string
  expression: string
}

function normalizeVarName(name: string): string {
  return String(name ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/u, "")
    .trim()
}

function namesMatch(a: string, b: string): boolean {
  const na = normalizeVarName(a)
  const nb = normalizeVarName(b)
  if (!na || !nb) return false
  return na === nb
}

function parseVariablesUsadas(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((v) => String(v ?? "").trim()).filter(Boolean)
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (!trimmed) return []
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v ?? "").trim()).filter(Boolean)
      }
    } catch {
      // comma-separated fallback
      return trimmed.split(",").map((v) => v.trim()).filter(Boolean)
    }
  }
  return []
}

function normalizeFormula(raw: any): Formula | null {
  if (!raw || typeof raw !== "object") return null
  const id = String(raw.id ?? "")
  const expresion = String(raw.expresion ?? raw.expression ?? "").trim()
  const variableResultadoId = String(
    raw.variable_resultado_id ?? raw.variableResultadoId ?? raw.variable_id ?? ""
  )
  if (!id || !expresion || !variableResultadoId) return null

  const resultadoNombre = String(
    raw.variable_resultado_nombre ??
      raw.variable_resultado?.nombre ??
      raw.variableResultado?.nombre ??
      raw.variable?.nombre ??
      ""
  ).trim()

  return {
    id,
    nombre: String(raw.nombre ?? raw.name ?? "Fórmula"),
    expresion,
    proceso_id: String(raw.proceso_id ?? raw.procesoId ?? ""),
    variables_usadas: parseVariablesUsadas(raw.variables_usadas ?? raw.variablesUsadas),
    variable_resultado_id: variableResultadoId,
    ...(resultadoNombre ? { variable_resultado_nombre: resultadoNombre } : {}),
  }
}

export function useFormulas(token: string | null, _selectedSystem?: string) {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadFormulas = async () => {
      if (!token) {
        setFormulas([])
        return
      }

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`${API_BASE_URL}/api/formulas`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) {
          throw new Error('Error al cargar fórmulas')
        }

        const data = await res.json()
        const formulasData = data.formulas || data.data || data || []
        const lista = (Array.isArray(formulasData) ? formulasData : [])
          .map(normalizeFormula)
          .filter((f): f is Formula => Boolean(f))

        setFormulas(lista)
      } catch (err: any) {
        setError(err.message)
        setFormulas([])
      } finally {
        setLoading(false)
      }
    }

    loadFormulas()
  }, [token])

  const evaluateFormula = useCallback((formula: Formula, variableValues: Record<string, number>): number | null => {
    try {
      if (!formula.expresion) return null

      const usedNames = (formula.variables_usadas?.length
        ? formula.variables_usadas
        : Object.keys(variableValues)
      ).filter(Boolean)

      // Solo exigir variables que realmente aparecen en la expresión
      const namesInExpr = usedNames.filter((name) => formula.expresion.includes(name))
      const needed = namesInExpr.length > 0 ? namesInExpr : usedNames

      const missing = needed.filter(
        (varName) => variableValues[varName] === undefined || variableValues[varName] === null
      )
      if (missing.length > 0) return null

      const sortedNames = [...needed].sort((a, b) => b.length - a.length)
      let expression = formula.expresion.trim()
      const params: string[] = []
      const values: number[] = []

      sortedNames.forEach((name, i) => {
        const token = `__v${i}`
        if (expression.includes(name)) {
          expression = expression.split(name).join(token)
        }
        params.push(token)
        values.push(variableValues[name])
      })

      if (!/^[a-zA-Z0-9_\s+\-*/().]+$/.test(expression)) {
        return null
      }

      // eslint-disable-next-line no-new-func
      const fn = new Function(...params, `return (${expression})`)
      const result = fn(...values)

      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return null
      }

      return result
    } catch {
      return null
    }
  }, [])

  const resolveInputValues = useCallback((
    formula: Formula,
    parameters: Array<{ id: string; nombre: string; value?: number | null }>
  ): Record<string, number> | null => {
    let usedNames = formula.variables_usadas?.length ? [...formula.variables_usadas] : []

    // Si no hay lista (fórmulas viejas), inferir nombres desde la expresión vs parámetros del sistema
    if (usedNames.length === 0) {
      usedNames = parameters
        .map((p) => p.nombre)
        .filter((nombre) => formula.expresion.includes(nombre))
        .sort((a, b) => b.length - a.length)
    }

    const namesInExpr = usedNames.filter((name) => formula.expresion.includes(name))
    let needed = namesInExpr.length > 0 ? namesInExpr : usedNames

    // Fallback: match por nombre normalizado aunque el texto en expresión no sea idéntico byte-a-byte
    if (needed.length === 0) {
      needed = parameters
        .map((p) => p.nombre)
        .filter((nombre) => {
          const n = normalizeVarName(nombre)
          return n.length > 0 && normalizeVarName(formula.expresion).includes(n)
        })
        .sort((a, b) => b.length - a.length)
    }

    if (needed.length === 0) return null

    const variableValues: Record<string, number> = {}
    for (const name of needed) {
      const match = parameters.find((p) => namesMatch(p.nombre, name) || p.nombre === name)
      if (!match || match.value === undefined || match.value === null || Number.isNaN(Number(match.value))) {
        return null
      }
      // Clave = nombre tal como aparece en la fórmula/expresión
      variableValues[name] = Number(match.value)
      if (match.nombre !== name) {
        variableValues[match.nombre] = Number(match.value)
      }
    }
    return variableValues
  }, [])

  /** Sugerencias de autofill para reportmanager (no pisa overrides del caller). */
  const suggestFormulaValues = useCallback((
    parameters: Array<{ id: string; nombre: string; value?: number | null; variable_id?: string | null }>
  ): FormulaSuggestion[] => {
    const suggestions: FormulaSuggestion[] = []

    formulas.forEach((formula) => {
      const target = parameters.find((p) =>
        String(p.id) === String(formula.variable_resultado_id) ||
        (p.variable_id != null && String(p.variable_id) === String(formula.variable_resultado_id)) ||
        (formula.variable_resultado_nombre
          ? namesMatch(p.nombre, formula.variable_resultado_nombre)
          : false)
      )
      if (!target) return

      // Inputs: todos los parámetros del sistema (el destino no cuenta como input salvo que esté en variables_usadas)
      const variableValues = resolveInputValues(formula, parameters)
      if (!variableValues) return

      const calculated = evaluateFormula(formula, variableValues)
      if (calculated === null) return

      suggestions.push({
        parameterId: target.id,
        value: calculated,
        formulaName: formula.nombre,
        formulaId: formula.id,
        expression: formula.expresion,
      })
    })

    return suggestions
  }, [formulas, evaluateFormula, resolveInputValues])

  const applyFormulasToParameters = useCallback((
    parameters: Array<{ id: string; nombre: string; value: number }>,
    _systemName: string
  ): FormulaCalculation[] => {
    const calculations: FormulaCalculation[] = []

    formulas.forEach((formula) => {
      const targetParam = parameters.find(
        (p) => String(p.id) === String(formula.variable_resultado_id)
      )
      if (!targetParam) return

      let values = resolveInputValues(formula, parameters)
      if (!values) {
        const legacy: Record<string, number> = {}
        formula.variables_usadas.forEach((varName) => {
          const match = parameters.find((p) => namesMatch(p.nombre, varName))
          if (match) legacy[varName] = match.value
          else if (varName === "x" || varName === "y" || varName === "z") {
            legacy[varName] = targetParam.value
          }
        })
        if (Object.keys(legacy).length === 0) {
          legacy.x = targetParam.value
        }
        values = legacy
      }

      const calculatedValue = evaluateFormula(formula, values)
      if (calculatedValue === null) return

      calculations.push({
        parameterId: targetParam.id,
        parameterName: targetParam.nombre,
        originalValue: targetParam.value,
        calculatedValue,
        formula,
        applied: true,
      })
    })

    return calculations
  }, [formulas, evaluateFormula, resolveInputValues])

  const getFinalValue = useCallback((
    parameterId: string,
    originalValue: number,
    calculations: FormulaCalculation[]
  ): number => {
    const calculation = calculations.find(calc => calc.parameterId === parameterId)
    return calculation?.applied ? calculation.calculatedValue : originalValue
  }, [])

  const isFormulaTarget = useCallback((parameterId: string) => {
    return formulas.some((f) => String(f.variable_resultado_id) === String(parameterId))
  }, [formulas])

  return {
    formulas,
    loading,
    error,
    evaluateFormula,
    applyFormulasToParameters,
    suggestFormulaValues,
    isFormulaTarget,
    getFinalValue
  }
}
