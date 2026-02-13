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
  const token = authService.getToken();
  const encodedVar = encodeURIComponent(variable)

  // Fetch mediciones con lógica de cascada
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let finalData: RawMeasurement[] = [];
        
        // Lógica de cascada: primero verificar por usuario y proceso (más específico)
        if (userId && processName) {
          // 1. Primera llamada: MEASUREMENTS_BY_VARIABLE_AND_USER_AND_PROCESS (más específico)
          const userProcessRes = await fetch(
            `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_USER_AND_PROCESS(variable, userId, processName)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          
          if (userProcessRes.ok) {
            const userProcessResult = await userProcessRes.json();
            const userProcessData = userProcessResult.mediciones || [];
            
            // Filtrar datos por fecha
            const filteredUserProcessData = userProcessData.filter((m: any) => {
              const d = new Date(m.fecha);
              return d >= new Date(startDate) && d <= new Date(endDate);
            });
            
            if (filteredUserProcessData.length > 0) {
              finalData = filteredUserProcessData;
            }
          }
        }
        
        // 2. Si no hay datos por usuario y proceso, verificar por cliente
        if (finalData.length === 0 && clientName) {
          const clientRes = await fetch(
            `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_CLIENT(variable, clientName)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          
          if (clientRes.ok) {
            const clientResult = await clientRes.json();
            const clientData = clientResult.mediciones || [];
            
            // Filtrar datos del cliente por fecha
            const filteredClientData = clientData.filter((m: any) => {
              const d = new Date(m.fecha);
              return d >= new Date(startDate) && d <= new Date(endDate);
            });
            
            if (filteredClientData.length > 0) {
              finalData = filteredClientData;
            }
          }
        }
        
        // 3. Si no hay datos por cliente, verificar por proceso
        if (finalData.length === 0 && processName) {
          const processRes = await fetch(
            `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_PROCESS(variable, processName)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          
          if (processRes.ok) {
            const processResult = await processRes.json();
            const processData = processResult.mediciones || [];
            
            // Filtrar datos del proceso por fecha
            const filteredProcessData = processData.filter((m: any) => {
              const d = new Date(m.fecha);
              return d >= new Date(startDate) && d <= new Date(endDate);
            });
            
            if (filteredProcessData.length > 0) {
              finalData = filteredProcessData;
            }
          }
        }
        
        // Si no hay datos específicos, no mostrar nada
        if (finalData.length === 0) {
          setData([]);
          setSensors([]);
          setLoading(false);
          return;
        }
        
        // Procesar los datos encontrados
        const json: RawMeasurement[] = finalData;
        // Filtrar registros por fecha
        const filtered = json.filter(m => {
          const d = new Date(m.fecha);
          return d >= new Date(startDate) && d <= new Date(endDate);
        });
        // Detectar sensores únicos
        const sensorSet = new Set(filtered.map(m => m.sistema as string));
        const sensorList = Array.from(sensorSet).sort();
        // Detectar fechas únicas y ordenarlas
        const dateSet = new Set(filtered.map(m => m.fecha));
        const dateList = Array.from(dateSet).sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        );
        // Pivotar datos: cada fecha un objeto con valores por sensor
        const pivotData: PivotData[] = dateList.map(fecha => {
          const row: PivotData = { fecha };
          sensorList.forEach(sensor => {
            const meas = filtered.find(m => m.fecha === fecha && m.sistema === sensor);
            row[sensor] = meas ? meas.valor : "";
          });
          return row;
        });
        setSensors(sensorList);
        setData(pivotData);
      } catch (e) {
        setError("Error obteniendo datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [variable, startDate, endDate, apiBase, token, processName, clientName, userId])

  // Fetch tolerancia
  useEffect(() => {
    async function fetchTolerancia() {
      try {
        setTolerancia(  null)
        setLeyendaEditable( "Segun NOM-127-SSA1-2021")
      } catch {
        setTolerancia(null)
      }
    }
    fetchTolerancia()
  }, [variable, apiBase, token, encodedVar])

  // Calcular ALTO, PROMEDIO, BAJO por sensor
  const stats = sensors.map(sensor => {
    // Solo valores numéricos y existentes
    const values = data.map(row => row[sensor]).filter(v => v !== '' && v !== undefined && v !== null && !isNaN(Number(v))).map(Number)
    // Calcular promedio
    let promedio = ''
    if (values.length > 0) {
      promedio = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    }
    return {
      sensor,
      alto: values.length ? Math.max(...values).toFixed(2) : "",
      promedio,
      bajo: values.length ? Math.min(...values).toFixed(2) : "",
    }
  })

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (loading) return <div>Cargando…</div>
  if (data.length === 0) return (
    <div className="text-center py-4 text-gray-500">
      No se encontraron mediciones para <strong>{variable}</strong> en el proceso/cliente seleccionado.
    </div>
  );

  return (
    <div className="overflow-x-auto my-4">
      <h2 className="text-xl font-bold mb-2">{variable}</h2>
      <table className="table table-bordered table-sm w-auto min-w-full bg-white">
        <thead className="table-primary">
          <tr>
            <th style={{ minWidth: 100, width: 120, textAlign: 'left' }}> </th>
            {sensors.map(sensor => (
              <th key={sensor}>{sensor}</th>
            ))}
          </tr>
          <tr className="bg-green-700 text-white">
            <th style={{ minWidth: 100, width: 120, textAlign: 'left' }}>ALTO</th>
            {stats.map(s => (
              <th key={s.sensor}>{s.alto}</th>
            ))}
          </tr>
          <tr className="bg-green-700 text-white">
            <th style={{ minWidth: 100, width: 120, textAlign: 'left' }}>PROMEDIO</th>
            {stats.map(s => (
              <th key={s.sensor}>{s.promedio}</th>
            ))}
          </tr>
          <tr className="bg-green-700 text-white">
            <th style={{ minWidth: 100, width: 120, textAlign: 'left' }}>BAJO</th>
            {stats.map(s => (
              <th key={s.sensor}>{s.bajo}</th>
            ))}
          </tr>
        </thead>
      </table>
      <div className="text-muted small mt-2 mb-2" style={{fontWeight: 500}}>
        Rango de {variable} ({unidades}) {" "}
        
      </div>
      <hr className="my-2 border-0" style={{height: '8px'}} />
      <table className="table table-bordered table-sm w-auto min-w-full bg-white">
        <thead className="table-primary">
          <tr>
            <th style={{ minWidth: 100, width: 120, textAlign: 'left' }}>Fecha</th>
            {sensors.map(sensor => (
              <th key={sensor}>{sensor}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              <td style={{ minWidth: 100, width: 120, textAlign: 'left' }}>{new Date(row.fecha).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "2-digit" })}</td>
              {sensors.map(sensor => (
                <td key={sensor}>{row[sensor]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default MesureTable;
