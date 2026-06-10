"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { buildToleranceDataFromRaw, getCellColorFromTolerance } from "@/lib/tolerance-colors";

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
}

interface Tolerance {
  id?: string;
  limite_min?: number | null;
  limite_max?: number | null;
  bien_min?: number | null;
  bien_max?: number | null;
  usar_limite_min?: boolean;
  usar_limite_max?: boolean;
}

interface ParameterValue {
  checked: boolean;
  value?: number;
  unidadSeleccionada?: string;
}

interface Props {
  parameters: Parameter[];
  parameterValues: Record<string, ParameterValue>;
  tolerancias: Record<string, Tolerance>;
  handleParameterChange: (parameterId: string, field: "checked" | "value", value: boolean | number) => void;
  handleUnitChange: (parameterId: string, unidad: string) => void;
  handleTolChange: (variableId: string, field: string, value: string | boolean) => void;
  handleTolSave: (variableId: string) => Promise<void>;
  tolLoading: Record<string, boolean>;
  tolError: Record<string, string | null>;
  tolSuccess: Record<string, string | null>;
  selectedSystem?: string;
  selectedPlant?: { id: string; nombre?: string } | null;
  onLimitsStateChange?: (limitsState: Record<string, { limite_min: boolean; limite_max: boolean }>) => void;
}

const ParametersVariableList: React.FC<Props> = ({
  parameters,
  parameterValues,
  tolerancias,
  handleParameterChange,
  handleUnitChange,
  handleTolChange,
  handleTolSave,
  tolLoading,
  tolError,
  tolSuccess,
  selectedSystem,
  selectedPlant,
  onLimitsStateChange,
  }) => {
  
  // Función para notificar cambios de estado de límites
  const notifyLimitsStateChange = (parameterId: string, limiteType: 'limite_min' | 'limite_max', newState: boolean) => {
    if (onLimitsStateChange) {
      const currentState = parameters.reduce((acc, param) => {
        acc[param.id] = {
          limite_min: !!tolerancias[param.id]?.usar_limite_min,
          limite_max: !!tolerancias[param.id]?.usar_limite_max,
        };
        return acc;
      }, {} as Record<string, { limite_min: boolean; limite_max: boolean }>);
      
      // Actualizar el estado específico
      currentState[parameterId][limiteType] = newState;
      
      onLimitsStateChange(currentState);
    }
  };
  
  const getInputColor = (parameterId: string, value: number | undefined): string => {
    if (value === undefined || value === null) return "#FFC6CE";

    const tolerancia = tolerancias[parameterId];
    if (!tolerancia) return "";

    const param = parameters.find((p) => p.id === parameterId);
    const toleranceData = buildToleranceDataFromRaw(
      tolerancia as Record<string, unknown>,
      param?.nombre ?? parameterId,
      {
        limitsState: {
          limite_min: !!tolerancia.usar_limite_min,
          limite_max: !!tolerancia.usar_limite_max,
        },
      }
    );

    return getCellColorFromTolerance(value, toleranceData);
  };
  return (
    <div className="space-y-1.5">
      {/* Header de columnas */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-x-2 items-center px-1 py-1 bg-gray-50 rounded-lg">
        <div className="text-sm font-semibold text-gray-700">Parámetros</div>
        <div className="text-sm font-semibold text-gray-700 text-center">Unidad de medida</div>
        <div className="text-sm font-semibold text-gray-700 text-right">Límites</div>
      </div>
      
      {parameters.map(parameter => {
        const checked = parameterValues[parameter.id]?.checked || false;
        const unidadesList = parameter.unidad.split(',').map(u => u.trim());
        const usarLimiteMin = !!tolerancias[parameter.id]?.usar_limite_min;
        const usarLimiteMax = !!tolerancias[parameter.id]?.usar_limite_max;

        return (
          <div
            key={parameter.id}
            className="flex flex-col space-y-1 px-1 py-1 border rounded-lg md:grid md:grid-cols-[1fr_auto_1fr] md:justify-items-start md:items-center md:gap-x-2 md:space-y-0"
          >
            {/* Columna 1: Parámetros */}
            <div className="flex items-center space-x-1.5">
              <Checkbox
                checked={checked}
                onCheckedChange={(checked) => handleParameterChange(parameter.id, "checked", checked as boolean)}
              />
              <span className="font-medium text-sm">{parameter.nombre}</span>
              {checked && (
                <Input
                  type="number"
                  placeholder="Valor"
                  className="w-[80px] text-sm h-7 ml-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{
                    backgroundColor: getInputColor(parameter.id, parameterValues[parameter.id]?.value),
                    borderColor: getInputColor(parameter.id, parameterValues[parameter.id]?.value) ? getInputColor(parameter.id, parameterValues[parameter.id]?.value) : undefined
                  }}
                  value={parameterValues[parameter.id]?.value ?? ''}
                  onChange={e => handleParameterChange(parameter.id, 'value', Number(e.target.value))}
                />
              )}
            </div>
            
            {/* Columna 2: Unidad de medida */}
            <div className="flex justify-center md:justify-self-center">
              {checked ? (
                unidadesList.length > 1 ? (
                  <select
                    className="text-sm text-gray-500 border p-1 h-8"
                    value={parameterValues[parameter.id]?.unidadSeleccionada || ''}
                    onChange={e => handleUnitChange(parameter.id, e.target.value)}
                  >
                    <option value="" disabled hidden>Unidad</option>
                    {unidadesList.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-sm text-gray-500">{unidadesList[0]}</span>
                )
              ) : (
                <span className="text-sm text-gray-500">{parameter.unidad}</span>
              )}
            </div>
            
            {/* Columna 3: Límites */}
            <div className="flex flex-row items-end gap-1 justify-end w-full md:justify-self-end">
              {/* Bajo bajo - solo mostrar si existe limite_min en la base de datos */}
              {tolerancias[parameter.id]?.limite_min !== null && tolerancias[parameter.id]?.limite_min !== undefined && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs font-semibold ${usarLimiteMin ? 'text-yellow-700' : 'text-gray-500'}`}>Bajo bajo</span>
                    <button type="button" onClick={() => {
                      const newState = !usarLimiteMin;
                      handleTolChange(parameter.id, 'usar_limite_min', newState);
                      
                      // Notificar cambio de estado
                      notifyLimitsStateChange(parameter.id, 'limite_min', newState);
                      
                      // Console.log para ambos estados (activado/desactivado)
                      console.log("🔘 Radio button CAMBIO DE ESTADO:", {
                        variable: parameter.nombre,
                        variableId: parameter.id,
                        sistema: selectedSystem || "No seleccionado",
                        planta: selectedPlant?.nombre || "No seleccionada",
                        limite: "limite_min",
                        estado: newState ? "activado" : "desactivado",
                        timestamp: new Date().toISOString()
                      });
                    }}
                      className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${
                        usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'
                      }`}>
                      {usarLimiteMin && <span className="material-icons text-yellow-700 text-xs">check</span>}
                    </button>
                  </div>
                  <span
                    className={`w-12 text-xs py-0.5 px-0.5 text-center rounded h-6 flex items-center justify-center ${
                      usarLimiteMin ? 'bg-yellow-100 border border-yellow-400 text-yellow-900' : 'bg-gray-100 border border-gray-300 text-gray-400'  
                    }`}
                  >
                    {tolerancias[parameter.id]?.limite_min ?? '-'}
                  </span>
                </div>
              )}
              
              {/* Bajo / Alto - siempre presente, alineados verticalmente */}
              <div className="flex flex-row gap-1 items-end">
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-green-700 text-center w-full mb-0.5">Bajo</span>
                  <span className="w-12 bg-green-100 border-green-400 text-green-900 text-xs py-0.5 px-0.5 h-6 flex items-center justify-center rounded"
                    >{tolerancias[parameter.id]?.bien_min ?? '-'}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-green-700 text-center w-full mb-0.5">Alto</span>
                  <span className="w-12 bg-green-100 border-green-400 text-green-900 text-xs py-0.5 px-0.5 h-6 flex items-center justify-center rounded"
                    >{tolerancias[parameter.id]?.bien_max ?? '-'}</span>
                </div>
              </div>
              
              {/* Alto alto - solo mostrar si existe limite_max en la base de datos */}
              {tolerancias[parameter.id]?.limite_max !== null && tolerancias[parameter.id]?.limite_max !== undefined && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs font-semibold ${usarLimiteMax ? 'text-yellow-700' : 'text-gray-500'}`}>Alto alto</span>
                    <button type="button" onClick={() => {
                      const newState = !usarLimiteMax;
                      handleTolChange(parameter.id, 'usar_limite_max', newState);
                      
                      // Notificar cambio de estado
                      notifyLimitsStateChange(parameter.id, 'limite_max', newState);
                      
                      // Console.log para ambos estados (activado/desactivado)
                      console.log("🔘 Radio button CAMBIO DE ESTADO:", {
                        variable: parameter.nombre,
                        variableId: parameter.id,
                        sistema: selectedSystem || "No seleccionado",
                        planta: selectedPlant?.nombre || "No seleccionada",
                        limite: "limite_max",
                        estado: newState ? "activado" : "desactivado",
                        timestamp: new Date().toISOString()
                      });
                    }}
                      className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${
                        usarLimiteMax ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'
                      }`}>
                      {usarLimiteMax && <span className="material-icons text-yellow-700 text-xs">check</span>}
                    </button>
                  </div>
                  <span
                    className={`w-12 text-xs py-0.5 px-0.5 text-center rounded h-6 flex items-center justify-center ${
                      usarLimiteMax ? 'bg-yellow-100 border border-yellow-400 text-yellow-900' : 'bg-gray-100 border border-gray-300 text-gray-400'  
                    }`}
                  >
                    {tolerancias[parameter.id]?.limite_max ?? '-'}
                  </span>
                </div>
              )}
              {/*<Button size="icon" className="ml-2 h-7 w-7 p-0 flex items-center justify-center"
                onClick={() => handleTolSave(parameter.id)} disabled={tolLoading[parameter.id]} title="Guardar límites">
                <span className="material-icons text-base">save</span>
              </Button>*/}
              <div className="flex flex-col items-center justify-end">
                {tolError[parameter.id] && <div className="text-xs text-red-600">{tolError[parameter.id]}</div>}
                {tolSuccess[parameter.id] && <div className="text-xs text-green-600">{tolSuccess[parameter.id]}</div>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ParametersVariableList;