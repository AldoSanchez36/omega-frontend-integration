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
  const token = typeof window !== 'undefined' ? localStorage.getItem('Organomex_token') : null;
  const encodedVar = encodeURIComponent(variable)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      
      try {
        let finalData: RawMeasurement[] = [];
        
        console.log(`🔍 Loading data for variable: "${variable}"`);
        console.log(`🔍 Encoded variable: "${encodedVar}"`);
        console.log(`🔍 Client: ${clientName}, Process: ${processName}, User: ${userId}`);
        
        // DIAGNÓSTICO: Primero probar el endpoint básico sin parámetros adicionales
        console.log('🧪 Testing basic endpoint first...');
        
        // Test 1: Endpoint básico de variable
        const basicEndpoint = `/api/mediciones/variable/${encodedVar}`;
        console.log(`📡 Testing basic endpoint: ${apiBase}${basicEndpoint}`);
        
        const basicRes = await fetch(
          `${apiBase}${basicEndpoint}`,
          { 
            headers: { 
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log(`📊 Basic endpoint response: ${basicRes.status} ${basicRes.statusText}`);
        
        if (basicRes.ok) {
          const basicResult = await basicRes.json();
          console.log('✅ Basic endpoint successful:', basicResult);
          finalData = basicResult.mediciones || basicResult || [];
        } else {
          console.log('❌ Basic endpoint failed, trying alternative endpoints...');
          
          // Test 2: Endpoint con variable-id
          const variableIdEndpoint = `/api/mediciones/variable-id/${encodedVar}`;
          console.log(`📡 Testing variable-id endpoint: ${apiBase}${variableIdEndpoint}`);
          
          const variableIdRes = await fetch(
            `${apiBase}${variableIdEndpoint}`,
            { 
              headers: { 
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                'Content-Type': 'application/json'
              }
            }
          );
          
          console.log(`📊 Variable-id endpoint response: ${variableIdRes.status} ${variableIdRes.statusText}`);
          
          if (variableIdRes.ok) {
            const variableIdResult = await variableIdRes.json();
            console.log('✅ Variable-id endpoint successful:', variableIdResult);
            finalData = variableIdResult.mediciones || variableIdResult || [];
          } else {
            // Test 3: Endpoint con sistema
            const sistemaEndpoint = `/api/mediciones/sistema/${encodedVar}`;
            console.log(`📡 Testing sistema endpoint: ${apiBase}${sistemaEndpoint}`);
            
            const sistemaRes = await fetch(
              `${apiBase}${sistemaEndpoint}`,
              { 
                headers: { 
                  ...(token ? { Authorization: `Bearer ${token}` } : {}),
                  'Content-Type': 'application/json'
                }
              }
            );
            
            console.log(`📊 Sistema endpoint response: ${sistemaRes.status} ${sistemaRes.statusText}`);
            
            if (sistemaRes.ok) {
              const sistemaResult = await sistemaRes.json();
              console.log('✅ Sistema endpoint successful:', sistemaResult);
              finalData = sistemaResult.mediciones || sistemaResult || [];
            } else {
              console.log('❌ All endpoints failed, trying process endpoint...');
              
              // Test 4: Endpoint con proceso
              if (processName) {
                const processEndpoint = `/api/mediciones/proceso/${encodeURIComponent(processName)}`;
                console.log(`📡 Testing process endpoint: ${apiBase}${processEndpoint}`);
                
                const processRes = await fetch(
                  `${apiBase}${processEndpoint}`,
                  { 
                    headers: { 
                      ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      'Content-Type': 'application/json'
                    }
                  }
                );
                
                console.log(`📊 Process endpoint response: ${processRes.status} ${processRes.statusText}`);
                
                if (processRes.ok) {
                  const processResult = await processRes.json();
                  console.log('✅ Process endpoint successful:', processResult);
                  // Filtrar por variable específica
                  const allData = processResult.mediciones || processResult || [];
                  finalData = allData.filter((item: any) => 
                    item.variable === variable || 
                    item.variable_id === variable ||
                    item.nombre === variable ||
                    item.parametro === variable
                  );
                  console.log(`🔍 Filtered data for variable "${variable}": ${finalData.length} records`);
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
          
          console.log(`📅 Date filtered data: ${filteredData.length} records between ${startDate} and ${endDate}`);
          finalData = filteredData;
        }
        
        if (finalData.length === 0) {
          console.log(`⚠️ No data found for variable "${variable}"`);
          setError(`No se encontraron datos para la variable "${variable}"`);
          setData([]);
          setSensors([]);
          return;
        }
        
        console.log(`✅ Found ${finalData.length} records for variable "${variable}"`);
        
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
        
        console.log(`📊 Processed data for chart: ${pivotData.length} time points`);
        console.log(`🔧 Available sensors: ${uniqueSensors.join(', ')}`);
        
      } catch (err: any) {
        console.error('💥 Error loading data:', err);
        setError(`Error cargando datos: ${err.message}`);
        setData([]);
        setSensors([]);
      } finally {
        setLoading(false);
      }
    }
    
    load();
  }, [variable, startDate, endDate, apiBase, processName, clientName, userId, token]);

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

  const chartConfig: ChartConfig = {
    fecha: {
      label: "Fecha",
      type: "category"
    },
    ...sensors.reduce((acc, sensor) => {
      acc[sensor] = {
        label: sensor,
        type: "linear",
        color: colorPalette[sensors.indexOf(sensor) % colorPalette.length]
      };
      return acc;
    }, {} as any)
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando datos para {variable}...</p>
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
            <div className="mt-4 text-xs text-gray-500">
              <p>Variable: {variable}</p>
              <p>Endpoint probado: {apiBase}/api/mediciones/variable/{encodeURIComponent(variable)}</p>
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

