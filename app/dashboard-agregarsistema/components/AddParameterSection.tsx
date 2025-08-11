

"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

type Props = {
  selectedSystemId: string | null
  loading: boolean
  allVariables: any[]
  selectedImportVariableId: string
  newParameterName: string
  newParameterUnit: string
  actions: any
}

export default function AddParameterSection(props: Props) {
  const {
    selectedSystemId, loading,
    allVariables, selectedImportVariableId,
    newParameterName, newParameterUnit,
    actions
  } = props
  const {
    setSelectedImportVariableId, getAvailableVariables,
    setNewParameterName, setNewParameterUnit,
    handleAddParameter
  } = actions

  if (!selectedSystemId) return null

  return (
    <div className="border-t border-gray-200 pt-6">
      <h2 className="text-lg font-medium leading-6 text-gray-900">Agregar Nuevo Parámetro</h2>
      <p className="mt-1 text-sm text-gray-500">Añada un nuevo parámetro al sistema seleccionado.</p>

      {/* Droplist de variables existentes */}
      {allVariables.length > 0 && (
        <div className="mb-4">
          <Label htmlFor="import-variable">Importar variable existente</Label>
          <Select
            value={selectedImportVariableId}
            onValueChange={setSelectedImportVariableId}
          >
            <SelectTrigger className="w-full bg-[#f6f6f6] text-gray-900 border border-gray-300 rounded-md">
              <SelectValue placeholder="Selecciona una variable existente" />
            </SelectTrigger>
            <SelectContent className="bg-[#f6f6f6] text-gray-900">
              {getAvailableVariables().map((variable: any) => (
                <SelectItem key={variable.id} value={variable.id}>
                  {variable.nombre} ({variable.unidad})
                  {!variable.proceso_id && " - Global"}
                  {variable.proceso_id && variable.proceso_id !== selectedSystemId && " - De otro sistema"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {getAvailableVariables().length === 0 && (
            <p className="text-sm text-gray-500 mt-1">
              No hay variables disponibles para importar. Todas las variables ya están en este sistema o no hay variables globales.
            </p>
          )}
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="grid gap-2">
          <Label htmlFor="new-param-name">Nombre del Parámetro</Label>
          <Input
            id="new-param-name"
            placeholder="Ej. Temperatura"
            value={newParameterName}
            onChange={(e) => setNewParameterName(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-param-unit">Unidad de Medida</Label>
          <Input
            id="new-param-unit"
            placeholder="Ej. °C"
            value={newParameterUnit}
            onChange={(e) => setNewParameterUnit(e.target.value)}
          />
        </div>
      </div>

      <Button
        type="button"
        onClick={handleAddParameter}
        className="mt-4"
        disabled={!selectedSystemId || loading}
      >
        <Plus className="mr-2 h-4 w-4" /> Agregar Parámetro a la lista
      </Button>
      <p className="mt-2 text-sm text-gray-500">
        ⚠️ Recuerde hacer clic en <strong>"Guardar Cambios"</strong> al final del formulario para guardar los parámetros en la base de datos.
      </p>
    </div>
  )
}