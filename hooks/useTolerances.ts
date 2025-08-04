"use client"

import { useState, useEffect } from 'react';
import { getTolerancias, createTolerancia, updateTolerancia } from '@/services/httpService';
import { API_ENDPOINTS } from '@/config/constants';

interface Tolerance {
  id?: string;
  variable_id: string;
  proceso_id?: string;
  planta_id?: string;
  cliente_id?: string;
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
    if (!selectedSystem) {
        setTolError((prev) => ({ ...prev, [variableId]: "System not selected" }));
        return;
    }

    setTolLoading((prev) => ({ ...prev, [variableId]: true }));
    setTolError((prev) => ({ ...prev, [variableId]: null }));
    setTolSuccess((prev) => ({ ...prev, [variableId]: null }));

    const tolData = tolerancias[variableId];
    const tolToSave: Tolerance = {
        ...tolData,
        variable_id: variableId,
        proceso_id: selectedSystem,
        planta_id: selectedPlantId,
        cliente_id: selectedUserId,
        limite_min: tolData?.usar_limite_min ? tolData?.limite_min : null,
        limite_max: tolData?.usar_limite_max ? tolData?.limite_max : null,
    };

    try {
      let response;
      if (tolToSave.id) {
        response = await updateTolerancia(tolToSave.id, tolToSave);
      } else {
        response = await createTolerancia(tolToSave);
      }
      setTolerancias(prev => ({...prev, [variableId]: response.tolerancia || response}));
      setTolSuccess((prev) => ({ ...prev, [variableId]: '¡Guardado!' }));
    } catch (e: any) {
      setTolError((prev) => ({ ...prev, [variableId]: e.message }));
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
