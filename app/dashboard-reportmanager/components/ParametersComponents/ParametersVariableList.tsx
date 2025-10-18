"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
}) => {
  
  // Función para determinar el color del input basado en el valor y límites
  const getInputColor = (parameterId: string, value: number | undefined): string => {
    if (value === undefined || value === null) return '#FFC6CE';
    
    const tolerancia = tolerancias[parameterId];
    if (!tolerancia) return '';
    
    const numValue = Number(value);
    if (isNaN(numValue)) return '';
    
    const usarLimiteMin = !!tolerancia.usar_limite_min;
    const usarLimiteMax = !!tolerancia.usar_limite_max;
    const bienMin = tolerancia.bien_min;
    const bienMax = tolerancia.bien_max;
    
    // CASO 1: Si solo existen bienMin y bienMax (sin limite_min/limite_max)
    if (!usarLimiteMin && !usarLimiteMax && 
        bienMin !== null && bienMin !== undefined && 
        bienMax !== null && bienMax !== undefined) {
      
      if (numValue < bienMin || numValue > bienMax) {
        return '#FFC6CE'; // Rojo - fuera del rango bien
      } else {
        return '#C6EFCE'; // Verde - dentro del rango bien
      }
    }
    
    // CASO 2: Si existen limite_min y/o limite_max
    // Verificar si está fuera de los límites críticos (rojo)
    if (usarLimiteMin && tolerancia.limite_min !== null && tolerancia.limite_min !== undefined) {
      if (numValue < tolerancia.limite_min) {
        return '#FFC6CE'; // Rojo
      }
    }
    
    if (usarLimiteMax && tolerancia.limite_max !== null && tolerancia.limite_max !== undefined) {
      if (numValue > tolerancia.limite_max) {
        return '#FFC6CE'; // Rojo
      }
    }
    
    // Verificar si está en el rango de advertencia (amarillo)
    // Si está por debajo del rango bien_min pero por encima del límite_min
    if (usarLimiteMin && tolerancia.limite_min !== null && tolerancia.limite_min !== undefined) {
      if (numValue >= tolerancia.limite_min && bienMin !== null && bienMin !== undefined && numValue < bienMin) {
        return '#FFEB9C'; // Amarillo
      }
    }
    
    // Si está por encima del rango bien_max pero por debajo del límite_max
    if (usarLimiteMax && tolerancia.limite_max !== null && tolerancia.limite_max !== undefined) {
      if (numValue <= tolerancia.limite_max && bienMax !== null && bienMax !== undefined && numValue > bienMax) {
        return '#FFEB9C'; // Amarillo
      }
    }
    
    // Si está dentro del rango bien_min y bien_max (verde)
    if (bienMin !== null && bienMin !== undefined && bienMax !== null && bienMax !== undefined) {
      if (numValue >= bienMin && numValue <= bienMax) {
        return '#C6EFCE'; // Verde
      }
    }
    
    // Si no hay límites definidos, mostrar rojo por defecto
    return '#FFC6CE';
  };
  return (
    <div className="space-y-4"> 
      {parameters.map(parameter => {
        const checked = parameterValues[parameter.id]?.checked || false;
        const unidadesList = parameter.unidad.split(',').map(u => u.trim());
        const usarLimiteMin = !!tolerancias[parameter.id]?.usar_limite_min;
        const usarLimiteMax = !!tolerancias[parameter.id]?.usar_limite_max;

        return (
          <div
            key={parameter.id}
            className="flex flex-col space-y-2 p-4 border rounded-lg md:grid md:grid-cols-[12ch_auto_1fr] md:justify-items-start md:items-center md:gap-x-4"
          >
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={checked}
                onCheckedChange={(checked) => handleParameterChange(parameter.id, "checked", checked as boolean)}
              />
              <span className="font-medium">{parameter.nombre}</span>
            </div>
            {checked ? (
              <div className="flex flex-wrap items-center space-x-2 pl-2.5">
                <Input
                  type="number"
                  placeholder="Valor"
                  className="w-[100px] text-sm"
                  style={{
                    backgroundColor: getInputColor(parameter.id, parameterValues[parameter.id]?.value),
                    borderColor: getInputColor(parameter.id, parameterValues[parameter.id]?.value) ? getInputColor(parameter.id, parameterValues[parameter.id]?.value) : undefined
                  }}
                  value={parameterValues[parameter.id]?.value ?? ''}
                  onChange={e => handleParameterChange(parameter.id, 'value', Number(e.target.value))}
                />
                {unidadesList.length > 1 ? (
                  <select
                    className="text-sm text-gray-500 border p-1"
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
                )}
              </div>
            ) : (
              <span className="text-sm text-gray-500">{parameter.unidad}</span>
            )}
            <div className="flex flex-row items-end gap-2 justify-end w-full justify-self-end md:flex-row">
              {/* Bajo bajo - solo si usar_limite_min es true */}
              {usarLimiteMin && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-yellow-700">Bajo bajo</span>
                    <button type="button" onClick={() => handleTolChange(parameter.id, 'usar_limite_min', !usarLimiteMin)}
                      className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${
                        usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'
                      }`}>
                      {usarLimiteMin && <span className="material-icons text-yellow-700 text-xs">check</span>}
                    </button>
                  </div>
                  {/* <Input
                    type="number"
                    className={`w-14 text-xs py-1 px-1 ${
                      usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                    placeholder="min"
                    value={tolerancias[parameter.id]?.limite_min ?? ''}
                    onChange={e => handleTolChange(parameter.id, 'limite_min', e.target.value)}
                    disabled={!usarLimiteMin}
                  />*/}
                  <span
                    className={`w-14 text-xs py-1 px-1 text-center rounded h-8 flex items-center justify-center ${
                      usarLimiteMin ? 'bg-yellow-100 border border-yellow-400 text-yellow-900' : 'bg-gray-100 border border-gray-300 text-gray-400'  
                    }`}
                    
                  >
                    {tolerancias[parameter.id]?.limite_min ?? '-'}
                  </span>
                </div>
              )}
              
              {/* Bajo / Alto - siempre presente */}
              <div className="flex flex-row gap-1" >
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-green-700 text-center w-full">Bajo</span>
                  <div className="flex flex-row gap-1">
                    <span className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1 h-8 flex items-center justify-center"
                      >{tolerancias[parameter.id]?.bien_min ?? '-'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-xs font-semibold text-green-700 text-center w-full">Alto</span>
                  <div className="flex flex-row gap-1">
                    <span className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1 h-8 flex items-center justify-center"
                      >{tolerancias[parameter.id]?.bien_max ?? '-'}</span>
                  </div>
                </div>
              </div>
              
              {/* Alto alto - solo si usar_limite_max es true */}
              {usarLimiteMax && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-yellow-700">Alto alto</span>
                    <button type="button" onClick={() => handleTolChange(parameter.id, 'usar_limite_max', !usarLimiteMax)}
                      className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${
                        usarLimiteMax ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'
                      }`}>
                      {usarLimiteMax && <span className="material-icons text-yellow-700 text-xs">check</span>}
                    </button>
                  </div>
                  {/* <Input
                    type="number"
                    className={`w-14 text-xs py-1 px-1 ${
                      usarLimiteMax ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                    placeholder="max"
                    value={tolerancias[parameter.id]?.limite_max ?? ''}
                    onChange={e => handleTolChange(parameter.id, 'limite_max', e.target.value)}
                    disabled={!usarLimiteMax}
                  /> */}
                  <span
                    className={`w-14 text-xs py-1 px-1 text-center rounded h-8 flex items-center justify-center ${
                      usarLimiteMax ? 'bg-yellow-100 border border-yellow-400 text-yellow-900' : 'bg-gray-100 border border-gray-300 text-gray-400'  
                    }`}
                    
                  >
                    {tolerancias[parameter.id]?.limite_max ?? '-'}
                  </span>
                </div>
              )}
              <Button size="icon" className="ml-2 h-7 w-7 p-0 flex items-center justify-center"
                onClick={() => handleTolSave(parameter.id)} disabled={tolLoading[parameter.id]} title="Guardar límites">
                <span className="material-icons text-base">save</span>
              </Button>
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