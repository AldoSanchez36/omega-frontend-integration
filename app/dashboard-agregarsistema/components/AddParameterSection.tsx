

"use client"

import React, { useState } from "react"
import ReactSelect from 'react-select'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Copy, Database } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Props = {
  selectedSystemId: string | null
  loading: boolean
  allVariables: any[]
  systems: any[]
  selectedImportVariableId: string
  newParameterName: string
  newParameterUnit: string
  actions: any
}

export default function AddParameterSection(props: Props) {
  const {
    selectedSystemId, loading,
    allVariables, systems,
    selectedImportVariableId, newParameterName, newParameterUnit,
    actions
  } = props
  const {
    setSelectedImportVariableId, getAvailableVariables,
    setNewParameterName, setNewParameterUnit,
    handleAddParameter, handleImportVariablesFromSystem
  } = actions

  const [activeTab, setActiveTab] = useState("import")

  if (!selectedSystemId) return null

  // Obtener sistemas disponibles para importar (excluyendo el actual)
  const availableSystemsForImport = systems ? systems.filter((sys: any) => sys.id !== selectedSystemId) : []

  // Formatear variables disponibles para ReactSelect
  const availableVariablesOptions = getAvailableVariables().map((variable: any) => {
    let label = `${variable.nombre} (${variable.unidad})`
    if (!variable.proceso_id) {
      label += " - Global"
    } else if (variable.proceso_id !== selectedSystemId) {
      const systemName = systems?.find((s: any) => s.id === variable.proceso_id)?.nombre || "Otro sistema"
      label += ` - ${systemName}`
    }
    return {
      value: variable.id,
      label: label,
      data: variable
    }
  })

  return (
    <div className="border-t border-gray-200 pt-6">
      <h2 className="text-lg font-medium leading-6 text-gray-900">Agregar Nuevo Parámetro</h2>
      <p className="mt-1 text-sm text-gray-500">Añada un nuevo parámetro al sistema seleccionado.</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import">
            <Database className="h-4 w-4 mr-2" /> Importar variable
          </TabsTrigger>
          <TabsTrigger value="system" disabled={availableSystemsForImport.length === 0}>
            <Copy className="h-4 w-4 mr-2" /> Importar de sistema
          </TabsTrigger>
        </TabsList>

        {/* Pestaña: Importar variable existente */}
        <TabsContent value="import">
          <Card>
            <CardContent className="pt-6">
              {availableVariablesOptions.length > 0 ? (
                <>
                  <div className="mb-4">
                    <Label htmlFor="import-variable">Importar variable existente</Label>
                    <ReactSelect
                      options={availableVariablesOptions}
                      value={availableVariablesOptions.find((opt: any) => opt.value === selectedImportVariableId) || null}
                      onChange={(option) => {
                        if (option) {
                          setSelectedImportVariableId(option.value)
                          setNewParameterName(option.data.nombre)
                          setNewParameterUnit(option.data.unidad)
                        } else {
                          setSelectedImportVariableId('')
                          setNewParameterName('')
                          setNewParameterUnit('')
                        }
                      }}
                      placeholder="Buscar y seleccionar variable existente"
                      isClearable
                      className="mt-1"
                      classNamePrefix="react-select"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddParameter}
                    className="mt-4"
                    disabled={!selectedSystemId || loading || !selectedImportVariableId}
                  >
                    <Database className="mr-2 h-4 w-4" /> Importar Variable a la lista
                  </Button>
                </>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  No hay variables disponibles para importar. Todas las variables ya están en este sistema o no hay variables globales.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pestaña: Importar de sistema */}
        <TabsContent value="system">
          <Card>
            <CardContent className="pt-6">
              {availableSystemsForImport.length > 0 ? (
                <>
                  <div className="mb-4">
                    <Label htmlFor="import-system">Seleccionar sistema fuente</Label>
                    <ReactSelect
                      options={availableSystemsForImport.map((sys: any) => ({
                        value: sys.id,
                        label: sys.nombre,
                        data: sys
                      }))}
                      placeholder="Seleccionar sistema para importar variables"
                      onChange={(option) => {
                        if (option && handleImportVariablesFromSystem) {
                          handleImportVariablesFromSystem(option.value)
                        }
                      }}
                      className="mt-1"
                      classNamePrefix="react-select"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Esta acción importará todas las variables del sistema seleccionado al sistema actual.
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500 mt-1">
                  No hay otros sistemas disponibles para importar variables.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-sm text-gray-500">
        ⚠️ Recuerde hacer clic en <strong>"Guardar Cambios"</strong> al final del formulario para guardar los parámetros en la base de datos.
      </p>
    </div>
  )
}