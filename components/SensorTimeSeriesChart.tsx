"use client"

import { useEffect, useState, useMemo, useRef, useImperativeHandle, forwardRef } from "react"
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

export interface ChartExportRef {
  exportAsImage: () => Promise<string | null>
  exportAsSVG: () => string | null
}

export const SensorTimeSeriesChart = forwardRef<ChartExportRef, Props>(({
  variable, startDate, endDate, apiBase, unidades, hideXAxisLabels, processName, clientName, userId
}, ref) => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  // Paleta de colores fija para evitar problemas de hidratación
  const colorPalette: string[] = useMemo(() => [
    "#3b82f6", // azul
    "#ef4444", // rojo
    "#10b981", // verde
    "#f59e0b", // amarillo
    "#8b5cf6", // morado
    "#ec4899", // rosa
    "#06b6d4", // cyan
    "#f97316", // naranja
    "#6366f1", // índigo
    "#14b8a6", // teal
  ], []);

  const [data, setData] = useState<PivotData[]>([])
  const [sensors, setSensors] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null);
  const token = authService.getToken();
  const encodedVar = encodeURIComponent(variable)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      
      try {
        let finalData: RawMeasurement[] = [];
        
        // Normalizar fechas para comparación (solo YYYY-MM-DD)
        const normalizeDate = (dateStr: string): string => {
          if (!dateStr) return ''
          if (dateStr.includes('T')) return dateStr.split('T')[0]
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
          const date = new Date(dateStr)
          return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : dateStr
        }
        
        const startDateNormalized = normalizeDate(startDate)
        const endDateNormalized = normalizeDate(endDate)
        
        // Lógica de cascada: primero verificar por cliente, luego por proceso
        if (clientName) {
          // 1. Primera llamada: MEASUREMENTS_BY_VARIABLE_AND_CLIENT
          const clientRes = await fetch(
            `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_CLIENT(variable, clientName)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          
          if (clientRes.ok) {
            const clientResult = await clientRes.json();
            const clientData = clientResult.mediciones || [];
            
            // Filtrar datos del cliente por fecha
            const filteredClientData = clientData.filter((m: any) => {
              const fechaNormalizada = normalizeDate(m.fecha)
              return fechaNormalizada >= startDateNormalized && fechaNormalizada <= endDateNormalized
            });
            
            if (filteredClientData.length > 0) {
              finalData = filteredClientData;
            }
          }
        }
        
        // 2. Si no hay datos por cliente, verificar por usuario y proceso (más específico)
        if (finalData.length === 0 && userId && processName) {
          const userProcessRes = await fetch(
            `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_USER_AND_PROCESS(variable, userId, processName)}`,
            { headers: token ? { Authorization: `Bearer ${token}` } : {} }
          )
          
          if (userProcessRes.ok) {
            const userProcessResult = await userProcessRes.json();
            const userProcessData = userProcessResult.mediciones || [];
            
            // Filtrar datos por fecha
            const filteredUserProcessData = userProcessData.filter((m: any) => {
              const fechaNormalizada = normalizeDate(m.fecha)
              return fechaNormalizada >= startDateNormalized && fechaNormalizada <= endDateNormalized
            });
            
            if (filteredUserProcessData.length > 0) {
              finalData = filteredUserProcessData;
            }
          }
        }
        
        // 3. Si no hay datos por usuario y proceso, verificar por proceso
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
              const fechaNormalizada = normalizeDate(m.fecha)
              return fechaNormalizada >= startDateNormalized && fechaNormalizada <= endDateNormalized
            });
            
            if (filteredProcessData.length > 0) {
              finalData = filteredProcessData;
              //console.log(`Datos encontrados por proceso: ${filteredProcessData.length} registros`);
            }
          }
        }
        
                 // 3. Si no hay datos por cliente ni por proceso, NO mostrar datos generales
        // Solo mostrar datos específicos para el usuario/proceso seleccionado
        if (finalData.length === 0) {
          //console.log(`No se encontraron datos específicos para ${variable} en el proceso/cliente seleccionado`);
          setData([]);
          setSensors([]);
          setLoading(false);
          return;
        }
         
         // Filtrar registros por fecha (ya normalizado arriba)
         const filtered = finalData.filter(m => {
           const fechaNormalizada = normalizeDate(m.fecha)
           return fechaNormalizada >= startDateNormalized && fechaNormalizada <= endDateNormalized
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
         // noop
         setError("Error obteniendo datos")
       } finally {
         setLoading(false)
       }
     }
    load()
  }, [variable, startDate, endDate, apiBase, token, processName, clientName, userId])

  // Función para exportar como SVG (debe estar antes de los returns condicionales)
  const exportAsSVG = (): string | null => {
    if (!chartContainerRef.current) return null;
    
    const svgElement = chartContainerRef.current.querySelector('svg');
    if (!svgElement) return null;
    
    try {
      // Clonar el SVG para no modificar el original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Obtener dimensiones del SVG
      const width = svgElement.getAttribute('width') || 
                   svgElement.getBoundingClientRect().width || 
                   svgElement.clientWidth || 
                   800;
      const height = svgElement.getAttribute('height') || 
                    svgElement.getBoundingClientRect().height || 
                    svgElement.clientHeight || 
                    400;
      
      // Asegurar que el SVG tenga dimensiones explícitas
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      
      // Serializar el SVG
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgString)))}`;
    } catch (error) {
      console.error('Error exportando SVG:', error);
      return null;
    }
  };

  // Función para exportar como imagen (PNG/JPEG) (debe estar antes de los returns condicionales)
  const exportAsImage = async (): Promise<string | null> => {
    if (!chartContainerRef.current) return null;
    
    const svgElement = chartContainerRef.current.querySelector('svg');
    if (!svgElement) return null;
    
    try {
      // Obtener el SVG como string
      const svgData = exportAsSVG();
      if (!svgData) return null;
      
      // Crear una imagen desde el SVG
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            // Usar las dimensiones naturales de la imagen o valores por defecto
            canvas.width = img.naturalWidth || img.width || 800;
            canvas.height = img.naturalHeight || img.height || 400;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(null);
              return;
            }
            
            // Fondo blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Dibujar la imagen en el canvas
            ctx.drawImage(img, 0, 0);
            
            // Convertir a JPEG con buena calidad
            const dataURL = canvas.toDataURL('image/jpeg', 0.9);
            resolve(dataURL);
          } catch (error) {
            console.error('Error procesando imagen:', error);
            resolve(null);
          }
        };
        img.onerror = () => {
          console.error('Error cargando imagen SVG');
          resolve(null);
        };
        img.src = svgData;
      });
    } catch (error) {
      console.error('Error exportando gráfico como imagen:', error);
      return null;
    }
  };

  // Exponer métodos mediante ref (DEBE estar antes de los returns condicionales)
  useImperativeHandle(ref, () => ({
    exportAsImage,
    exportAsSVG,
  }));

  // Returns condicionales DESPUÉS de todos los hooks
  if (error) return null; // No mostrar nada cuando hay error
  if (loading) return <div>Cargando…</div>
  if (data.length === 0) return (
    <div className="text-center py-8">
      <div className="text-gray-400 mb-4">
        <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">No hay datos disponibles</h3>
      <p className="text-gray-500">
        No se encontraron mediciones para <strong>{variable}</strong> en el proceso/cliente seleccionado.
      </p>
    </div>
  );

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
        <div ref={chartContainerRef}>
          <ChartContainer config={chartConfig}>
            <LineChart
              data={data}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                label={{ value: `${variable} (${unidades})`, angle: -90, position: 'insideLeft' }}
              />
              <XAxis
                dataKey="fechaEtiqueta"
                interval={0}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={hideXAxisLabels ? false : undefined}
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
        </div>
      </CardContent>
     
    </Card>
  )
})

SensorTimeSeriesChart.displayName = "SensorTimeSeriesChart"