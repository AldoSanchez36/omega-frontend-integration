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

export interface MedicionFromReporte {
  fecha: string
  sistema: string
  valor: number
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
  /** Si se proporciona, se usan estos datos (p. ej. de reportes.datos) en lugar de la API de mediciones */
  medicionesFromReportes?: MedicionFromReporte[] | null
}

export interface ChartExportRef {
  exportAsImage: () => Promise<string | null>
  exportAsSVG: () => string | null
}

export const SensorTimeSeriesChart = forwardRef<ChartExportRef, Props>(({
  variable, startDate, endDate, apiBase, unidades, hideXAxisLabels, processName, clientName, userId, medicionesFromReportes
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

  // Formatear fecha para etiqueta del eje X sin desfase por zona horaria (Mexico)
  const formatDateLabel = (fechaStr: string): string => {
    const m = String(fechaStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const [, y, mo, d] = m;
      const date = new Date(parseInt(y, 10), parseInt(mo, 10) - 1, parseInt(d, 10));
      return date.toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" });
    }
    return new Date(fechaStr).toLocaleDateString("es-MX", { day: "2-digit", month: "short", timeZone: "America/Mexico_City" });
  }

  useEffect(() => {
    const normalizeDate = (dateStr: string): string => {
      if (!dateStr) return ''
      if (dateStr.includes('T')) return dateStr.split('T')[0]
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
      const date = new Date(dateStr)
      return !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : dateStr
    }

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const startDateNormalized = normalizeDate(startDate)
        const endDateNormalized = normalizeDate(endDate)

        // Si se pasan datos desde reportes.datos, usarlos en lugar de la API de mediciones
        // Si medicionesFromReportes está definido (incluso si es array vacío), usar solo esos datos y no hacer llamadas a API
        // Esto evita llamadas 404 innecesarias cuando los datos vienen de reportes.datos
        if (medicionesFromReportes !== undefined && medicionesFromReportes !== null && Array.isArray(medicionesFromReportes)) {
          const list = medicionesFromReportes;
          const filtered = list.filter(m => {
            const fechaNorm = normalizeDate(m.fecha)
            return fechaNorm >= startDateNormalized && fechaNorm <= endDateNormalized
          })
          const normalizeSistema = (s: string) => (s || "").trim()
          const sensorSet = new Set(filtered.map(m => normalizeSistema(m.sistema)).filter(Boolean))
          const sensorList = Array.from(sensorSet).sort()
          const dateSet = new Set(filtered.map(m => normalizeDate(m.fecha)))
          const dateList = Array.from(dateSet).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
          const pivotData: PivotData[] = dateList.map(fecha => {
            const row: PivotData = {
              fecha,
              fechaEtiqueta: formatDateLabel(fecha)
            }
            sensorList.forEach(sensor => {
              const meas = filtered.find(m => normalizeDate(m.fecha) === fecha && normalizeSistema(m.sistema) === sensor)
              row[sensor] = meas ? meas.valor : undefined
            })
            return row
          })
          setSensors(sensorList)
          setData(pivotData)
          setLoading(false)
          // IMPORTANTE: Si medicionesFromReportes está definido (incluso array vacío), NO hacer llamadas a API de mediciones
          // Los datos vienen SOLO de reportes.datos (tabla reportes), NO de tabla mediciones
          return
        }

        // Solo hacer llamadas a API si medicionesFromReportes NO fue proporcionado
        // Si fue proporcionado (incluso como array vacío), ya se procesó arriba y se hizo return
        let finalData: RawMeasurement[] = [];
        
        // Lógica de cascada: primero verificar por cliente, luego por proceso
        if (clientName) {
          // 1. Primera llamada: MEASUREMENTS_BY_VARIABLE_AND_CLIENT
          const clientUrl = `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_CLIENT(variable, clientName)}`;
          const clientRes = await fetch(
            clientUrl,
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
          const userProcessUrl = `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_USER_AND_PROCESS(variable, userId, processName)}`;
          const userProcessRes = await fetch(
            userProcessUrl,
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
          const processUrl = `${apiBase}${API_ENDPOINTS.MEASUREMENTS_BY_VARIABLE_AND_PROCESS(variable, processName)}`;
          const processRes = await fetch(
            processUrl,
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
            }
          }
        }
        
        // Si no hay datos por cliente ni por proceso, NO mostrar datos generales
        // Solo mostrar datos específicos para el usuario/proceso seleccionado
        if (finalData.length === 0) {
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

         const normalizeSistema = (s: string) => (s || "").trim();
         // Detectar sensores únicos (nombres normalizados para evitar duplicados por espacios)
         const sensorSet = new Set(filtered.map(m => normalizeSistema(m.sistema as string)).filter(Boolean));
         const sensorList = Array.from(sensorSet).sort();

         // Fechas únicas normalizadas (evita dos filas para el mismo día si la API devuelve formatos distintos)
         const dateSet = new Set(filtered.map(m => normalizeDate(m.fecha)));
         const dateList = Array.from(dateSet).sort(
           (a, b) => new Date(a).getTime() - new Date(b).getTime()
         );

         // Pivotar datos: cada fecha un objeto con valores por sensor
         const pivotData: PivotData[] = dateList.map(fecha => {
           const row: PivotData = {
             fecha,
             fechaEtiqueta: formatDateLabel(fecha)
           };
           sensorList.forEach(sensor => {
             const meas = filtered.find(m => normalizeDate(m.fecha) === fecha && normalizeSistema(m.sistema as string) === sensor);
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
  }, [variable, startDate, endDate, apiBase, token, processName, clientName, userId, medicionesFromReportes])

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

  // Calcular intervalo para el eje X basado en el número de datos
  const calculateXAxisInterval = (dataLength: number): number | "preserveStartEnd" => {
    if (dataLength <= 15) {
      // Para pocos datos, mostrar todos
      return 0;
    } else if (dataLength <= 30) {
      // Para datos intermedios, mostrar cada 2
      return 1;
    } else if (dataLength <= 50) {
      // Para 40-46 datos, mostrar aproximadamente 8-12 etiquetas
      // Intervalo de 4-5 para tener ~10 etiquetas visibles
      return Math.floor(dataLength / 10);
    } else {
      // Para muchos datos, usar preserveStartEnd para mostrar primera y última
      return "preserveStartEnd";
    }
  };

  const xAxisInterval = calculateXAxisInterval(data.length);

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
        <div ref={chartContainerRef} className="w-full" style={{ height: '384px' }}>
          <ChartContainer config={chartConfig} className="h-full w-full">
            <LineChart
              data={data}
              margin={{ left: 12, right: 12 }}
            >
              <CartesianGrid vertical={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                // Sin label - el nombre del parámetro y la unidad ya vienen en el título del gráfico
                tickFormatter={(value) => {
                  if (typeof value === 'number') {
                    return value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 10 });
                  }
                  return String(value);
                }}
                tick={{ 
                  fill: '#000000', // Negro sólido para los números del eje Y
                  fontWeight: 'bold', // Negrita
                  fontSize: '11px'
                }}
              />
              <XAxis
                dataKey="fechaEtiqueta"
                interval={hideXAxisLabels ? undefined : xAxisInterval}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={hideXAxisLabels ? false : {
                  fill: '#000000', // Negro sólido para las fechas del eje X
                  fontWeight: 'bold', // Negrita
                  fontSize: '11px'
                }}
                angle={data.length > 30 ? -45 : 0}
                textAnchor={data.length > 30 ? "end" : "middle"}
                height={data.length > 30 ? 60 : 30}
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