"use client"

import { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";

interface MedicionInputBoxProps {
  parameter: any;
  userId?: string;
  plantId?: string;
  procesoId?: string;
  sistemas: string[];
  fecha: string;
  comentarios: string;
  onDataChange?: (parameterId: string, data: { fecha: string; comentarios: string; valores: { [sistema: string]: string } }) => void;
}

const MedicionInputBox: React.FC<MedicionInputBoxProps> = ({
  parameter,
  sistemas,
  fecha,
  comentarios,
  onDataChange,
}) => {
  const [tab, setTab] = useState<string>(sistemas[0] || "S01");
  const [valores, setValores] = useState<{ [sistema: string]: string }>({});
  const [localSistemas, setLocalSistemas] = useState<string[]>(sistemas);
  const prevDataRef = useRef<{ fecha: string; comentarios: string; valores: { [sistema: string]: string } }>({ fecha: "", comentarios: "", valores: {} });

  const debouncedValores = useDebounce(valores, 500);

  useEffect(() => {
    setLocalSistemas(sistemas);
    if (!sistemas.includes(tab)) setTab(sistemas[0] || "S01");
  }, [sistemas, tab]);

  const handleValorChange = (s: string, v: string) => {
    setValores(prev => ({ ...prev, [s]: v }));
  };

  const handleAgregarSistema = () => {
    const maxNum = localSistemas.reduce((max, s) => {
      const match = s.match(/^S(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    const nuevo = `S${String(maxNum + 1).padStart(2, "0")}`;
    if (!localSistemas.includes(nuevo)) {
      setLocalSistemas([...localSistemas, nuevo]);
      setTab(nuevo);
    }
  };

  const handleRemoveSistema = () => {
    const nuevos = localSistemas.filter(s => s !== tab);
    setLocalSistemas(nuevos);
    if (!nuevos.includes(tab)) {
      setTab(nuevos[0] || "S01");
    }
    setValores(prev => {
      const copy = { ...prev };
      delete copy[tab];
      return copy;
    });
  };

  useEffect(() => {
    if (onDataChange && parameter?.id) {
      const currentData = { fecha, comentarios, valores: debouncedValores };
      const prevData = prevDataRef.current;

      const hasChanged = 
        prevData.fecha !== fecha ||
        prevData.comentarios !== comentarios ||
        JSON.stringify(prevData.valores) !== JSON.stringify(debouncedValores);

      if (hasChanged) {
        prevDataRef.current = currentData;
        onDataChange(parameter.id, currentData);
      }
    }
  }, [debouncedValores, parameter?.id, fecha, comentarios, onDataChange]);

  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="flex items-center mb-2">
        <span className="text-gray-400 font-semibold text-base w-48">{parameter.nombre}</span>
        <span className="ml-2 text-sm text-gray-600">Fecha: {fecha || "Sin fecha"}</span>
        <span className="ml-4 text-sm text-gray-600">Comentarios: {comentarios || "Sin comentarios"}</span>
      </div>
      <div className="mt-2">
        <div className="flex flex-row gap-1 border-b mb-2 items-center">
          {localSistemas.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setTab(s)}
              className={
                (tab === s
                  ? "border-b-2 border-blue-600 bg-white text-blue-700 font-semibold "
                  : "bg-gray-100 text-gray-500 hover:text-blue-600 ") +
                " px-4 py-1 rounded-t transition-colors duration-150 focus:outline-none"
              }
              style={{ minWidth: 48 }}
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={handleAgregarSistema}
            className="ml-2 px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold hover:bg-blue-200 border border-blue-200"
            title="Agregar sistema"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleRemoveSistema}
            disabled={localSistemas.length <= 1}
            className="ml-1 px-2 py-1 rounded bg-red-100 text-red-700 font-bold hover:bg-red-200 border border-red-200 disabled:opacity-50"
            title="Eliminar sistema actual"
          >
            −
          </button>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 w-20">Valor {tab}:</span>
            <Input
              type="number"
              className="w-32"
              placeholder="0"
              value={valores[tab] || ""}
              onChange={e => handleValorChange(tab, e.target.value)}
            />
            <span className="text-xs text-gray-400">{parameter.unidad}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-4">
        <span className="text-xs text-gray-500">Los datos se guardarán cuando uses "Guardar Datos"</span>
        {!fecha && (
          <span className="text-xs text-red-500">⚠️ Fecha requerida</span>
        )}
      </div>
    </div>
  );
};

export default MedicionInputBox;
