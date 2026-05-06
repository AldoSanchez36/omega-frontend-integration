"use client"

import { useState, useCallback } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/constants';
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
      };
    };
  };
  variablesTolerancia: {
    [parameterId: string]: {
      nombre: string;
      limite_min: number | null;
      limite_max: number | null;
      bien_min: number | null;
      bien_max: number | null;
      usar_limite_min: boolean;
      usar_limite_max: boolean;
    };
  };
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
                
                if (calculation && calculation.applied) {
                  // Usar el valor calculado por la fórmula
                  reportData.parameters[system.nombre][param.nombre] = {
                    valor: calculation.calculatedValue,
                    unidad: unidadSeleccionada,
                    valorOriginal: calculation.originalValue,
                    formulaAplicada: calculation.formula.nombre,
                    calculado: true
                  };
                  
                } else {
                  // Usar el valor original
                  reportData.parameters[system.nombre][param.nombre] = {
                    valor: paramValue.value,
                    unidad: unidadSeleccionada,
                    valorOriginal: paramValue.value,
                    calculado: false
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
            
            console.log(`📊 Obtenidas ${allTolerances.length} tolerancias de la base de datos`);
            
            // Para cada sistema, obtener sus parámetros y sus tolerancias
            allSystems.forEach(system => {
              const systemParameters = allParameters[system.id];
              if (!systemParameters || systemParameters.length === 0) return;
              
              systemParameters.forEach(param => {
                // Buscar tolerancia para este parámetro y sistema
                const tolerance = allTolerances.find((tol: any) => 
                  tol.variable_id === param.id && tol.proceso_id === system.id
                );
                
                if (tolerance) {
                  // Usar el estado actual de los límites si está disponible (solo para el sistema actual)
                  const isCurrentSystem = selectedSystem === system.id;
                  const currentLimitsState = isCurrentSystem ? limitsState?.[param.id] : undefined;
                  const usarLimiteMin = currentLimitsState?.limite_min ?? !!tolerance.usar_limite_min;
                  const usarLimiteMax = currentLimitsState?.limite_max ?? !!tolerance.usar_limite_max;
                  
                  // Guardar tolerancia usando el nombre del parámetro como key para facilitar búsqueda
                  const toleranceData = {
                    nombre: param.nombre,
                    limite_min: usarLimiteMin ? (tolerance.limite_min ?? null) : null,
                    limite_max: usarLimiteMax ? (tolerance.limite_max ?? null) : null,
                    bien_min: tolerance.bien_min ?? null,
                    bien_max: tolerance.bien_max ?? null,
                    usar_limite_min: usarLimiteMin,
                    usar_limite_max: usarLimiteMax,
                  };
                  
                  // Guardar tanto por ID como por nombre para facilitar búsqueda en reports
                  reportData.variablesTolerancia[param.id] = toleranceData;
                  reportData.variablesTolerancia[param.nombre] = toleranceData;
                  
                  console.log(`💾 [useMeasurements] Tolerancia guardada para ${param.nombre}:`, {
                    id: param.id,
                    nombre: param.nombre,
                    toleranceData
                  });
                }
              });
            });
            
            console.log(`✅ Tolerancias guardadas para ${Object.keys(reportData.variablesTolerancia).length} parámetros`);
          }
        } catch (error) {
          console.error("Error obteniendo tolerancias de todos los sistemas:", error);
        }
      }
      
      // Fallback: Agregar tolerancias del sistema actual si no se obtuvieron de todos los sistemas
      if (parameters && tolerancias && Object.keys(reportData.variablesTolerancia).length === 0) {
        parameters.forEach(param => {
          if (tolerancias[param.id]) {
            // Usar el estado actual de los límites si está disponible, sino usar los valores de la base de datos
            const currentLimitsState = limitsState?.[param.id];
            const usarLimiteMin = currentLimitsState?.limite_min ?? !!tolerancias[param.id].usar_limite_min;
            const usarLimiteMax = currentLimitsState?.limite_max ?? !!tolerancias[param.id].usar_limite_max;
            
            const toleranceData = {
              nombre: param.nombre,
              // Si el límite está desactivado, establecer como null, sino usar el valor de la base de datos
              limite_min: usarLimiteMin ? (tolerancias[param.id].limite_min ?? null) : null,
              limite_max: usarLimiteMax ? (tolerancias[param.id].limite_max ?? null) : null,
              bien_min: tolerancias[param.id].bien_min ?? null,
              bien_max: tolerancias[param.id].bien_max ?? null,
              usar_limite_min: usarLimiteMin,
              usar_limite_max: usarLimiteMax,
            };
            
            // Guardar tanto por ID como por nombre para facilitar búsqueda
            reportData.variablesTolerancia[param.id] = toleranceData;
            reportData.variablesTolerancia[param.nombre] = toleranceData;
            
            console.log(`💾 [useMeasurements] Tolerancia guardada (fallback) para ${param.nombre}:`, {
              id: param.id,
              nombre: param.nombre,
              toleranceData
            });
          }
        });
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
