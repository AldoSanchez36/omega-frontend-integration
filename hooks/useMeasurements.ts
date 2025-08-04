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

interface Parameter {
  id: string;
  nombre: string;
}

interface ParameterValue {
  checked: boolean;
  value?: number;
  valores?: { [sistema: string]: string };
  fecha?: string;
  comentarios?: string;
}

export function useMeasurements(token: string | null, parameters: Parameter[], selectedSystem?: string, selectedPlantId?: string, selectedUserId?: string) {
  const [medicionesPreview, setMedicionesPreview] = useState<Measurement[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveData = useCallback(async (parameterValues: Record<string, ParameterValue>) => {
    if (!token) {
      setSaveError("Authentication token not found.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const allMediciones: Measurement[] = [];
      
      Object.entries(parameterValues).forEach(([parameterId, data]) => {
        if (!data.checked) return;
        const parameter = parameters.find(p => p.id === parameterId);
        if (!parameter) return;

        Object.entries(data.valores || {}).forEach(([sistema, valor]) => {
          if (valor && valor !== "" && data.fecha) {
            allMediciones.push({
              fecha: data.fecha,
              comentarios: data.comentarios || "",
              valor: parseFloat(valor),
              variable_id: parameterId,
              proceso_id: selectedSystem,
              sistema: sistema,
              usuario_id: selectedUserId,
              planta_id: selectedPlantId,
              nombreParametro: parameter.nombre,
              parametroNombre: parameter.nombre
            });
          }
        });
      });

      if (allMediciones.length === 0) {
        console.warn("No measurement data to save.");
        return;
      }

      for (const medicion of allMediciones) {
        const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEASUREMENTS}`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(medicion),
        });
        
        if (!response.ok) {
          throw new Error(`Error saving measurement: ${response.status} ${response.statusText}`);
        }
      }

      setMedicionesPreview(prev => [...prev, ...allMediciones]);
    } catch (error: any) {
      setSaveError(error.message);
    } finally {
      setIsSaving(false);
    }
  }, [token, parameters, selectedSystem, selectedPlantId, selectedUserId]);

  return {
    medicionesPreview,
    isSaving,
    saveError,
    handleSaveData,
    setMedicionesPreview
  };
}
