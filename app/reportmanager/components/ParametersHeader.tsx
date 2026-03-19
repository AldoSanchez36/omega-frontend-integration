"use client"

import React from 'react';
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ParametersHeaderProps {
  userRole?: string;
  router: any; // NextRouter
}

const ParametersHeader: React.FC<ParametersHeaderProps> = ({
  userRole,
  router,
}) => {
  return (
    <CardHeader>
      <CardTitle>Parámetros del Sistema</CardTitle>
      <div className="flex flex-row gap-4 mt-2 text-xs items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1"><span className="w-4 h-4 inline-block rounded bg-yellow-100 border border-yellow-400"></span><span className="font-semibold text-yellow-700">Limite (bajo-bajo , alto-alto)</span></div>
          <div className="flex items-center gap-1"><span className="font-semibold text-green-700">Dentro de rango (bajo , alto)</span></div>
        </div>
        {(userRole === "admin" || userRole === "user") && (
          <Button 
            onClick={() => router.push('/dashboard-parameters')} 
            variant="secondary"
            size="sm"
            className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-300 text-xs"
          >
            ⚙️ Configurar Límites
          </Button>
        )}
      </div>
    </CardHeader>
  );
};

export default ParametersHeader;
