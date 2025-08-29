"use client"

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ActionButtonsProps {
  isGenerateDisabled: boolean;
  handleSaveData: () => void;
  handleGenerateReport: () => void;
  isSaving: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  isGenerateDisabled,
  handleSaveData,
  handleGenerateReport,
  isSaving,
}) => {
  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="flex space-x-4">
          <Button onClick={handleSaveData} variant="outline" disabled={isSaving}>
            {isSaving ? "Guardando..." : "💾 Guardar Datos"}
          </Button>
          <Button 
            onClick={handleGenerateReport} 
            disabled={isGenerateDisabled} 
            className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${isGenerateDisabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              📊 Generar Reporte
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActionButtons;
