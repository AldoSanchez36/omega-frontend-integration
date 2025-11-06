"use client"

import { useState, useEffect, useCallback } from 'react'
import { API_BASE_URL } from '@/config/constants'

interface Formula {
  id: string
  nombre: string
  expresion: string
  proceso_id: string
  variables_usadas: string[]
  variable_resultado_id: string
}

interface FormulaCalculation {
  parameterId: string
  parameterName: string
  originalValue: number
  calculatedValue: number
  formula: Formula
  applied: boolean
}

export function useFormulas(token: string | null, selectedSystem?: string) {
  const [formulas, setFormulas] = useState<Formula[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar todas las fórmulas (no filtradas por sistema)
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
        const formulasData = data.formulas || data || []
        
        // No filtrar por proceso - cargar todas las fórmulas
        setFormulas(formulasData)
      } catch (err: any) {
        setError(err.message)
        setFormulas([])
      } finally {
        setLoading(false)
      }
    }

    loadFormulas()
  }, [token])

  // Función para evaluar una fórmula
  const evaluateFormula = useCallback((formula: Formula, variableValues: Record<string, number>): number | null => {
    try {
      if (!formula.expresion || !formula.variables_usadas) {
        return null
      }

      // Verificar que todas las variables necesarias estén disponibles
      const missingVariables = formula.variables_usadas.filter(
        varName => variableValues[varName] === undefined || variableValues[varName] === null
      )

      if (missingVariables.length > 0) {
        return null
      }

      // Crear función de evaluación segura
      const expression = formula.expresion.trim()
      
      // Validar que la expresión solo contenga caracteres seguros
      const safeExpression = /^[a-zA-Z0-9\s+\-*/().]+$/.test(expression)
      if (!safeExpression) {
        return null
      }

      // Crear función con las variables como parámetros
      const variableNames = formula.variables_usadas
      const variableValuesArray = variableNames.map(name => variableValues[name])
      
      // eslint-disable-next-line no-new-func
      const fn = new Function(...variableNames, `return (${expression})`)
      const result = fn(...variableValuesArray)

      // Validar que el resultado sea un número
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return null
      }

      return result
    } catch (err) {
      return null
    }
  }, [])

  // Función para aplicar fórmulas a los valores de parámetros
  const applyFormulasToParameters = useCallback((
    parameters: Array<{ id: string; nombre: string; value: number }>,
    systemName: string
  ): FormulaCalculation[] => {
    const calculations: FormulaCalculation[] = []

    parameters.forEach(param => {
      // Buscar fórmulas que tengan este parámetro como variable resultado
      // Ahora busca por ID de variable, independientemente del proceso
      const applicableFormulas = formulas.filter(formula => 
        formula.variable_resultado_id === param.id
      )

      if (applicableFormulas.length > 0) {
        // Usar la primera fórmula aplicable
        const formula = applicableFormulas[0]
        
        // Crear objeto con el valor del parámetro como variable
        const variableValues: Record<string, number> = {}
        
        // Mapear las variables de la fórmula con los valores disponibles
        formula.variables_usadas.forEach(varName => {
          // Si la variable coincide con el nombre del parámetro, usar su valor
          if (varName.toLowerCase() === param.nombre.toLowerCase() || 
              varName === 'x' || varName === 'y' || varName === 'z') {
            variableValues[varName] = param.value
          }
        })

        // Si no hay suficientes variables, intentar usar el valor del parámetro como 'x'
        if (Object.keys(variableValues).length === 0) {
          variableValues['x'] = param.value
        }

        const calculatedValue = evaluateFormula(formula, variableValues)
        
        if (calculatedValue !== null) {
          calculations.push({
            parameterId: param.id,
            parameterName: param.nombre,
            originalValue: param.value,
            calculatedValue,
            formula,
            applied: true
          })
        }
      }
    })

    return calculations
  }, [formulas, evaluateFormula])

  // Función para obtener el valor final (original o calculado)
  const getFinalValue = useCallback((
    parameterId: string,
    originalValue: number,
    calculations: FormulaCalculation[]
  ): number => {
    const calculation = calculations.find(calc => calc.parameterId === parameterId)
    return calculation?.applied ? calculation.calculatedValue : originalValue
  }, [])

  return {
    formulas,
    loading,
    error,
    evaluateFormula,
    applyFormulasToParameters,
    getFinalValue
  }
}
