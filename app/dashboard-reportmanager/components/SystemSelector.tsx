"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface System {
  id: string;
  nombre: string;
  descripcion: string;
}

interface SystemSelectorProps {
  systems: System[];
  selectedSystem: string | undefined;
  selectedSystemData: System | undefined;
  setSelectedSystem: (systemId: string) => void;
  plantName: string;
  globalFecha: string;
  globalComentarios: string;
  handleGlobalFechaChange: (fecha: string) => void;
  ocultarFecha: boolean;
  handleGlobalComentariosChange: (comentarios: string) => void;
  hasCheckedParameters: boolean;
}

const SystemSelector: React.FC<SystemSelectorProps> = ({
  systems,
  selectedSystem,
  selectedSystemData,
  setSelectedSystem,
  plantName,
  globalFecha,
  globalComentarios,
  handleGlobalFechaChange,
  handleGlobalComentariosChange,
  hasCheckedParameters,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Sistemas de {plantName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {systems.map((system) => (
              <button
                key={system.id}
                onClick={() => setSelectedSystem(system.id)}
                className={`px-4 py-2 text-sm font-medium rounded border ${
                  selectedSystem === system.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {system.nombre}
              </button>
            ))}
          </div>
        </div>
        {selectedSystemData && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">{selectedSystemData.nombre}</h3>
            <p className="text-gray-600">{selectedSystemData.descripcion}</p>
          </div>
        )}

        {/* — Inputs globales fecha / comentarios — */}
        {hasCheckedParameters && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-blue-800">Configuración Global</h3>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col">
                <label htmlFor="globalFecha" className="text-sm font-medium text-blue-700">Fecha global</label>
                <Input
                  id="globalFecha"
                  type="date"
                  value={globalFecha}
                  onChange={e => handleGlobalFechaChange(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label htmlFor="globalComentarios" className="text-sm font-medium text-blue-700">Comentarios globales</label>
                <Input
                  id="globalComentarios"
                  value={globalComentarios}
                  onChange={e => handleGlobalComentariosChange(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-sm text-blue-600 mt-2">
              Esta configuración se aplicará a todos los sistemas de {plantName}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemSelector;
