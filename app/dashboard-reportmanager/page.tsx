"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Navbar } from "@/components/navbar"
import { DebugPanel } from "@/components/debug-panel"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import type { Plant, User } from "@/types"

export default function ReportManager() {
  const router = useRouter()
  const { debugInfo, addDebugLog } = useDebugLogger()

  const [plants, setPlants] = useState<Plant[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>("")
  const [selectedSystem, setSelectedSystem] = useState<string>("")
  const [parameterValues, setParameterValues] = useState<Record<string, { checked: boolean; value: number }>>({})
  const [loading, setLoading] = useState(true)

  const mockUser: User = {
    id: "1",
    name: "Admin User",
    email: "admin@omega.com",
    role: "admin",
  }

  useEffect(() => {
    const loadPlants = async () => {
      addDebugLog("info", "Cargando plantas para reporte manager")

      try {
        // Mock data - replace with real fetch/axios call
        /*
        const response = await fetch('/api/plants')
        const plantsData = await response.json()
        setPlants(plantsData)
        */

        const mockPlants: Plant[] = [
          {
            id: "1",
            name: "Planta Norte",
            location: "Ciudad Norte",
            description: "Planta principal",
            clientId: "1",
            clientName: "Cliente A",
            status: "active",
            systems: [
              {
                id: "1",
                name: "Sistema de Temperatura",
                type: "temperature",
                description: "Control de temperatura",
                plantId: "1",
                parameters: [
                  {
                    id: "1",
                    name: "Temperatura Ambiente",
                    unit: "°C",
                    value: 25,
                    minValue: 0,
                    maxValue: 50,
                    systemId: "1",
                  },
                  {
                    id: "2",
                    name: "Humedad Relativa",
                    unit: "%",
                    value: 60,
                    minValue: 0,
                    maxValue: 100,
                    systemId: "1",
                  },
                  {
                    id: "3",
                    name: "Punto de Rocío",
                    unit: "°C",
                    value: 15,
                    minValue: -10,
                    maxValue: 30,
                    systemId: "1",
                  },
                ],
                status: "online",
              },
              {
                id: "2",
                name: "Sistema de Presión",
                type: "pressure",
                description: "Control de presión",
                plantId: "1",
                parameters: [
                  {
                    id: "4",
                    name: "Presión Principal",
                    unit: "PSI",
                    value: 120,
                    minValue: 0,
                    maxValue: 200,
                    systemId: "2",
                  },
                  {
                    id: "5",
                    name: "Presión Secundaria",
                    unit: "PSI",
                    value: 80,
                    minValue: 0,
                    maxValue: 150,
                    systemId: "2",
                  },
                ],
                status: "online",
              },
            ],
            createdAt: "2024-01-15",
          },
          {
            id: "2",
            name: "Planta Sur",
            location: "Ciudad Sur",
            description: "Planta de respaldo",
            clientId: "2",
            clientName: "Cliente B",
            status: "active",
            systems: [
              {
                id: "3",
                name: "Sistema de Flujo",
                type: "flow",
                description: "Control de flujo",
                plantId: "2",
                parameters: [
                  {
                    id: "6",
                    name: "Flujo Principal",
                    unit: "L/min",
                    value: 150,
                    minValue: 0,
                    maxValue: 300,
                    systemId: "3",
                  },
                  { id: "7", name: "Velocidad", unit: "m/s", value: 2.5, minValue: 0, maxValue: 10, systemId: "3" },
                ],
                status: "online",
              },
            ],
            createdAt: "2024-01-20",
          },
        ]

        setPlants(mockPlants)
        addDebugLog("success", `Cargadas ${mockPlants.length} plantas`)
      } catch (error) {
        addDebugLog("error", `Error cargando plantas: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadPlants()
  }, [addDebugLog])

  const selectedPlantData = plants.find((p) => p.id === selectedPlant)
  const selectedSystemData = selectedPlantData?.systems.find((s) => s.id === selectedSystem)

  const handleParameterChange = (parameterId: string, field: "checked" | "value", value: boolean | number) => {
    setParameterValues((prev) => ({
      ...prev,
      [parameterId]: {
        ...prev[parameterId],
        [field]: value,
      },
    }))
  }

  const handleSaveData = async () => {
    addDebugLog("info", "Guardando datos de parámetros")

    const selectedParams = Object.entries(parameterValues)
      .filter(([_, data]) => data.checked)
      .map(([id, data]) => ({ id, value: data.value }))

    try {
      // Mock save - replace with real API call
      /*
      const response = await fetch('/api/parameters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemId: selectedSystem,
          parameters: selectedParams
        })
      })
      */

      addDebugLog("success", `Guardados ${selectedParams.length} parámetros`)
    } catch (error) {
      addDebugLog("error", `Error guardando datos: ${error}`)
    }
  }

  const handleGenerateReport = async () => {
    addDebugLog("info", "Generando reporte")

    const selectedParams = Object.entries(parameterValues)
      .filter(([_, data]) => data.checked)
      .map(([id, data]) => ({ id, value: data.value }))

    try {
      // Mock report generation - replace with real API call
      /*
      const response = await fetch('/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plantId: selectedPlant,
          systemId: selectedSystem,
          parameters: selectedParams
        })
      })
      */

      addDebugLog("success", "Reporte generado exitosamente")
      router.push("/dashboard")
    } catch (error) {
      addDebugLog("error", `Error generando reporte: ${error}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={mockUser} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={mockUser} />

      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestor de Reportes</h1>
          <p className="text-gray-600">Selecciona parámetros y genera reportes personalizados</p>
        </div>

        {/* Plant and System Selectors */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Selección de Planta y Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Planta</label>
                <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((plant) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.name} - {plant.location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Sistema</label>
                <Select value={selectedSystem} onValueChange={setSelectedSystem} disabled={!selectedPlant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sistema" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPlantData?.systems.map((system) => (
                      <SelectItem key={system.id} value={system.id}>
                        {system.name} - {system.type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Tabs */}
        {selectedPlantData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Sistemas de {selectedPlantData.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedSystem} onValueChange={setSelectedSystem}>
                <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
                  {selectedPlantData.systems.map((system) => (
                    <TabsTrigger key={system.id} value={system.id}>
                      {system.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {selectedPlantData.systems.map((system) => (
                  <TabsContent key={system.id} value={system.id}>
                    <div className="mt-4">
                      <h3 className="text-lg font-semibold mb-2">{system.name}</h3>
                      <p className="text-gray-600 mb-4">{system.description}</p>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Parameters List */}
        {selectedSystemData && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Parámetros del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedSystemData.parameters.map((parameter) => (
                  <div key={parameter.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                    <Checkbox
                      checked={parameterValues[parameter.id]?.checked || false}
                      onCheckedChange={(checked) => handleParameterChange(parameter.id, "checked", checked as boolean)}
                    />

                    <div className="flex-1">
                      <div className="font-medium">{parameter.name}</div>
                      <div className="text-sm text-gray-500">
                        Rango: {parameter.minValue} - {parameter.maxValue} {parameter.unit}
                      </div>
                    </div>

                    <div className="w-32">
                      <Input
                        type="number"
                        placeholder={parameter.value.toString()}
                        min={parameter.minValue}
                        max={parameter.maxValue}
                        value={parameterValues[parameter.id]?.value || parameter.value}
                        onChange={(e) =>
                          handleParameterChange(parameter.id, "value", Number.parseFloat(e.target.value) || 0)
                        }
                        disabled={!parameterValues[parameter.id]?.checked}
                      />
                    </div>

                    <div className="text-sm text-gray-500 w-16">{parameter.unit}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {selectedSystemData && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex space-x-4">
                <Button onClick={handleSaveData} variant="outline">
                  💾 Guardar Datos
                </Button>
                <Button onClick={handleGenerateReport}>📊 Generar Reporte</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <DebugPanel
          debugInfo={debugInfo}
          currentState={{
            selectedPlant,
            selectedSystem,
            parametersSelected: Object.values(parameterValues).filter((p) => p.checked).length,
          }}
        />
      </div>
    </div>
  )
}
