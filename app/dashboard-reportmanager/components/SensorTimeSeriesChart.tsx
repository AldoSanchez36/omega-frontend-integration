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
}

export function SensorTimeSeriesChart({
  variable, startDate, endDate, apiBase, unidades
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
  const token = typeof window !== 'undefined' ? localStorage.getItem('omega_token') : null;
  const encodedVar = encodeURIComponent(variable)

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
          console.error("SensorTimeSeriesChart fetch error:", err);
          setError(err.message || "Error obteniendo datos");
          setLoading(false);
          return;
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
          const row: PivotData = {
            fecha,
            fechaEtiqueta: new Date(fecha).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
          };
          sensorList.forEach(sensor => {
            const meas = filtered.find(m => m.fecha === fecha && m.sistema === sensor);
            row[sensor] = meas ? meas.valor : undefined;
          });
          return row;
        });

        // Asignar sensores y datos para graficar
        setSensors(sensorList);
        setData(pivotData);
      } catch (e) {
        console.error(e)
        setError("Error obteniendo datos")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [variable, startDate, endDate, apiBase, token])

  if (error) return <div className="text-red-600">Error: {error}</div>;
  if (loading) return <div>Cargando…</div>
  if (data.length === 0) return <div>No hay datos en ese rango.</div>

  // Config dinámico de líneas
  const chartConfig = sensors.reduce((cfg, sensor, i) => ({
    ...cfg,
    [sensor]: {
      label: sensor,
      // Reutiliza la paleta de tu tema: var(--chart-1), var(--chart-2),…
      color: `hsl(var(--chart-${i+1}))`
    }
  }), {} as Record<string, { label: string; color: string }>)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{variable}</CardTitle>
        <CardDescription>
          {startDate} – {endDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart
            data={data}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              label={{ value: `${variable} ${unidades}`, angle: -90, position: 'insideLeft' }}
            />
            <XAxis
              dataKey="fechaEtiqueta"
              interval={0}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />

            {sensors.map((sensor, i) => (
              <Line
                key={sensor}
                dataKey={sensor}
                type="monotone"
                stroke={colorPalette[i % colorPalette.length]}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            ))}
            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="circle"
              iconSize={8}
              layout="horizontal"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <small>Solo sensores con datos</small>
      </CardFooter>
    </Card>
  )
}