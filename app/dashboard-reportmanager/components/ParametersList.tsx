"use client"

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import ParametersHeader from "./ParametersComponents/ParametersHeader";
import ParametersVariableList from "./ParametersComponents/ParametersVariableList";

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
}

interface ParameterValue {
  checked: boolean;
  value?: number;
  valores?: { [sistema: string]: string };
  fecha?: string;
  comentarios?: string;
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

interface ParametersListProps {
  parameters: Parameter[];
  parameterValues: Record<string, ParameterValue>;
  handleUnitChange: (parameterId: string, unidad: string) => void;
  handleParameterChange: (parameterId: string, field: "checked" | "value", value: boolean | number) => void;
  tolerancias: Record<string, Tolerance>;
  handleTolChange: (variableId: string, field: string, value: string | boolean) => void;
  handleTolSave: (variableId: string) => Promise<void>;
  tolLoading: Record<string, boolean>;
  tolError: Record<string, string | null>;
  tolSuccess: Record<string, string | null>;
  userRole?: string;
  router: any; // NextRouter
  globalFecha: string;
  globalComentarios: string;
  handleGlobalFechaChange: (fecha: string) => void;
  handleGlobalComentariosChange: (comentarios: string) => void;
  sistemasPorParametro: Record<string, string[]>;
  handleMeasurementDataChange: (parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => void;
  medicionesPreview: any[];
}

const ParametersList: React.FC<ParametersListProps> = ({
  parameters,
  parameterValues,
  handleUnitChange,
  handleParameterChange,
  tolerancias,
  handleTolChange,
  handleTolSave,
  tolLoading,
  tolError,
  tolSuccess,
  userRole,
  router,
  globalFecha,
  globalComentarios,
  handleGlobalFechaChange,
  handleGlobalComentariosChange,
  sistemasPorParametro,
  handleMeasurementDataChange,
  medicionesPreview,
}) => {
  return (
    <Card className="mb-6">
      <ParametersHeader userRole={userRole} router={router} />
      <CardContent>
        {/* — Inputs globales fecha / comentarios — */}
        {parameters.filter(param => parameterValues[param.id]?.checked).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-6">
          <div className="flex flex-col">
            <label htmlFor="globalFecha" className="text-sm font-medium">Fecha global</label>
            <Input
              id="globalFecha"
              type="date"
              value={globalFecha}
              onChange={e => handleGlobalFechaChange(e.target.value)}
            />
          </div>
          <div className="flex-1 flex flex-col">
            <label htmlFor="globalComentarios" className="text-sm font-medium">Comentarios globales</label>
            <Input
              id="globalComentarios"
              value={globalComentarios}
              onChange={e => handleGlobalComentariosChange(e.target.value)}
            />
          </div>
        </div>
        )}
        {/* Checkbox para seleccionar todas las variables */}
        
        {parameters.length > 1 && (
          <div className="flex items-center space-x-4 p-4 border rounded-lg bg-blue-50 border-blue-200 mb-6">
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

        {/* <div className="space-y-6 mb-8">
          {parameters.filter(p => parameterValues[p.id]?.checked).map((parameter) => (
            <MedicionInputBox
              key={parameter.id}
              parameter={parameter}
              sistemas={sistemasPorParametro[parameter.id] || ["S01"]}
              fecha={globalFecha}
              comentarios={globalComentarios}
              onDataChange={handleMeasurementDataChange}
            />
          ))}
        </div> */}

        {parameters.filter(p => 
          medicionesPreview.some(m => m.variable_id === p.id)
        ).map(parameter => {
          const medicionesParam = medicionesPreview.filter(m => m.variable_id === parameter.id);
          if (medicionesParam.length === 0) return null;
          
          const groupedByFecha: Record<string, Record<string, number>> = {};
          medicionesParam.forEach(med => {
            if (!groupedByFecha[med.fecha]) {
              groupedByFecha[med.fecha] = {};
            }
            groupedByFecha[med.fecha][med.sistema] = med.valor;
          });
          
          const fechas = Object.keys(groupedByFecha);
          const sistemasUnicos = [...new Set(medicionesParam.map(m => m.sistema))];
          
          return (
            <div key={parameter.id} className="mt-6 overflow-x-auto">
              <h3 className="text-lg font-semibold mb-2">{parameter.nombre}</h3>
              <table className="min-w-full border text-xs bg-white">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-2 py-1">Fecha</th>
                    {sistemasUnicos.map(s => (
                      <th key={s} className="border px-2 py-1 text-center">{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fechas.map(fecha => (
                    <tr key={fecha}>
                      <td className="border px-2 py-1 font-semibold">{fecha}</td>
                      {sistemasUnicos.map(sistema => (
                        <td key={sistema} className="border px-2 py-1 text-center">
                          {groupedByFecha[fecha][sistema] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}

        <ParametersVariableList
          parameters={parameters}
          parameterValues={parameterValues}
          tolerancias={tolerancias}
          handleParameterChange={handleParameterChange}
          handleUnitChange={handleUnitChange}
          handleTolChange={handleTolChange}
          handleTolSave={handleTolSave}
          tolLoading={tolLoading}
          tolError={tolError}
          tolSuccess={tolSuccess}
        />
      </CardContent>
    </Card>
  );
};

export default ParametersList;
