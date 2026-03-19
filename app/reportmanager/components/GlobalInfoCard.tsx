"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface GlobalInfoCardProps {
  globalFecha: string;
  setGlobalFecha: (fecha: string) => void;
  globalComentarios: string;
  setGlobalComentarios: (comentarios: string) => void;
  parameterValues: any; // Consider defining a proper ParameterValue interface
}

const GlobalInfoCard: React.FC<GlobalInfoCardProps> = ({
  globalFecha,
  setGlobalFecha,
  globalComentarios,
  setGlobalComentarios,
  parameterValues,
}) => {
  return (
    <>
      {Object.values(parameterValues).some((p:any) => p.checked) && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Fecha</label>
                <Input
                  type="date"
                  className="w-full"
                  value={globalFecha}
                  onChange={(e) => setGlobalFecha(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Comentarios</label>
                <Input
                  type="text"
                  className="w-full"
                  placeholder="Comentarios generales"
                  value={globalComentarios}
                  onChange={(e) => setGlobalComentarios(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default GlobalInfoCard;
