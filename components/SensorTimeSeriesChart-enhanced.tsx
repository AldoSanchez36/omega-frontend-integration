"use client"

import { useEffect, useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { API_ENDPOINTS } from '@/config/constants'
import { authService } from '@/services/authService'
import { httpService } from '@/services/httpService'

interface RawMeasurement {
  fecha: string
  [sensor: string]: string | number
}

interface PivotData {
  fecha: string
  fechaEtiqueta: string
  [sensor: string]: string | number | undefined
}

interface Props {
  variable: string             // p.ej. "Cloro Libre"
  startDate: string            // "2025-04-04"
  endDate: string              // "2025-06-04"
  apiBase: string              // "http://localhost:4000"
  unidades: string             // p.ej. "ppm", "mg/L", etc.
  hideXAxisLabels?: boolean
  processName?: string         // Nombre del proceso para verificar datos primero
  clientName?: string          // Nombre del cliente para la lógica de cascada
  userId?: string              // ID del usuario para filtrado específico
}

export function SensorTimeSeriesChart({
  variable, startDate, endDate, apiBase, unidades, hideXAxisLabels, processName, clientName, userId
}: Props) {
  // Paleta de 10 colores aleatorios
  const colorPalette: string[] = useMemo(() =>
    Array.from({ length: 10 }, () =>
      "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0")
    ), []
  );

  const [data, setData] = useState<PivotData[]>([])
  const [sensors, setSensors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [availableVariables, setAvailableVariables] = useState<string[]>([]);
  const [suggestedVariables, setSuggestedVariables] = useState<string[]>([]);

  const addDebugInfo = (message: string) => {
    setDebugInfo(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Función para obtener variables disponibles
  const fetchAvailableVariables = async () => {
    try {
      addDebugInfo(`📋 Fetching available variables...`);
      const variablesResponse = await httpService.get(API_ENDPOINTS.VARIABLES_ALL);
      const variables = variablesResponse.variables || variablesResponse || [];
      const variableNames = variables.map((v: any) => v.nombre);
      setAvailableVariables(variableNames);
      addDebugInfo(`📋 Found ${variableNames.length} available variables: ${variableNames.slice(0, 5).join(', ')}${variableNames.length > 5 ? '...' : ''}`);
      
      // Sugerir variables similares
      const suggestions = variableNames.filter((name: string) => 
        name.toLowerCase().includes(variable.toLowerCase()) ||
        variable.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes('cloro') ||
        name.toLowerCase().includes('s1') ||
        name.toLowerCase().includes('s2')
      );
      setSuggestedVariables(suggestions.slice(0, 5));
      
    } catch (error: any) {
      addDebugInfo(`❌ Error fetching variables: ${error.message}`);
    }
  };

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      setDebugInfo([])
      
      addDebugInfo(`Starting data load for variable: "${variable}"`);
      addDebugInfo(`Client: ${clientName}, Process: ${processName}, User: ${userId}`);
      
      try {
        let finalData: RawMeasurement[] = [];
        
        // Verificar autenticación primero
        if (!authService.isAuthenticated()) {
          const authError = 'No authentication found. Please log in again.';
          addDebugInfo(`❌ ${authError}`);
          setError(authError);
          setLoading(false);
          return;
        }
        
        addDebugInfo(`✅ Authentication verified`);
        
        // Obtener variables disponibles para mejor diagnóstico
        await fetchAvailableVariables();
        
        // Estrategia 1: Endpoint básico de variable
        try {
          addDebugInfo(`📡 Trying basic variable endpoint...`);
          const basicEndpoint = API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_NAME(variable);
          const basicResult = await httpService.get(basicEndpoint);
          
          if (basicResult && (basicResult.mediciones || Array.isArray(basicResult))) {
            finalData = basicResult.mediciones || basicResult;
            addDebugInfo(`✅ Basic endpoint successful: ${finalData.length} records`);
          }
        } catch (basicError: any) {
          addDebugInfo(`❌ Basic endpoint failed: ${basicError.message}`);
          
          // Si es 404, la variable no existe
          if (basicError.message.includes('404') || basicError.message.includes('not found')) {
            const notFoundError = `La variable "${variable}" no existe en la base de datos.`;
            addDebugInfo(`⚠️ ${notFoundError}`);
            
            if (suggestedVariables.length > 0) {
              setError(`${notFoundError} Variables similares disponibles: ${suggestedVariables.join(', ')}`);
            } else {
              setError(`${notFoundError} Verifique el nombre de la variable.`);
            }
            setData([]);
            setSensors([]);
            setLoading(false);
            return;
          }
          
          // Estrategia 2: Endpoint con variable-id
          try {
            addDebugInfo(`📡 Trying variable-id endpoint...`);
            const variableIdEndpoint = API_ENDPOINTS.MEASUREMENTS_BY_VARIABLEID(variable);
            const variableIdResult = await httpService.get(variableIdEndpoint);
            
            if (variableIdResult && (variableIdResult.mediciones || Array.isArray(variableIdResult))) {
              finalData = variableIdResult.mediciones || variableIdResult;
              addDebugInfo(`✅ Variable-id endpoint successful: ${finalData.length} records`);
            }
          } catch (variableIdError: any) {
            addDebugInfo(`❌ Variable-id endpoint failed: ${variableIdError.message}`);
            
            // Estrategia 3: Endpoint con sistema
            try {
              addDebugInfo(`📡 Trying sistema endpoint...`);
              const sistemaEndpoint = API_ENDPOINTS.MEASUREMENTS_BY_SYSTEM(variable);
              const sistemaResult = await httpService.get(sistemaEndpoint);
              
              if (sistemaResult && (sistemaResult.mediciones || Array.isArray(sistemaResult))) {
                finalData = sistemaResult.mediciones || sistemaResult;
                addDebugInfo(`✅ Sistema endpoint successful: ${finalData.length} records`);
              }
            } catch (sistemaError: any) {
              addDebugInfo(`❌ Sistema endpoint failed: ${sistemaError.message}`);
              
              // Estrategia 4: Endpoint con proceso
              if (processName) {
                try {
                  addDebugInfo(`📡 Trying process endpoint...`);
                  const processEndpoint = API_ENDPOINTS.MEASUREMENTS_BY_PROCESS(processName);
                  const processResult = await httpService.get(processEndpoint);
                  
                  if (processResult && (processResult.mediciones || Array.isArray(processResult))) {
                    const allData = processResult.mediciones || processResult;
                    // Filtrar por variable específica
                    finalData = allData.filter((item: any) => 
                      item.variable === variable || 
                      item.variable_id === variable ||
                      item.nombre === variable ||
                      item.parametro === variable
                    );
                    addDebugInfo(`✅ Process endpoint successful: ${finalData.length} records for variable "${variable}"`);
                  }
                } catch (processError: any) {
                  addDebugInfo(`❌ Process endpoint failed: ${processError.message}`);
                }
              }
            }
          }
        }
        
        // Filtrar datos por fecha si tenemos datos
        if (finalData.length > 0) {
          const filteredData = finalData.filter((m: any) => {
            const d = new Date(m.fecha);
            return d >= new Date(startDate) && d <= new Date(endDate);
          });
          
          addDebugInfo(`📅 Date filtered: ${filteredData.length} records between ${startDate} and ${endDate}`);
          finalData = filteredData;
        }
        
        if (finalData.length === 0) {
          const noDataError = `No se encontraron datos para la variable "${variable}". Verifique que la variable existe y tiene mediciones en el rango de fechas seleccionado.`;
          addDebugInfo(`⚠️ ${noDataError}`);
          
          if (suggestedVariables.length > 0) {
            setError(`${noDataError} Variables similares disponibles: ${suggestedVariables.join(', ')}`);
          } else {
            setError(noDataError);
          }
          setData([]);
          setSensors([]);
          return;
        }
        
        addDebugInfo(`✅ Processing ${finalData.length} records for chart`);
        
        // Procesar datos para el gráfico
        const pivotData = processDataForChart(finalData);
        setData(pivotData);
        
        // Extraer sensores únicos
        const uniqueSensors = [...new Set(
          finalData.flatMap((m: any) => Object.keys(m).filter(key => 
            key !== 'fecha' && 
            key !== 'variable' && 
            key !== 'variable_id' &&
            key !== 'proceso_id' &&
            key !== 'sistema' &&
            key !== 'usuario_id' &&
            key !== 'planta_id'
          ))
        )];
        setSensors(uniqueSensors);
        
        addDebugInfo(`📊 Chart data processed: ${pivotData.length} time points`);
        addDebugInfo(`🔧 Available sensors: ${uniqueSensors.join(', ')}`);
        
      } catch (err: any) {
        addDebugInfo(`💥 Error: ${err.message}`);
        setError(`Error cargando datos: ${err.message}`);
        setData([]);
        setSensors([]);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [variable, startDate, endDate, apiBase, processName, clientName, userId]);

  function processDataForChart(rawData: RawMeasurement[]): PivotData[] {
    if (!rawData || rawData.length === 0) return [];
    
    // Agrupar por fecha
    const groupedByDate: { [fecha: string]: RawMeasurement[] } = {};
    
    rawData.forEach(measurement => {
      const fecha = measurement.fecha;
      if (!groupedByDate[fecha]) {
        groupedByDate[fecha] = [];
      }
      groupedByDate[fecha].push(measurement);
    });
    
    // Crear datos pivotados
    const pivotData: PivotData[] = Object.entries(groupedByDate).map(([fecha, measurements]) => {
      const pivotPoint: PivotData = {
        fecha,
        fechaEtiqueta: new Date(fecha).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        })
      };
      
      // Agregar valores de sensores
      measurements.forEach(measurement => {
        Object.entries(measurement).forEach(([key, value]) => {
          if (key !== 'fecha' && typeof value === 'number') {
            pivotPoint[key] = value;
          }
        });
      });
      
      return pivotPoint;
    });
    
    // Ordenar por fecha
    return pivotData.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos para {variable}...</p>
              {debugInfo.length > 0 && (
                <div className="mt-4 text-xs text-gray-500 max-h-32 overflow-y-auto">
                  {debugInfo.slice(-5).map((info, index) => (
                    <div key={index}>{info}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">Error cargando datos</h3>
            <p className="text-sm">{error}</p>
            {availableVariables.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Variables disponibles en el sistema:</h4>
                <div className="text-xs text-blue-700 max-h-32 overflow-y-auto">
                  {availableVariables.slice(0, 10).map((variable, index) => (
                    <span key={index} className="inline-block bg-blue-100 px-2 py-1 rounded mr-1 mb-1">
                      {variable}
                    </span>
                  ))}
                  {availableVariables.length > 10 && (
                    <span className="text-blue-500">... y {availableVariables.length - 10} más</span>
                  )}
                </div>
              </div>
            )}
            <div className="mt-4 text-xs text-gray-500">
              <p>Variable solicitada: {variable}</p>
              {debugInfo.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto bg-gray-100 p-2 rounded">
                  <strong>Debug Info:</strong>
                  {debugInfo.map((info, index) => (
                    <div key={index}>{info}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2">No hay datos disponibles</h3>
            <p className="text-sm">No se encontraron mediciones para {variable} en el rango de fechas seleccionado.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {variable} ({unidades})
        </CardTitle>
        <CardDescription>
          Datos históricos del {startDate} al {endDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="fechaEtiqueta" 
              hide={hideXAxisLabels}
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Legend />
            {sensors.map((sensor, index) => (
              <Line
                key={sensor}
                type="monotone"
                dataKey={sensor}
                stroke={colorPalette[index % colorPalette.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-sm text-gray-600">
        <div className="flex justify-between w-full">
          <span>Total de puntos: {data.length}</span>
          <span>Sensores: {sensors.length}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
