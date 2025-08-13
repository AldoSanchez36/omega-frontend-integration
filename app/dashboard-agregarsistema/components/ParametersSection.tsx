"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Edit, Trash2, Copy } from "lucide-react"

type Props = {
  selectedSystemId: string | null
  systems: any[]
  parameters: any[]

  // tolerancias por variable_id
  tolerancias: Record<string, any>
  tolLoading?: Record<string, boolean>
  tolError?: Record<string, string | null>
  tolSuccess?: Record<string, string | null>

  // handlers
  handleTolChange: (variableId: string, field: string, value: string) => void
  handleTolSave: (variableId: string) => void
  handleOpenEditModal: (p: any) => void
  handleDeleteParameter: (id: string) => void
  handleImportTolerances?: (sourceSystemId: string) => void
}

export default function ParametersSection({
  selectedSystemId, systems, parameters,
  tolerancias, tolLoading = {}, tolError = {}, tolSuccess = {},
  handleTolChange, handleTolSave,
  handleOpenEditModal, handleDeleteParameter,
  handleImportTolerances,
}: Props) {
  if (!selectedSystemId) return null

  // Sistemas disponibles para importar tolerancias (excluyendo el actual)
  const availableSystemsForImport = systems.filter(sys => sys.id !== selectedSystemId)

  return (
    <div className="border-t border-gray-200 pt-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-medium leading-6 text-gray-900">Parámetros del Sistema</h2>
          <p className="mt-1 text-sm text-gray-500">
            Parámetros para el sistema seleccionado:{" "}
            <span className="font-semibold">
              {systems.find((s: any) => s.id === selectedSystemId)?.nombre || "N/A"}
            </span>
          </p>
        </div>
        
        {/* Botón para importar tolerancias */}
        {availableSystemsForImport.length > 0 && handleImportTolerances && (
          <div className="flex items-center gap-2">
            <Select onValueChange={handleImportTolerances}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Importar tolerancias de otro sistema" />
              </SelectTrigger>
              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                {availableSystemsForImport.map((system: any) => (
                  <SelectItem key={system.id} value={system.id}>
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      {system.nombre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Botón temporal para debug */}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                console.log("Estado actual de tolerancias:", tolerancias)
                console.log("Parámetros:", parameters)
              }}
              title="Debug: Ver estado actual"
            >
              🔍 Debug
            </Button>
          </div>
        )}
      </div>

      {/* Leyenda mejorada */}
      <div className="flex flex-col sm:flex-row gap-4 mt-2 text-xs items-start sm:items-center justify-between bg-gray-50 p-3 rounded-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400" />
            <span className="font-semibold text-yellow-700">Bajo bajo</span>: Límite inferior de advertencia
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block rounded bg-green-100 border border-green-400" />
            <span className="font-semibold text-green-700">Bajo</span>: Límite inferior del rango óptimo
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block rounded bg-green-100 border border-green-400" />
            <span className="font-semibold text-green-700">Alto</span>: Límite superior del rango óptimo
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400" />
            <span className="font-semibold text-yellow-700">Alto alto</span>: Límite superior de advertencia
          </div>
        </div>
      </div>

      <div className="mt-6">
        {parameters.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parameters.map((param: any) => {
                const tol = tolerancias[param.id] || {}
                const usarMin = !!tol.usar_limite_min
                const usarMax = !!tol.usar_limite_max
                return (
                  <TableRow key={param.id}>
                    <TableCell className="font-medium">{param.nombre}</TableCell>
                    <TableCell>{param.unidad}</TableCell>
                    <TableCell className="text-right flex gap-2 justify-end items-center">
                      {/* Inputs de tolerancia: Bajo bajo | Bajo/Alto | Alto alto */}
                      <div className="flex flex-row items-end gap-2">
                        {/* Bajo bajo - siempre visible con toggle */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-yellow-700">Bajo bajo</span>
                            <button
                              type="button"
                              onClick={() => handleTolChange(param.id, "usar_limite_min", (!usarMin).toString())}
                              className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${
                                usarMin ? "border-yellow-500 bg-yellow-100 cursor-pointer" : "border-gray-300 bg-gray-100 cursor-pointer"
                              }`}
                              title={usarMin ? "Desactivar límite inferior" : "Activar límite inferior"}
                            >
                              {usarMin && <span className="material-icons text-yellow-700 text-xs">check</span>}
                            </button>
                          </div>
                          <Input
                            type="number"
                            placeholder="min"
                            disabled={!usarMin}
                            value={tol.limite_min ?? ""}
                            onChange={(e) => handleTolChange(param.id, "limite_min", e.target.value)}
                            className={`w-14 text-xs py-1 px-1 ${
                              usarMin ? "bg-yellow-100 border-yellow-400 text-yellow-900" : "bg-gray-100 border-gray-300 text-gray-400"
                            }`}
                          />
                        </div>

                        {/* Bajo y Alto - siempre presente */}
                        <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
                          <div className="flex flex-row gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-green-700">Bajo</span>
                            <span className="text-xs font-semibold text-green-700">Alto</span>
                          </div>
                          <div className="flex flex-row gap-1">
                            <Input
                              type="number"
                              placeholder="min"
                              value={tol.bien_min ?? ""}
                              onChange={(e) => handleTolChange(param.id, "bien_min", e.target.value)}
                              className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                            />
                            <Input
                              type="number"
                              placeholder="max"
                              value={tol.bien_max ?? ""}
                              onChange={(e) => handleTolChange(param.id, "bien_max", e.target.value)}
                              className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                            />
                          </div>
                        </div>

                        {/* Alto alto - siempre visible con toggle */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-yellow-700">Alto alto</span>
                            <button
                              type="button"
                              onClick={() => handleTolChange(param.id, "usar_limite_max", (!usarMax).toString())}
                              className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${
                                usarMax ? "border-yellow-500 bg-yellow-100 cursor-pointer" : "border-gray-300 bg-gray-100 cursor-pointer"
                              }`}
                              title={usarMax ? "Desactivar límite superior" : "Activar límite superior"}
                            >
                              {usarMax && <span className="material-icons text-yellow-700 text-xs">check</span>}
                            </button>
                          </div>
                          <Input
                            type="number"
                            placeholder="max"
                            disabled={!usarMax}
                            value={tol.limite_max ?? ""}
                            onChange={(e) => handleTolChange(param.id, "limite_max", e.target.value)}
                            className={`w-14 text-xs py-1 px-1 ${
                              usarMax ? "bg-yellow-100 border-yellow-400 text-yellow-900" : "bg-gray-100 border-gray-300 text-gray-400"
                            }`}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-end">
                        {tolError[param.id] && <div className="text-xs text-red-600">{tolError[param.id]}</div>}
                        {tolSuccess[param.id] && <div className="text-xs text-green-600">{tolSuccess[param.id]}</div>}
                      </div>

                      {/* Acciones */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTolSave(param.id)}
                        className="ml-2 h-7 w-7 p-0 flex items-center justify-center"
                        disabled={!!tolLoading[param.id]}
                        title="Guardar límites"
                      >
                        <span className="material-icons text-base">save</span>
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenEditModal(param)} className="h-8 w-8 text-blue-500 hover:text-blue-700">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteParameter(param.id)} className="h-8 w-8 text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-sm text-gray-500">No hay parámetros para este sistema. ¡Agrega uno!</div>
        )}
      </div>
    </div>
  )
}