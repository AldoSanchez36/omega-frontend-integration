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
                  <Input
                    type="number"
                    className={`w-14 text-xs py-1 px-1 ${
                      usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                    placeholder="min"
                    value={tolerancias[parameter.id]?.limite_min ?? ''}
                    onChange={e => handleTolChange(parameter.id, 'limite_min', e.target.value)}
                    disabled={!usarLimiteMin}
                  />
                </div>
              )}
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
                  <Input
                    type="number"
                    className={`w-14 text-xs py-1 px-1 ${
                      usarLimiteMax ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                    placeholder="max"
                    value={tolerancias[parameter.id]?.limite_max ?? ''}
                    onChange={e => handleTolChange(parameter.id, 'limite_max', e.target.value)}
                    disabled={!usarLimiteMax}
                  />
                </div>
              )}
              <div className="flex flex-col items-center" style={{ minWidth: '60px' }}>
                <span className="text-xs font-semibold text-green-700 text-center w-full">Bajo / Alto</span>
                <div className="flex flex-row gap-1">
                  <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                    placeholder="min" value={tolerancias[parameter.id]?.bien_min ?? ''} onChange={e => handleTolChange(parameter.id, 'bien_min', e.target.value)} />
                  <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1"
                    placeholder="max" value={tolerancias[parameter.id]?.bien_max ?? ''} onChange={e => handleTolChange(parameter.id, 'bien_max', e.target.value)} />
                </div>
              </div>
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