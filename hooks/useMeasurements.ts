"use client"

import { useState, useCallback } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/constants';

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
  } | null;
  systemName: string | undefined;
  parameters: {
    [systemName: string]: {
      [parameterName: string]: {
        valor: number;
        unidad: string;
      };
    };
  };
  variablesTolerancia: {
    [parameterId: string]: {
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
  onSaveSuccess?: (reportData: ReportData) => void
) {
  const [medicionesPreview, setMedicionesPreview] = useState<Measurement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
          nombre: selectedPlant.nombre 
        } : null,
        systemName: selectedPlant?.nombre, // Cambiar a nombre de la planta en lugar del sistema
        parameters: {},
        variablesTolerancia: {},
        fecha: globalFecha || "",
        comentarios: globalComentarios || "",
        generatedDate: new Date().toISOString(),
      };

      // Agregar parámetros de TODOS los sistemas de la planta
      if (allSystems && allParameters) {
        allSystems.forEach(system => {
          const systemParameters = allParameters[system.id];
          if (systemParameters && systemParameters.length > 0) {
            reportData.parameters[system.nombre] = {};
            
            // Agregar valores de parámetros para este sistema
            systemParameters.forEach(param => {
              const paramValue = parameterValues?.[param.id];
              if (paramValue?.checked && paramValue?.value !== undefined && paramValue?.value !== null) {
                // Obtener la unidad seleccionada o usar la primera unidad disponible
                const unidadSeleccionada = paramValue.unidadSeleccionada || param.unidad.split(',')[0].trim();
                
                reportData.parameters[system.nombre][param.nombre] = {
                  valor: paramValue.value,
                  unidad: unidadSeleccionada
                };
              }
            });
          }
        });
      }

      // Agregar tolerancias de TODOS los parámetros con checkbox seleccionado
      if (allParameters && parameterValues) {
        Object.values(allParameters).flat().forEach(param => {
          // ✅ FILTRO: Solo parámetros con checkbox activo
          const paramValue = parameterValues[param.id];
          if (paramValue?.checked) {
            const tolerance = tolerancias?.[param.id];
            
            if (tolerance) {
              // ✅ Guardar tolerancia existente (con o sin límites configurados)
              reportData.variablesTolerancia[param.id] = {
                limite_min: tolerance.limite_min ?? null,
                limite_max: tolerance.limite_max ?? null,
                bien_min: tolerance.bien_min ?? null,
                bien_max: tolerance.bien_max ?? null,
                usar_limite_min: !!tolerance.usar_limite_min,
                usar_limite_max: !!tolerance.usar_limite_max,
              };
              
              const hasLimits = tolerance.bien_min !== null || tolerance.bien_max !== null;
              console.log(`📊 Tolerancia incluida para ${param.nombre}: ${hasLimits ? 'CON límites' : 'SIN límites (todo válido)'}`);
            } else {
              // ✅ Crear tolerancia "sin límites" para parámetros sin configuración
              reportData.variablesTolerancia[param.id] = {
                limite_min: null,
                limite_max: null,
                bien_min: null,
                bien_max: null,
                usar_limite_min: false,
                usar_limite_max: false,
              };
              console.log(`📊 Tolerancia creada SIN límites para ${param.nombre} (todo es válido)`);
            }
          }
        });
      }

      // Guardar en localStorage (como antes)
      localStorage.setItem("reportSelection", JSON.stringify(reportData));
      
      console.log("Report data saved successfully:", reportData);
      console.log("🎯 Tolerancias guardadas (solo parámetros seleccionados):", reportData.variablesTolerancia);
      console.log("📋 IDs de tolerancias guardadas:", Object.keys(reportData.variablesTolerancia));
      
      // Contar parámetros totales de todos los sistemas
      let totalParameters = 0;
      Object.values(reportData.parameters).forEach(systemParams => {
        totalParameters += Object.keys(systemParams).length;
      });
      
      console.log(`Saved data for ${totalParameters} parameters across ${Object.keys(reportData.parameters).length} systems in plant: ${selectedPlant?.nombre}`);
      
      // Notificar éxito al componente padre
      if (onSaveSuccess) {
        onSaveSuccess(reportData);
      }
      
    } catch (error: any) {
      setSaveError(error.message);
      console.error("Error saving report data:", error);
    } finally {
      setIsSaving(false);
    }
  }, [token, selectedUser, selectedPlant, selectedSystemData, parameters, medicionesPreview, tolerancias, globalFecha, globalComentarios, allSystems, allParameters, onSaveSuccess]);

  return {
    medicionesPreview,
    isSaving,
    saveError,
    handleSaveData,
    setMedicionesPreview
  };
}
