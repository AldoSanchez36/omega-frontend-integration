"use client"

import React, { useState, useEffect } from 'react';
import ReactSelect from 'react-select';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface Empresa {
  id: string;
  nombre: string;
  descripcion?: string;
}

interface Plant {
  id: string;
  nombre: string;
}

interface System {
  id: string;
  nombre: string;
  descripcion: string;
}

interface TabbedSelectorHistoricosProps {
  displayedEmpresas: Empresa[];
  displayedPlants: Plant[];
  systems: System[];
  selectedEmpresa: Empresa | null;
  selectedPlant: Plant | null;
  selectedSystem: string | undefined;
  selectedSystemData: System | undefined;
  handleSelectEmpresa: (empresaId: string | '') => void;
  handleSelectPlant: (plantId: string | '') => void;
  setSelectedSystem: (systemId: string) => void;
  plantName: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (fecha: string) => void;
  onEndDateChange: (fecha: string) => void;
}

const TabbedSelectorHistoricos: React.FC<TabbedSelectorHistoricosProps> = ({
  displayedEmpresas,
  displayedPlants,
  systems,
  selectedEmpresa,
  selectedPlant,
  selectedSystem,
  selectedSystemData,
  handleSelectEmpresa,
  handleSelectPlant,
  setSelectedSystem,
  plantName,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}) => {
  const [activeTab, setActiveTab] = useState<string>("cliente");

  // Inicializar pestaña activa basada en selecciones existentes
  useEffect(() => {
    if (selectedPlant) {
      setActiveTab("procesos");
    } else if (selectedEmpresa) {
      setActiveTab("planta");
    } else {
      setActiveTab("cliente");
    }
  }, []); // Solo al montar

  // Manejar selección de empresa
  const handleEmpresaSelect = (option: { value: string; label: string } | null) => {
    handleSelectEmpresa(option ? option.value : '');
    if (option) {
      // Si se selecciona una empresa, avanzar a la pestaña de planta
      setTimeout(() => setActiveTab("planta"), 150);
    } else {
      // Si se deselecciona, volver a cliente
      setActiveTab("cliente");
    }
  };

  // Manejar selección de planta
  const handlePlantSelect = (option: { value: string; label: string } | null) => {
    handleSelectPlant(option ? option.value : '');
    if (option) {
      // Si se selecciona una planta, avanzar a la pestaña de procesos
      setTimeout(() => setActiveTab("procesos"), 150);
    } else {
      // Si se deselecciona, volver a planta
      setActiveTab("planta");
    }
  };

  return (
    <Card className="mb-6 border-0 shadow-lg">
      <CardContent className="p-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Pestañas estilo navegador */}
          <div className="border-b border-gray-300 bg-gray-100 px-4 pt-2">
            <TabsList className="inline-flex h-auto p-0 bg-transparent gap-0.5">
              <TabsTrigger 
                value="cliente" 
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Cliente
              </TabsTrigger>
              <TabsTrigger 
                value="planta" 
                disabled={!selectedEmpresa}
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Planta
              </TabsTrigger>
              <TabsTrigger 
                value="procesos" 
                disabled={!selectedPlant}
                className={`
                  relative px-5 py-2.5 text-sm font-medium rounded-t-md
                  transition-all duration-150 ease-in-out
                  border border-b-0 border-transparent
                  data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:border-gray-300 data-[state=active]:border-b-white
                  data-[state=active]:shadow-[0_-2px_4px_rgba(0,0,0,0.05)]
                  data-[state=inactive]:bg-transparent data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-200 data-[state=inactive]:hover:text-gray-900
                  disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent
                  -mb-px z-10
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                `}
              >
                Procesos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Pestaña 1: Selección de Cliente (Empresa) */}
          <TabsContent value="cliente" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Seleccionar Empresa
                </label>
                <ReactSelect
                  options={displayedEmpresas.map((empresa) => ({ 
                    value: empresa.id, 
                    label: empresa.nombre 
                  }))}
                  value={
                    selectedEmpresa
                      ? { value: selectedEmpresa.id, label: selectedEmpresa.nombre }
                      : null
                  }
                  onChange={handleEmpresaSelect}
                  placeholder="Selecciona una empresa..."
                  isClearable
                  className="w-full"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '42px',
                    }),
                  }}
                />
              </div>
              {selectedEmpresa && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Empresa seleccionada:</strong> {selectedEmpresa.nombre}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Continúa a la pestaña "Planta" para seleccionar una planta.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Pestaña 2: Selección de Planta */}
          <TabsContent value="planta" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              {!selectedEmpresa ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Por favor, selecciona una empresa primero en la pestaña "Cliente".
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700">
                      Seleccionar Planta
                    </label>
                    {displayedPlants.length === 0 ? (
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                          ⚠️ No se encontraron plantas asociadas a la empresa seleccionada. 
                          {selectedEmpresa && ` (${selectedEmpresa.nombre})`}
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          Verifica que las plantas tengan un <code>empresa_id</code> asignado en la base de datos.
                        </p>
                      </div>
                    ) : (
                      <ReactSelect
                        options={displayedPlants.map((plant) => ({ 
                          value: plant.id, 
                          label: plant.nombre 
                        }))}
                        value={
                          selectedPlant
                            ? { value: selectedPlant.id, label: selectedPlant.nombre }
                            : null
                        }
                        onChange={handlePlantSelect}
                        placeholder="Selecciona una planta..."
                        isClearable
                        className="w-full"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '42px',
                          }),
                        }}
                      />
                    )}
                  </div>
                  {selectedPlant && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        <strong>Planta seleccionada:</strong> {selectedPlant.nombre}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Continúa a la pestaña "Procesos" para seleccionar un proceso.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          {/* Pestaña 3: Selección de Procesos/Sistemas */}
          <TabsContent value="procesos" className="mt-0 p-6 bg-white border-t border-gray-200">
            <div className="space-y-4">
              {!selectedPlant ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Por favor, selecciona una planta primero en la pestaña "Planta".
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">
                      Sistemas de {plantName}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {systems.map((system) => (
                        <button
                          key={system.id}
                          onClick={() => setSelectedSystem(system.id)}
                          className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${
                            selectedSystem === system.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
                          }`}
                        >
                          {system.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSystemData && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h3 className="text-lg font-semibold mb-2 text-gray-800">
                        {selectedSystemData.nombre}
                      </h3>
                      <p className="text-gray-600 text-sm">{selectedSystemData.descripcion}</p>
                    </div>
                  )}

                  {/* Selector de rango de fechas */}
                  {selectedSystem && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h3 className="text-lg font-semibold mb-4 text-blue-800">
                        Rango de Fechas
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="startDate" className="block text-sm font-medium text-blue-700 mb-1">
                            Fecha Inicio
                          </label>
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={e => onStartDateChange(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label htmlFor="endDate" className="block text-sm font-medium text-blue-700 mb-1">
                            Fecha Fin
                          </label>
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={e => onEndDateChange(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <p className="text-sm text-blue-600 mt-2">
                        Selecciona el rango de fechas para consultar los datos históricos
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TabbedSelectorHistoricos;

