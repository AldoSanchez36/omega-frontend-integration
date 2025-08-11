"use client"

import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Save, Edit, Trash2, Check } from "lucide-react"

function cx(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

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
}

export default function ParametersSection({
  selectedSystemId, systems, parameters,
  tolerancias, tolLoading = {}, tolError = {}, tolSuccess = {},
  handleTolChange, handleTolSave,
  handleOpenEditModal, handleDeleteParameter,
}: Props) {
  if (!selectedSystemId) return null

  return (
    <div className="border-t border-gray-200 pt-6">
      <h2 className="text-lg font-medium leading-6 text-gray-900">Parámetros del Sistema</h2>
      <div className="flex flex-row gap-4 mt-2 text-xs items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400" />
            <span className="font-semibold text-yellow-700">Limite-(min,max)</span>: Cerca del límite recomendado
          </div>
          <div className="flex items-center gap-1">
            <span className="w-4 h-4 inline-block rounded bg-green-100 border-green-400" />
            <span className="font-semibold text-green-700">Bien</span>: Dentro de rango
          </div>
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-500">
        Parámetros para el sistema seleccionado:{" "}
        <span className="font-semibold">
          {systems.find((s: any) => s.id === selectedSystemId)?.nombre || "N/A"}
        </span>
      </p>

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
                    <TableCell className="text-right flex flex-wrap gap-2 justify-end items-center">
                      {/* Lim-min / Bien / Lim-max */}
                      <div className="flex flex-row items-end gap-2">
                        {/* Lim-min */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-yellow-700">Lim-min</span>
                            <button
                              type="button"
                              onClick={() => handleTolChange(param.id, "usar_limite_min", (!usarMin).toString())}
                              className={cx(
                                "rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors",
                                usarMin ? "border-yellow-500 bg-yellow-100" : "border-gray-300 bg-gray-100",
                              )}
                            >
                              {usarMin && <Check className="h-3 w-3 text-yellow-700" />}
                            </button>
                          </div>
                          <input
                            type="number"
                            placeholder="min"
                            disabled={!usarMin}
                            value={tol.limite_min ?? ""}
                            onChange={(e) => handleTolChange(param.id, "limite_min", e.target.value)}
                            className={cx(
                              "flex h-8 rounded-md border w-14 text-xs py-1 px-1",
                              usarMin ? "bg-yellow-100 border-yellow-400 text-yellow-900"
                                      : "bg-gray-100 border-gray-300 text-gray-400",
                            )}
                          />
                        </div>

                        {/* Bien */}
                        <div className="flex flex-col items-center" style={{ minWidth: 60 }}>
                          <span className="text-xs font-semibold text-green-700 text-center w-full mb-0.5">Bien</span>
                          <div className="flex flex-row gap-1">
                            <input
                              type="number"
                              placeholder="min"
                              value={tol.bien_min ?? ""}
                              onChange={(e) => handleTolChange(param.id, "bien_min", e.target.value)}
                              className="flex h-8 rounded-md border w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                            />
                            <input
                              type="number"
                              placeholder="max"
                              value={tol.bien_max ?? ""}
                              onChange={(e) => handleTolChange(param.id, "bien_max", e.target.value)}
                              className="flex h-8 rounded-md border w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                            />
                          </div>
                        </div>

                        {/* Lim-max */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs font-semibold text-yellow-700">Lim-max</span>
                            <button
                              type="button"
                              onClick={() => handleTolChange(param.id, "usar_limite_max", (!usarMax).toString())}
                              className={cx(
                                "rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors",
                                usarMax ? "border-yellow-500 bg-yellow-100" : "border-gray-300 bg-gray-100",
                              )}
                            >
                              {usarMax && <Check className="h-3 w-3 text-yellow-700" />}
                            </button>
                          </div>
                          <input
                            type="number"
                            placeholder="max"
                            disabled={!usarMax}
                            value={tol.limite_max ?? ""}
                            onChange={(e) => handleTolChange(param.id, "limite_max", e.target.value)}
                            className={cx(
                              "flex h-8 rounded-md border w-14 text-xs py-1 px-1",
                              usarMax ? "bg-yellow-100 border-yellow-400 text-yellow-900"
                                      : "bg-gray-100 border-gray-300 text-gray-400",
                            )}
                          />
                        </div>
                      </div>

                      {/* Acciones */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTolSave(param.id)}
                        className="h-7 w-7 text-green-600 hover:text-green-700"
                        disabled={!!tolLoading[param.id]}
                        title="Guardar límites"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleOpenEditModal(param)} className="h-8 w-8 text-blue-500 hover:text-blue-700">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteParameter(param.id)} className="h-8 w-8 text-red-500 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      {tolSuccess[param.id] && <span className="text-green-600 text-xs ml-2">{tolSuccess[param.id]}</span>}
                      {tolError[param.id] && <span className="text-red-600 text-xs ml-2">{tolError[param.id]}</span>}
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