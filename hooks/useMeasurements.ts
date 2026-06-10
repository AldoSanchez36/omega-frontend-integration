"use client"

import { useState, useCallback } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/constants';
import {
  buildToleranceDataFromRaw,
  getVariablesProcesoIdFromParam,
  indexTolerancesByVariablesProcesoId,
  type ToleranceData,
} from '@/lib/tolerance-colors';
import { useFormulas } from './useFormulas';

interface Measurement {
  fecha: string;
  comentarios: string;
  valor: number;
  variable_id: string;
  proceso_id?: string;
  sistema: string;
  usuario_id?: string;
  planta_id?: string;
  nombreParametro: string;
  parametroNombre: string;
}

interface ReportData {
  /** ID de empresa (reportmanager pasa selectedEmpresa en selectedUser / selectedUserId) */
  empresa_id?: string | null;
  user: {
    id: string;
    username: string;
    email?: string;
    puesto?: string;
    empresa_id?: string | null;
  } | null;
  plant: {
    id: string;
    nombre: string;
    mensaje_cliente?: string;
    dirigido_a?: string;
    empresa_id?: string | null;
  } | null;
  systemName: string | undefined;
  parameters: {
    [systemName: string]: {
      [parameterName: string]: {
        valor: number;
        unidad: string;
        valorOriginal?: number;
        formulaAplicada?: string;
        calculado?: boolean;
        variables_proceso_id?: string | null;
      };
    };
  };
  /** Por sistema → variables_proceso_id → tolerancia */
  variablesTolerancia: Record<string, Record<string, ToleranceData>>;
  fecha: string;
  comentarios: string;
  generatedDate: string;
  parameterComments?: {
    [parameterId: string]: string;
  };
  chartStartDate?: string; // Fecha inicio para gráficos
  chartEndDate?: string; // Fecha fin para gráficos
}

interface Parameter {
  id: string;
  nombre: string;
  unidad: string;
  variables_proceso_id?: string | null;
  variable_proceso_id?: string | null;
}

interface ParameterValue {
  checked: boolean;
  value?: number;
  valores?: { [sistema: string]: string };
  fecha?: string;
  comentarios?: string;
}

export function useMeasurements(
  token: string | null, 
  parameters: Parameter[], 
  selectedSystem?: string, 
  selectedPlantId?: string, 
  selectedUserId?: string,
  selectedUser?: any,
  selectedPlant?: any,
  selectedSystemData?: any,
  tolerancias?: Record<string, any>,
  globalFecha?: string,
  globalComentarios?: string,
  parameterValues?: Record<string, any>,
  allSystems?: any[],
  allParameters?: Record<string, Parameter[]>,
  limitsState?: Record<string, { limite_min: boolean; limite_max: boolean }>,
  parameterValuesBySystem?: Record<string, Record<string, any>>, // Nuevo parámetro
  parameterComments?: Record<string, string>, // Comentarios por parámetro
  chartStartDate?: string, // Fecha inicio para gráficos
  chartEndDate?: string, // Fecha fin para gráficos
  onSaveSuccess?: (reportData: ReportData) => void
) {
  const [medicionesPreview, setMedicionesPreview] = useState<Measurement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Hook para manejar fórmulas
  const { applyFormulasToParameters } = useFormulas(token, selectedSystem);

  const handleSaveData = useCallback(async () => {
    if (!token) {
      setSaveError("Authentication token not found.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const idFromSlot =
        selectedUserId != null && String(selectedUserId).trim() !== ""
          ? String(selectedUserId).trim()
          : null
      const idFromSelected =
        selectedUser && typeof selectedUser === "object" && "id" in selectedUser
          ? String((selectedUser as { id?: string }).id ?? "").trim() || null
          : null
      const empresaIdTrimmed = idFromSlot ?? idFromSelected

      // Crear el objeto de datos del reporte con la nueva estructura GLOBAL
      const reportData: ReportData = {
        empresa_id: empresaIdTrimmed,
        user: selectedUser
          ? {
              id: selectedUser.id,
              username: selectedUser.username ?? "",
              email: selectedUser.email ?? "",
              puesto: selectedUser.puesto ?? "",
              empresa_id: empresaIdTrimmed,
            }
          : null,
        plant: selectedPlant
          ? {
              id: selectedPlant.id,
              nombre: selectedPlant.nombre,
              mensaje_cliente: selectedPlant.mensaje_cliente,
              dirigido_a: selectedPlant.dirigido_a,
              empresa_id:
                (selectedPlant as { empresa_id?: string | null }).empresa_id ?? empresaIdTrimmed,
            }
          : null,
        systemName: selectedPlant?.nombre, // Cambiar a nombre de la planta en lugar del sistema
        parameters: {},
        variablesTolerancia: {},
        fecha: globalFecha || "",
        comentarios: globalComentarios || "",
        generatedDate: new Date().toISOString(),
        parameterComments: parameterComments || {},
        chartStartDate: chartStartDate || "", // Incluir fecha inicio de gráficos
        chartEndDate: chartEndDate || "", // Incluir fecha fin de gráficos
      };

      // Agregar parámetros de TODOS los sistemas de la planta
      if (allSystems && allParameters && parameterValuesBySystem) {
        // console.log(`💾 Guardando datos de TODOS los sistemas de la planta`);
        // console.log(`📊 Sistemas disponibles:`, allSystems.map(s => s.nombre));
        // console.log(`📝 Valores por sistema:`, parameterValuesBySystem);
        
        allSystems.forEach(system => {
          const systemParameters = allParameters[system.id];
          const systemValues = parameterValuesBySystem[system.id];
          
          if (systemParameters && systemParameters.length > 0 && systemValues) {
            reportData.parameters[system.nombre] = {};
            
            // console.log(`🔍 Procesando sistema: ${system.nombre}`);
            // console.log(`📋 Parámetros del sistema:`, systemParameters);
            // console.log(`📝 Valores del sistema:`, systemValues);
            
            // Preparar parámetros para aplicar fórmulas
            const parametersForFormulas = systemParameters
              .filter(param => {
                const paramValue = systemValues[param.id];
                return paramValue?.checked && paramValue?.value !== undefined && paramValue?.value !== null;
              })
              .map(param => ({
                id: param.id,
                nombre: param.nombre,
                value: systemValues[param.id].value
              }));

            // Aplicar fórmulas a los parámetros
            const formulaCalculations = applyFormulasToParameters(parametersForFormulas, system.nombre);
            
            // Agregar valores de parámetros para este sistema (con fórmulas aplicadas)
            systemParameters.forEach(param => {
              const paramValue = systemValues[param.id];
              if (paramValue?.checked && paramValue?.value !== undefined && paramValue?.value !== null) {
                // Obtener la unidad seleccionada o usar la primera unidad disponible
                const unidadSeleccionada = paramValue.unidadSeleccionada || param.unidad.split(',')[0].trim();
                
                // Buscar si hay una fórmula aplicada para este parámetro
                const calculation = formulaCalculations.find(calc => calc.parameterId === param.id);
                
                const vpId = getVariablesProcesoIdFromParam(param);
                const paramBase = {
                  unidad: unidadSeleccionada,
                  ...(vpId ? { variables_proceso_id: vpId } : {}),
                };

                if (calculation && calculation.applied) {
                  reportData.parameters[system.nombre][param.nombre] = {
                    valor: calculation.calculatedValue,
                    ...paramBase,
                    valorOriginal: calculation.originalValue,
                    formulaAplicada: calculation.formula.nombre,
                    calculado: true,
                  };
                } else {
                  reportData.parameters[system.nombre][param.nombre] = {
                    valor: paramValue.value,
                    ...paramBase,
                    valorOriginal: paramValue.value,
                    calculado: false,
                  };
                }
              }
            });
          }
        });
      }

      // Agregar tolerancias de TODOS los sistemas si hay datos de múltiples sistemas
      if (allSystems && allParameters && token && selectedPlantId) {
        // Obtener todas las tolerancias de la planta
        try {
          const tolerancesRes = await fetch(`${API_BASE_URL}${API_ENDPOINTS.TOLERANCES}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (tolerancesRes.ok) {
            const tolerancesData = await tolerancesRes.json();
            const allTolerances = Array.isArray(tolerancesData) 
              ? tolerancesData 
              : (tolerancesData.tolerancias || tolerancesData.tolerancia || []);
            
            const tolerancesByVpId = indexTolerancesByVariablesProcesoId(allTolerances);

            allSystems.forEach((system) => {
              const systemParameters = allParameters[system.id];
              if (!systemParameters?.length) return;

              if (!reportData.variablesTolerancia[system.nombre]) {
                reportData.variablesTolerancia[system.nombre] = {};
              }

              systemParameters.forEach((param) => {
                const vpId = getVariablesProcesoIdFromParam(param);
                if (!vpId) return;

                const tolerance = tolerancesByVpId.get(vpId);
                if (!tolerance) return;

                const isCurrentSystem = selectedSystem === system.id;
                const currentLimitsState = isCurrentSystem ? limitsState?.[param.id] : undefined;

                const toleranceData = buildToleranceDataFromRaw(tolerance, param.nombre, {
                  variables_proceso_id: vpId,
                  limitsState: currentLimitsState,
                });

                reportData.variablesTolerancia[system.nombre][vpId] = toleranceData;
              });
            });
          }
        } catch (error) {
          console.error("Error obteniendo tolerancias de todos los sistemas:", error);
        }
      }
      
      const hasNestedTolerances = Object.values(reportData.variablesTolerancia).some(
        (bucket) => bucket && Object.keys(bucket).length > 0
      );

      if (!hasNestedTolerances && parameters && tolerancias && selectedSystem) {
        const systemName =
          allSystems?.find((s) => s.id === selectedSystem)?.nombre ?? selectedSystemData?.nombre;
        if (systemName) {
          if (!reportData.variablesTolerancia[systemName]) {
            reportData.variablesTolerancia[systemName] = {};
          }
          parameters.forEach((param) => {
            const raw = tolerancias[param.id];
            if (!raw) return;
            const vpId = getVariablesProcesoIdFromParam(param);
            if (!vpId) return;

            const toleranceData = buildToleranceDataFromRaw(raw, param.nombre, {
              variables_proceso_id: vpId,
              limitsState: limitsState?.[param.id],
            });
            reportData.variablesTolerancia[systemName][vpId] = toleranceData;
          });
        }
      }

      // Guardar en localStorage (como antes)
      localStorage.setItem("reportSelection", JSON.stringify(reportData));
      
      // Contar parámetros totales de todos los sistemas
      let totalParameters = 0;
      Object.values(reportData.parameters).forEach(systemParams => {
        totalParameters += Object.keys(systemParams).length;
      });
      
      //console.log(`Saved data for ${totalParameters} parameters across ${Object.keys(reportData.parameters).length} systems in plant: ${selectedPlant?.nombre}`);
      
      // Notificar éxito al componente padre
      if (onSaveSuccess) {
        onSaveSuccess(reportData);
      }
      
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [token, selectedUserId, selectedUser, selectedPlant, selectedSystemData, parameters, medicionesPreview, tolerancias, globalFecha, globalComentarios, limitsState, allSystems, allParameters, parameterValuesBySystem, chartStartDate, chartEndDate, onSaveSuccess]);

  return {
    medicionesPreview,
    isSaving,
    saveError,
    handleSaveData,
    setMedicionesPreview
  };
}
