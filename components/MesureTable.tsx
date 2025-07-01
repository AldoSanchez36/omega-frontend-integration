"use client"
import { useEffect, useState } from "react"

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
}

export function MesureTable({ variable, startDate, endDate, apiBase, unidades, isAdmin = false }: Props) {
  const [data, setData] = useState<PivotData[]>([])
  const [sensors, setSensors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tolerancia, setTolerancia] = useState<Tolerancia | null>(null)
  const [leyendaEditable, setLeyendaEditable] = useState<string>("")
  const [editLeyenda, setEditLeyenda] = useState(false)
  const token = typeof window !== 'undefined' ? localStorage.getItem('omega_token') : null;
  const encodedVar = encodeURIComponent(variable)

  // Fetch mediciones
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `${apiBase}/api/mediciones/variable/${encodedVar}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        )
        if (!res.ok) {
          const err = await res.json();
          setError(err.message || "Error obteniendo datos")
          setLoading(false)
          return
        }
        const result = await res.json();
        const json: RawMeasurement[] = result.mediciones || [];
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
  }, [variable, startDate, endDate, apiBase, token])

  // Fetch tolerancia
  useEffect(() => {
    async function fetchTolerancia() {
      try {
        const res = await fetch(`${apiBase}/api/variables-tolerancia/${encodedVar}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return;
        const result = await res.json();
        setTolerancia(result.tolerancia || null)
        setLeyendaEditable(result.tolerancia?.leyenda || "Segun NOM-127-SSA1-2021")
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
      promedio = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(3)
    }
    return {
      sensor,
      alto: values.length ? Math.max(...values) : "",
      promedio,
      bajo: values.length ? Math.min(...values) : "",
    }
  })

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (loading) return <div>Cargando…</div>
  if (data.length === 0) return <div>No hay datos en ese rango.</div>

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
        {isAdmin ? (
          editLeyenda ? (
            <input
              className="border px-1 py-0.5 text-xs"
              value={leyendaEditable}
              onChange={e => setLeyendaEditable(e.target.value)}
              onBlur={() => setEditLeyenda(false)}
              autoFocus
            />
          ) : (
            <span
              className="underline cursor-pointer"
              title="Editar leyenda"
              onClick={() => setEditLeyenda(true)}
            >
              {leyendaEditable || "Segun NOM-127-SSA1-2021"}
            </span>
          )
        ) : (
          <span>{leyendaEditable || "Segun NOM-127-SSA1-2021"}</span>
        )}
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
