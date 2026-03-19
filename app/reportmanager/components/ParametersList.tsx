"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants";
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
  variable_id?: string;
  proceso_id?: string | null;
  planta_id?: string | null;
  cliente_id?: string | null;
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
  sistemasPorParametro: Record<string, string[]>;
  handleMeasurementDataChange: (parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => void;
  medicionesPreview: any[];
  selectedEmpresa?: { id: string } | null;
  selectedPlant?: { id: string } | null;
  selectedSystem?: string;
  onLimitsStateChange?: (limitsState: Record<string, { limite_min: boolean; limite_max: boolean }>) => void;
}

const ParametersList: React.FC<ParametersListProps> = ({
  parameters,
  parameterValues,
  handleUnitChange,
  handleParameterChange,
  tolerancias,
  handleTolChange,
  // handleTolSave,
  tolLoading,
  tolError,
  tolSuccess,
  userRole,
  router,
  sistemasPorParametro,
  handleMeasurementDataChange,
  medicionesPreview,
  selectedEmpresa,
  selectedPlant,
  selectedSystem,
  onLimitsStateChange,
}) => {
  // Estado para tolerancias filtradas
  const [filteredTolerances, setFilteredTolerances] = useState<Record<string, Tolerance>>({});
  const [loadingTolerances, setLoadingTolerances] = useState(false);
  const [errorTolerances, setErrorTolerances] = useState<string | null>(null);

  // useEffect para cargar tolerancias filtradas
  useEffect(() => {
    const loadFilteredTolerances = async () => {
      if (!selectedEmpresa || !selectedPlant || !selectedSystem || parameters.length === 0) {
        return;
      }

      setLoadingTolerances(true);
      setErrorTolerances(null);

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("Organomex_token") : null;
        
        if (!token) {
          throw new Error("No se encontró el token de autenticación");
        }

        // Crear todas las peticiones para cada parámetro usando el endpoint de filtros
        const tolerancePromises = parameters.map(async (parameter) => {
          const queryParams = new URLSearchParams({
            variable_id: parameter.id,
            planta_id: selectedPlant.id,
            proceso_id: selectedSystem,
            empresa_id: selectedEmpresa.id,
          });

          const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES_FILTERS}?${queryParams}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          // Si no hay tolerancias (404 o 204), simplemente no asignamos nada para ese parámetro
          if (!response.ok) {
            if (response.status === 404 || response.status === 204) {
              return { parameterId: parameter.id, tolerance: null as Tolerance | null };
            }
            throw new Error(`Error al cargar tolerancias para parámetro ${parameter.id}: ${response.statusText}`);
          }

          const data = await response.json();

          // El endpoint de filtros suele devolver { tolerancias: [...] }
          const toleranceFromArray = Array.isArray((data as any).tolerancias)
            ? (data as any).tolerancias[0] || null
            : null;

          const tolerance =
            toleranceFromArray ||
            // Fallback por si el backend devuelve { tolerancia: {...} } o el objeto directo
            (data as any).tolerancia ||
            (Array.isArray(data) ? data[0] : data) ||
            null;

          return { parameterId: parameter.id, tolerance: tolerance as Tolerance | null };
        });

        // Esperar todas las peticiones
        const results = await Promise.all(tolerancePromises);
        
        // Combinar las respuestas en un objeto
        const tolerancesMap: Record<string, Tolerance> = {};
        results.forEach(({ parameterId, tolerance }) => {
          if (tolerance) {
            tolerancesMap[parameterId] = tolerance;
          }
        });

        setFilteredTolerances(tolerancesMap);
      } catch (error: any) {
        console.error('Error al cargar tolerancias filtradas:', error);
        setErrorTolerances(error.message);
      } finally {
        setLoadingTolerances(false);
      }
    };

    loadFilteredTolerances();
  }, [selectedEmpresa, selectedPlant, selectedSystem, parameters]);

  // Usar tolerancias filtradas si están disponibles, sino usar las originales
  const tolerancesToUse = Object.keys(filteredTolerances).length > 0 ? filteredTolerances : tolerancias;
  const handleTolSave = async (_variableId: string) => {
    // Guardar tolerancia si se implementa en el futuro
  };

  return (
    <Card className="mb-6">
      <ParametersHeader userRole={userRole} router={router} />
      <CardContent className="py-2 px-2">
        {/* — Inputs globales fecha / comentarios — */}
        {/* Comentado: Movido a SystemSelector.tsx para ser verdaderamente global */}
        {/* {parameters.filter(param => parameterValues[param.id]?.checked).length > 0 && (
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
        )} */}
        {/* Checkbox para seleccionar todas las variables */}
        
        {parameters.length > 1 && (
          <div className="flex items-center space-x-4 p-2 border rounded-lg bg-blue-50 border-blue-200 mb-3">
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

        <ParametersVariableList
          parameters={parameters}
          parameterValues={parameterValues}
          tolerancias={tolerancesToUse}
          handleParameterChange={handleParameterChange}
          handleUnitChange={handleUnitChange}
          handleTolChange={handleTolChange}
          handleTolSave={handleTolSave}
          tolLoading={tolLoading}
          tolError={tolError}
          tolSuccess={tolSuccess}
          selectedSystem={selectedSystem}
          selectedPlant={selectedPlant}
          onLimitsStateChange={onLimitsStateChange}
        />
      </CardContent>
    </Card>
  );
};

export default ParametersList;
