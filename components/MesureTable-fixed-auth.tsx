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
  comentarios?: string
  id?: string | number
}

interface PivotData {
  fecha: string
  fechaEtiqueta: string
  comentarios?: string // Comentarios de las mediciones guardadas
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
  
  // Los comentarios ahora vienen directamente de las mediciones guardadas en la BD
  // NOTA: Ya no se usa parameterComment - los comentarios se obtienen de las mediciones guardadas

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
          // Normalizar fechas para comparación (solo YYYY-MM-DD)
          const normalizeDate = (dateStr: string): string => {
            if (!dateStr) return ''
            // Si viene como ISO string completo, extraer solo la fecha
            if (dateStr.includes('T')) {
              return dateStr.split('T')[0]
            }
            // Si ya está en formato YYYY-MM-DD, retornarlo
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              return dateStr
            }
            // Intentar parsear y normalizar
            const date = new Date(dateStr)
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0]
            }
            return dateStr
          }
          
          const startDateNormalized = normalizeDate(startDate)
          const endDateNormalized = normalizeDate(endDate)
          
          const filteredData = finalData.filter((m: any) => {
            const fechaNormalizada = normalizeDate(m.fecha)
            return fechaNormalizada >= startDateNormalized && fechaNormalizada <= endDateNormalized
          });
          
          addDebugInfo(`📅 Date filtered: ${filteredData.length} records between ${startDateNormalized} and ${endDateNormalized}`);
          if (finalData.length > 0) {
            addDebugInfo(`📊 Sample dates from data (first 5): ${finalData.slice(0, 5).map((m: any) => `${normalizeDate(m.fecha)} (original: ${m.fecha})`).join(', ')}`);
          }
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
        
        // Extraer sensores únicos (solo los valores de 'sistema' de las mediciones)
        // Filtrar solo sistemas que empiezan con 'S' seguido de números (S01, S02, etc.)
        const uniqueSensors = [...new Set(
          finalData
            .map((m: any) => m.sistema)
            .filter((sistema: any) => {
              if (!sistema || typeof sistema !== 'string') return false;
              const trimmed = sistema.trim();
              // Solo aceptar sistemas que coincidan con el patrón S01, S02, etc.
              return /^S\d+$/i.test(trimmed);
            })
        )].sort();
        setSensors(uniqueSensors);
        
        addDebugInfo(`📊 Table data processed: ${pivotData.length} time points`);
        addDebugInfo(`🔧 Available sensors: ${uniqueSensors.join(', ')}`);
        
        // Debug: Ver qué campos tienen los datos
        if (finalData.length > 0) {
          const sampleData = finalData[0];
          addDebugInfo(`📋 Sample data keys: ${Object.keys(sampleData).join(', ')}`);
        }
        
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
      
      // Agregar valores de sensores (usar el campo 'sistema' como clave y 'valor' como valor)
      // Solo agregar si el sistema coincide con el patrón S01, S02, etc.
      measurements.forEach((measurement: RawMeasurement) => {
        if (measurement.sistema && 
            measurement.valor !== undefined && 
            typeof measurement.sistema === 'string' &&
            /^S\d+$/i.test(measurement.sistema.trim())) {
          pivotPoint[measurement.sistema] = measurement.valor;
        }
      });
      
      // Agregar comentarios de las mediciones guardadas (tomar el primero no vacío)
      const comentariosEncontrados = measurements
        .map((m: RawMeasurement) => m.comentarios)
        .filter((c: string | undefined) => {
          // Validación defensiva: verificar que c existe y es string antes de usar trim
          if (!c || typeof c !== 'string') return false;
          return c.trim() !== '';
        });
      
      if (comentariosEncontrados.length > 0) {
        // Si hay múltiples comentarios, tomar el primero (o podrías concatenarlos)
        const primerComentario = comentariosEncontrados[0];
        if (primerComentario && typeof primerComentario === 'string') {
          pivotPoint.comentarios = primerComentario;
        }
      }
      
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
    return null; // No mostrar nada cuando hay error
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
              FECHA
            </th>
            {sensors.map(sensor => (
              <th key={sensor} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {sensor}
              </th>
            ))}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              COMENTARIOS
            </th>
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
              <td className="px-6 py-4 text-sm text-gray-900">
                {(row.comentarios && typeof row.comentarios === 'string') ? row.comentarios : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
