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
  user: {
    id: string;
    username: string;
    email?: string;
    puesto?: string;
  } | null;
  plant: {
    id: string;
    nombre: string;
    mensaje_cliente?: string;
    dirigido_a?: string;
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
      // Crear el objeto de datos del reporte con la nueva estructura GLOBAL
      const reportData: ReportData = {
        user: selectedUser ? { 
          id: selectedUser.id, 
          username: selectedUser.username, 
          email: selectedUser.email, 
          puesto: selectedUser.puesto 
        } : null,
        plant: selectedPlant ? { 
          id: selectedPlant.id, 
          nombre: selectedPlant.nombre,
          mensaje_cliente: selectedPlant.mensaje_cliente,
          dirigido_a: selectedPlant.dirigido_a
        } : null,
        systemName: selectedPlant?.nombre, // Cambiar a nombre de la planta en lugar del sistema
        parameters: {},
        variablesTolerancia: {},
        fecha: globalFecha || "",
        comentarios: globalComentarios || "",
        generatedDate: new Date().toISOString(),
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

      // Agregar tolerancias SOLO de los parámetros del sistema actual
      if (parameters && tolerancias) {
        parameters.forEach(param => {
          if (tolerancias[param.id]) {
            // Usar el estado actual de los límites si está disponible, sino usar los valores de la base de datos
            const currentLimitsState = limitsState?.[param.id];
            const usarLimiteMin = currentLimitsState?.limite_min ?? !!tolerancias[param.id].usar_limite_min;
            const usarLimiteMax = currentLimitsState?.limite_max ?? !!tolerancias[param.id].usar_limite_max;
            
            reportData.variablesTolerancia[param.id] = {
              nombre: param.nombre,
              // Si el límite está desactivado, establecer como null, sino usar el valor de la base de datos
              limite_min: usarLimiteMin ? (tolerancias[param.id].limite_min ?? null) : null,
              limite_max: usarLimiteMax ? (tolerancias[param.id].limite_max ?? null) : null,
              bien_min: tolerancias[param.id].bien_min ?? null,
              bien_max: tolerancias[param.id].bien_max ?? null,
              usar_limite_min: usarLimiteMin,
              usar_limite_max: usarLimiteMax,
            };
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
  }, [token, selectedUser, selectedPlant, selectedSystemData, parameters, medicionesPreview, tolerancias, globalFecha, globalComentarios, limitsState, allSystems, allParameters, parameterValuesBySystem, onSaveSuccess]);

  return {
    medicionesPreview,
    isSaving,
    saveError,
    handleSaveData,
    setMedicionesPreview
  };
}
