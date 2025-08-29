"use client"

import React from 'react';
import MedicionInputBox from "./MedicionInputBox";

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
}

interface ParameterValue {
  checked: boolean;
  valores?: { [sistema: string]: string };
  fecha?: string;
  comentarios?: string;
}

interface MeasurementInputSectionProps {
  parameters: Parameter[];
  parameterValues: Record<string, ParameterValue>;
  globalFecha: string;
  globalComentarios: string;
  sistemasPorParametro: Record<string, string[]>;
  handleMeasurementDataChange: (parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => void;
  medicionesPreview: any[];
  selectedUser?: any; // Consider defining a proper User interface
  selectedPlant?: any; // Consider defining a proper Plant interface
  selectedSystem?: string;
}

const MeasurementInputSection: React.FC<MeasurementInputSectionProps> = ({
  parameters,
  parameterValues,
  globalFecha,
  globalComentarios,
  sistemasPorParametro,
  handleMeasurementDataChange,
  medicionesPreview,
  selectedUser,
  selectedPlant,
  selectedSystem,
}) => {
  return (
    <>
      {/* Formulario de ingreso de mediciones por parámetro seleccionado */}
      <div className="space-y-6 mb-8">
        {parameters.filter(p => parameterValues[p.id]?.checked).map((parameter) => (
          <MedicionInputBox
            key={parameter.id}
            parameter={parameter}
            userId={selectedUser?.id}
            plantId={selectedPlant?.id}
            procesoId={selectedSystem}
            sistemas={sistemasPorParametro[parameter.id] || ["S01"]}
            fecha={globalFecha}
            comentarios={globalComentarios}
            onDataChange={handleMeasurementDataChange}
          />
        ))}
      </div>
      {/* Fin formulario mediciones */}

      {/* Previsualización por parámetro */}
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
    </>
  );
};

export default MeasurementInputSection;
