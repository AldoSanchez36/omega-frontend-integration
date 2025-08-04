"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

const SystemSelector: React.FC<SystemSelectorProps> = ({
  systems,
  selectedSystem,
  selectedSystemData,
  setSelectedSystem,
  plantName,
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
      </CardContent>
    </Card>
  );
};

export default SystemSelector;
