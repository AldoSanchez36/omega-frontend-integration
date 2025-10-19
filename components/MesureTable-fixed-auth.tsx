"use client"
import { useEffect, useState } from "react"
import EditableLeyenda from "@/app/dashboard/buttons/admin"
import { API_ENDPOINTS } from "@/config/constants"
import { authService } from "@/services/authService"
import { httpService } from "@/services/httpService"

interface RawMeasurement {
  fecha: string
  sistema: string
  valor: number
}

interface PivotData {
  fecha: string
  [sensor: string]: string | number | undefined
}

interface Tolerancia {
  limite_min: number
  limite_max: number
  unidades: string
  leyenda: string
}

interface Props {
  variable: string
  startDate: string
  endDate: string
  apiBase: string
  unidades: string
  isAdmin?: boolean
  processName?: string
  clientName?: string
  userId?: string
}

export function MesureTable({ variable, startDate, endDate, apiBase, unidades, isAdmin = false, processName, clientName, userId }: Props) {
  const [data, setData] = useState<PivotData[]>([])
  const [sensors, setSensors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tolerancia, setTolerancia] = useState<Tolerancia | null>(null)
  const [leyendaEditable, setLeyendaEditable] = useState<string>("")
  const [editLeyenda, setEditLeyenda] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string[]>([])

  const addDebugInfo = (message: string) => {
    //console.log(`🔍 [MesureTable-${variable}] ${message}`);
    setDebugInfo(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Fetch mediciones con lógica de cascada usando httpService
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
          setError(noDataError);
          setData([]);
          setSensors([]);
          return;
        }
        
        addDebugInfo(`✅ Processing ${finalData.length} records for table`);
        
        // Procesar datos para la tabla
        const pivotData = processDataForTable(finalData);
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
        
        addDebugInfo(`📊 Table data processed: ${pivotData.length} time points`);
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

  function processDataForTable(rawData: RawMeasurement[]): PivotData[] {
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
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Cargando datos para {variable}...</p>
          {debugInfo.length > 0 && (
            <div className="mt-2 text-xs text-gray-500 max-h-16 overflow-y-auto">
              {debugInfo.slice(-3).map((info, index) => (
                <div key={index}>{info}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        <div className="mb-2">
          <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium mb-1">Error cargando datos</h3>
        <p className="text-xs">{error}</p>
        {debugInfo.length > 0 && (
          <div className="mt-2 max-h-16 overflow-y-auto bg-gray-100 p-2 rounded text-xs">
            <strong>Debug:</strong>
            {debugInfo.slice(-3).map((info, index) => (
              <div key={index}>{info}</div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center text-gray-500 p-4">
        <div className="mb-2">
          <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-medium mb-1">No hay datos disponibles</h3>
        <p className="text-xs">No se encontraron mediciones para {variable} en el rango de fechas seleccionado.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fecha
            </th>
            {sensors.map(sensor => (
              <th key={sensor} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {sensor}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data.map((row, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {row.fechaEtiqueta}
              </td>
              {sensors.map(sensor => (
                <td key={sensor} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {row[sensor] !== undefined ? row[sensor] : '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
