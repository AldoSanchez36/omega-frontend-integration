"use client"

import { useState, useEffect } from 'react';
import { getTolerancias, createTolerancia, updateTolerancia } from '@/services/httpService';
import { API_ENDPOINTS } from '@/config/constants';

interface Tolerance {
  id?: string;
  variable_id: string;
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

interface Parameter {
  id: string;
  nombre: string;
}

export function useTolerances(parameters: Parameter[], selectedSystem?: string, selectedPlantId?: string, selectedUserId?: string) {
  const [tolerancias, setTolerancias] = useState<Record<string, Tolerance>>({});
  const [tolLoading, setTolLoading] = useState<Record<string, boolean>>({});
  const [tolError, setTolError] = useState<Record<string, string | null>>({});
  const [tolSuccess, setTolSuccess] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!selectedSystem || parameters.length === 0) return;

    setTolLoading({});
    setTolError({});
    setTolSuccess({});

    getTolerancias()
      .then((data: any) => {
        const map: Record<string, Tolerance> = {};
        const toleranceData = Array.isArray(data) ? data : data.tolerancias || [];
        
        toleranceData.forEach((tol: Tolerance) => {
          if (parameters.some(p => p.id === tol.variable_id) && tol.proceso_id === selectedSystem) {
            map[tol.variable_id] = tol;
          }
        });
        setTolerancias(map);
      })
      .catch((e) => {
        setTolError((prev) => ({ ...prev, global: e.message }));
      });
  }, [selectedSystem, parameters]);

  const handleTolChange = (variableId: string, field: string, value: string | boolean) => {
    setTolerancias((prev) => ({
      ...prev,
      [variableId]: {
        ...prev[variableId],
        [field]: typeof value === 'boolean' ? value : (value === '' ? null : Number(value)),
        variable_id: variableId,
        proceso_id: selectedSystem,
        planta_id: selectedPlantId,
        cliente_id: selectedUserId,
      },
    }));
  };

  const handleTolSave = async (variableId: string) => {
    setTolLoading((prev) => ({ ...prev, [variableId]: true }));
    setTolError((prev) => ({ ...prev, [variableId]: null }));
    setTolSuccess((prev) => ({ ...prev, [variableId]: null }));

    const tolData = tolerancias[variableId];
    
    // Preparar datos para enviar - sin validaciones, cualquier límite puede ser null
    // Función helper para convertir valores a número o null
    const toNumberOrNull = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };
    
    const tolToSave: Tolerance = {
        ...tolData,
        variable_id: variableId,
        proceso_id: selectedSystem || null,
        planta_id: selectedPlantId || null,
        cliente_id: selectedUserId || null,
        // Convertir a número solo si hay valor, sino null - todos los límites pueden ser null
        bien_min: toNumberOrNull(tolData?.bien_min),
        bien_max: toNumberOrNull(tolData?.bien_max),
        limite_min: toNumberOrNull(tolData?.limite_min),
        limite_max: toNumberOrNull(tolData?.limite_max),
        usar_limite_min: tolData?.usar_limite_min || false,
        usar_limite_max: tolData?.usar_limite_max || false,
    };

    try {
      let response: any;
      if (tolToSave.id) {
        response = await updateTolerancia(tolToSave.id, tolToSave);
      } else {
        response = await createTolerancia(tolToSave);
      }
      setTolerancias(prev => ({...prev, [variableId]: response?.tolerancia || response || tolToSave}));
      setTolSuccess((prev) => ({ ...prev, [variableId]: '¡Guardado!' }));
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message || "Error al guardar tolerancia" }));
    } finally {
      setTolLoading((prev) => ({ ...prev, [variableId]: false }));
    }
  };

  return {
    tolerancias,
    tolLoading,
    tolError,
    tolSuccess,
    handleTolChange,
    handleTolSave,
  };
}
