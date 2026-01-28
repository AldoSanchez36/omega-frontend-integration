"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SensorTimeSeriesChart } from "@/components/SensorTimeSeriesChart";
import { API_BASE_URL } from "@/config/constants";

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
}

interface ChartsProps {
  selectedParameters: Parameter[];
  startDate: string;
  endDate: string;
  clientName?: string;
  processName?: string;
  userId?: string;
}

const Charts: React.FC<ChartsProps> = ({ selectedParameters, startDate, endDate, clientName, processName, userId }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Gráficos de Series Temporales</CardTitle>
        <p className="text-sm text-gray-600">
          Visualización de datos históricos para las variables seleccionadas
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Período: {new Date(startDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} - {new Date(endDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} (Últimos 12 meses)
        </p>
      </CardHeader>
      <CardContent>
        {selectedParameters.length > 0 ? (
          <div className="space-y-8">
            {selectedParameters.map(param => (
              <div key={param.id} className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">{param.nombre} ({param.unidad})</h3>
                
                <div>
                  <h4 className="text-md font-medium mb-2">Gráfico de Series Temporales</h4>
                  <div className="max-w-4xl [&_svg]:max-h-96">
                    <SensorTimeSeriesChart
                      variable={param.nombre}
                      startDate={startDate}
                      endDate={endDate}
                      apiBase={API_BASE_URL}
                      unidades={param.unidad}
                      clientName={clientName}
                      processName={processName}
                      userId={userId}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay variables seleccionadas</h3>
            <p className="text-gray-500">
              Selecciona variables del sistema usando los checkboxes arriba para ver sus gráficos y datos históricos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Charts; 