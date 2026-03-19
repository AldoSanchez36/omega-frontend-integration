"use client"

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
}

interface ParameterValue {
  checked: boolean;
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

interface ParameterToleranceSectionProps {
  parameters: Parameter[];
  parameterValues: Record<string, ParameterValue>;
  handleParameterChange: (parameterId: string, field: "checked" | "value", value: boolean | number) => void;
  tolerancias: Record<string, Tolerance>;
  handleTolChange: (variableId: string, field: string, value: string | boolean) => void;
  handleTolSave: (variableId: string) => Promise<void>;
  tolLoading: Record<string, boolean>;
  tolError: Record<string, string | null>;
  tolSuccess: Record<string, string | null>;
}

const ParameterToleranceSection: React.FC<ParameterToleranceSectionProps> = ({
  parameters,
  parameterValues,
  handleParameterChange,
  tolerancias,
  handleTolChange,
  handleTolSave,
  tolLoading,
  tolError,
  tolSuccess,
}) => {
  return (
    <div className="space-y-4">
      {parameters.length > 1 && (
        <div className="flex items-center space-x-4 p-4 border rounded-lg bg-blue-50 border-blue-200">
          <Checkbox
            checked={parameters.length > 0 && parameters.every(param => parameterValues[param.id]?.checked)}
            onCheckedChange={(checked) => {
              if (checked) {
                parameters.forEach(param => {
                  if (!parameterValues[param.id]?.checked) {
                    handleParameterChange(param.id, "checked", true);
                  }
                });
              } else {
                parameters.forEach(param => {
                  if (parameterValues[param.id]?.checked) {
                    handleParameterChange(param.id, "checked", false);
                  }
                });
              }
            }}
          />
          <div className="flex-1">
            <div className="font-medium text-blue-800">Seleccionar todas las variables</div>
            <div className="text-sm text-blue-600">
              {parameters.filter(param => parameterValues[param.id]?.checked).length} de {parameters.length} variables seleccionadas
            </div>
          </div>
        </div>
      )}
      
      {parameters.map((parameter) => {
        const usarLimiteMin = !!tolerancias[parameter.id]?.usar_limite_min;
        const usarLimiteMax = !!tolerancias[parameter.id]?.usar_limite_max;
        return (
          <div key={parameter.id} className="flex items-center space-x-4 p-4 border rounded-lg">
            <Checkbox
              checked={parameterValues[parameter.id]?.checked || false}
              onCheckedChange={(checked) => handleParameterChange(parameter.id, "checked", checked as boolean)}
            />
            <div className="flex-1">
              <div className="font-medium">{parameter.nombre}</div>
              <div className="text-sm text-gray-500">
                Unidad: {parameter.unidad}
              </div>
            </div>
            <div className="text-sm text-gray-500 w-16">{parameter.unidad}</div>
            <div className="flex flex-row items-end gap-2 ml-2">
              {usarLimiteMin && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-yellow-700">Lim-min</span>
                    <button type="button" onClick={() => handleTolChange(parameter.id, 'usar_limite_min', !usarLimiteMin)} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMin ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMin ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                  </div>
                  <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMin ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="min"
                    value={
                      tolerancias[parameter.id]?.limite_min === undefined ||
                      tolerancias[parameter.id]?.limite_min === null ||
                      Number.isNaN(Number(tolerancias[parameter.id]?.limite_min))
                        ? ''
                        : String(tolerancias[parameter.id]?.limite_min)
                    }
                    onChange={e => handleTolChange(parameter.id, 'limite_min', e.target.value)}
                    disabled={!usarLimiteMin}
                  />
                </div>
              )}
              {usarLimiteMax && (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-xs font-semibold text-yellow-700">Lim-max</span>
                    <button type="button" onClick={() => handleTolChange(parameter.id, 'usar_limite_max', !usarLimiteMax)} className={`rounded-full border-2 ml-1 w-5 h-5 flex items-center justify-center transition-colors duration-150 ${usarLimiteMax ? 'border-yellow-500 bg-yellow-100 cursor-pointer' : 'border-gray-300 bg-gray-100 cursor-pointer'}`}>{usarLimiteMax ? <span className="material-icons text-yellow-700 text-xs">check</span> : null}</button>
                  </div>
                  <Input type="number" className={`w-14 text-xs py-1 px-1 ${usarLimiteMax ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : 'bg-gray-100 border-gray-300 text-gray-400'}`} placeholder="max"
                    value={
                      tolerancias[parameter.id]?.limite_max === undefined ||
                      tolerancias[parameter.id]?.limite_max === null ||
                      Number.isNaN(Number(tolerancias[parameter.id]?.limite_max))
                        ? ''
                        : String(tolerancias[parameter.id]?.limite_max)
                    }
                    onChange={e => handleTolChange(parameter.id, 'limite_max', e.target.value)}
                    disabled={!usarLimiteMax}
                  />
                </div>
              )}
              <div className="flex flex-col items-center col-span-2" style={{minWidth: '60px'}}>
                <span className="text-xs font-semibold text-green-700 text-center w-full">Bien</span>
                <div className="flex flex-row gap-1">
                  <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="min" value={tolerancias[parameter.id]?.bien_min ?? ''} onChange={e => handleTolChange(parameter.id, 'bien_min', e.target.value)} />
                  <Input type="number" className="w-14 bg-green-100 border-green-400 text-green-900 text-xs py-1 px-1" placeholder="max" value={tolerancias[parameter.id]?.bien_max ?? ''} onChange={e => handleTolChange(parameter.id, 'bien_max', e.target.value)} />
                </div>
              </div>
              <Button size="icon" className="ml-2 h-7 w-7 p-0 flex items-center justify-center" onClick={() => handleTolSave(parameter.id)} disabled={tolLoading[parameter.id]} title="Guardar límites">
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

export default ParameterToleranceSection;
