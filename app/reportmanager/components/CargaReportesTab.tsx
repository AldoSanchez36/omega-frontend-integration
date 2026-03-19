"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants";

interface Empresa {
  id: string;
  nombre: string;
}

interface Plant {
  id: string;
  nombre: string;
  dirigido_a?: string;
  mensaje_cliente?: string;
}

interface User {
  id: string;
  username: string;
  email?: string;
  puesto?: string;
}

interface System {
  id: string;
  nombre: string;
}

interface CargaReportesTabProps {
  token: string | null;
  selectedEmpresa: Empresa | null;
  selectedPlant: Plant | null;
  currentUser: User | null;
  /** Sistemas ya registrados en la planta; solo estas columnas se consideran "sistema" en el CSV */
  systems: System[];
}

// Parsea una línea CSV respetando campos entre comillas
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  while (i <= line.length) {
    if (i < line.length && line[i] === '"') {
      i++;
      let field = "";
      while (i < line.length) {
        if (line[i] === '"') {
          i++;
          if (i < line.length && line[i] === '"') {
            field += '"';
            i++;
          } else break;
        } else {
          field += line[i++];
        }
      }
      fields.push(field.replace(/\r?\n/g, " ").trim());
      while (i < line.length && (line[i] === " " || line[i] === "\t")) i++;
      if (line[i] === ",") i++;
    } else {
      if (i >= line.length) break;
      let field = "";
      while (i < line.length && line[i] !== ",") field += line[i++];
      fields.push(field.trim());
      if (line[i] === ",") i++;
    }
  }
  return fields;
}

// Une líneas que pertenecen a la misma fila (comillas con salto de línea)
function splitCSVRows(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const rows: string[] = [];
  let current = "";
  for (const line of lines) {
    current += (current ? "\n" : "") + line;
    const quoteCount = (current.match(/"/g) || []).length;
    if (quoteCount % 2 === 0) {
      rows.push(current);
      current = "";
    }
  }
  if (current) rows.push(current);
  return rows;
}

const MESES_ES: Record<string, string> = {
  ene: "01", feb: "02", mar: "03", abr: "04", may: "05", jun: "06",
  jul: "07", ago: "08", sep: "09", oct: "10", nov: "11", dic: "12",
};

function parseFechaSpanish(s: string): string {
  const raw = String(s).trim();
  if (!raw) return new Date().toISOString().split("T")[0];
  const m = raw.match(/^(\d{1,2})[-./](\w{3})[-./](\d{2,4})$/i);
  if (m) {
    const [, d, mes, y] = m;
    const mesLow = mes.toLowerCase();
    const mesNum = MESES_ES[mesLow] ?? "01";
    const day = d.padStart(2, "0");
    let year = parseInt(y, 10);
    if (year < 100) year += year < 50 ? 2000 : 1900;
    return `${year}-${mesNum}-${day}`;
  }
  return new Date().toISOString().split("T")[0];
}

function cleanParam(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .trim()
    .replace(/\.\d+$/, "");
}

function detectUnidad(param: string): string {
  const p = param.toLowerCase().trim();
  if (p.includes("ntu")) return "NTU";
  if (p.includes("turbidez")) return "NTU";
  if (p.includes("ph")) return "";
  if (p.includes("conduct")) return "µs/cm";
  if (p.includes("resist") || p.includes("resisitividad")) return "MΩ∙cm";
  return "ppm";
}

function cleanNumero(val: unknown): number {
  if (val === null || val === undefined) return 0;
  let s = String(val)
    .replace(/\s/g, "")
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
    .replace(",", "");
  s = s.replace(/^[^\d.-]*|[^\d.eE-]*$/g, "").trim();
  if (!s) return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// Si la fila tiene más campos que la cabecera (p. ej. "1,060.80" partido en dos), fusionar pares numéricos
function alignRowToHeader(
  fields: string[],
  headerLength: number
): string[] {
  if (fields.length <= headerLength) return fields;
  let out = [...fields];
  while (out.length > headerLength) {
    let merged = false;
    for (let i = 0; i < out.length - 1 && out.length > headerLength; i++) {
      const a = out[i].replace(/,/g, "").trim();
      const b = out[i + 1].replace(/,/g, "").trim();
      const aIsInt = /^\d+$/.test(a);
      const bIsNum = /^\d+\.?\d*$/.test(b) || /^\d*\.\d+$/.test(b);
      if (aIsInt && bIsNum && a.length <= 4) {
        const combined = b.includes(".") ? `${a}${b}` : `${a}${b}`;
        if (Number.isFinite(parseFloat(combined))) {
          out = [...out.slice(0, i), combined, ...out.slice(i + 2)];
          merged = true;
          break;
        }
      }
    }
    if (!merged) break;
  }
  return out.slice(0, headerLength);
}

function normalizeForMatch(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

export default function CargaReportesTab({
  token,
  selectedEmpresa,
  selectedPlant,
  currentUser,
  systems,
}: CargaReportesTabProps) {
  const [fileName, setFileName] = useState<string>("");
  const [parsedReportes, setParsedReportes] = useState<Record<string, unknown>[]>([]);
  const [parseError, setParseError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: number; fail: number; error?: string } | null>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      setParseError("");
      setParsedReportes([]);
      setSaveResult(null);
      if (!file) return;

      if (!selectedEmpresa || !selectedPlant) {
        setParseError("Selecciona primero Empresa y Planta en las pestañas correspondientes.");
        return;
      }
      if (!currentUser) {
        setParseError("No hay usuario en sesión.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        let text = (reader.result as string) || "";
        text = text.replace(/^\uFEFF/, "");
        const rows = splitCSVRows(text);
        if (rows.length < 2) {
          setParseError("El archivo no tiene filas de datos (debe tener cabecera y al menos una fila).");
          return;
        }
        // La primera fila (row 0) es siempre la cabecera; los reportes empiezan en la fila 1
        const headerRow = rows[0];
        const dataStartIdx = 1;
        const headerFields = parseCSVLine(headerRow);
        const headers = headerFields.map((h) => h.trim().replace(/[\uFEFF\u200B-\u200D\u2060]/g, ""));

        const fechaColIdx = headers.findIndex(
          (h) => h.toLowerCase().startsWith("fecha") || h.toLowerCase() === "date"
        );
        const fechaCol = fechaColIdx >= 0 ? fechaColIdx : 0;

        const comentariosColIdx = headers.findIndex(
          (h) => /^comentarios?$/i.test(h.trim()) || /^observaciones$/i.test(h.trim()) || h.toLowerCase().trim() === "comentarios globales"
        );

        const systemCols: { systemName: string; paramName: string; colIndex: number }[] = [];
        let currentSystem = "";
        const normalizedSystemNames = systems.map((s) => ({
          normalized: normalizeForMatch(s.nombre),
          canonical: s.nombre,
        }));
        headers.forEach((h, colIndex) => {
          const trimmed = h.trim();
          const isFecha = trimmed.toLowerCase().startsWith("fecha") || trimmed.toLowerCase() === "date";
          const matchedSystem = !isFecha
            ? normalizedSystemNames.find((s) => normalizeForMatch(trimmed) === s.normalized)
            : null;
          if (matchedSystem) {
            currentSystem = matchedSystem.canonical;
            return;
          }
          if (currentSystem && trimmed) {
            const paramName = cleanParam(trimmed);
            if (paramName) systemCols.push({ systemName: currentSystem, paramName, colIndex });
          }
        });

        const reportes: Record<string, unknown>[] = [];
        for (let r = dataStartIdx; r < rows.length; r++) {
          let fields = parseCSVLine(rows[r]);
          fields = alignRowToHeader(fields, headers.length);
          const fechaRaw = fields[fechaCol];
          const fechaIso = parseFechaSpanish(fechaRaw ?? "");
          const comentariosRaw = comentariosColIdx >= 0 ? (fields[comentariosColIdx] ?? "").trim() : "";
          const comentariosTexto = typeof comentariosRaw === "string" ? comentariosRaw : String(comentariosRaw);

          const parameters: Record<string, Record<string, { valor: number; unidad: string; calculado: boolean; valorOriginal: number }>> = {};
          systemCols.forEach(({ systemName, paramName, colIndex }) => {
            if (!parameters[systemName]) parameters[systemName] = {};
            const raw = fields[colIndex];
            const valor = cleanNumero(raw);
            const unidad = detectUnidad(paramName);
            parameters[systemName][paramName] = {
              valor,
              unidad,
              calculado: false,
              valorOriginal: valor,
            };
          });

          const empresaId = selectedEmpresa.id;
          const plantPayload = {
            id: selectedPlant.id,
            nombre: selectedPlant.nombre,
            systemName: Object.keys(parameters).length > 1 ? "Todos los sistemas" : Object.keys(parameters)[0] || "",
            mensaje_cliente: selectedPlant.mensaje_cliente ?? null,
            dirigido_a: selectedPlant.dirigido_a ?? null,
          };
          const userPayload = {
            id: currentUser.id,
            username: currentUser.username ?? "",
            email: currentUser.email ?? "",
            puesto: currentUser.puesto ?? "",
            empresa_id: empresaId,
          };
          reportes.push({
            user: userPayload,
            fecha: fechaIso,
            plant: plantPayload,
            nombre: `${selectedPlant.nombre} - ${fechaIso}`,
            parameters,
            comentarios: comentariosTexto,
            generatedDate: new Date().toISOString(),
            parameterComments: {},
            variablesTolerancia: {},
            planta_id: selectedPlant.id,
            usuario_id: currentUser.id,
            empresa_id: empresaId,
          });
        }
        setFileName(file.name);
        setParsedReportes(reportes);
      };
      reader.onerror = () => setParseError("Error al leer el archivo.");
      reader.readAsText(file, "utf-8");
    },
    [selectedEmpresa, selectedPlant, currentUser, systems]
  );

  const handleGuardar = useCallback(async () => {
    if (!token || parsedReportes.length === 0) return;
    setIsSaving(true);
    setSaveResult(null);
    let ok = 0;
    let fail = 0;
    let lastError: string | undefined;
    const endpoint = `${API_BASE_URL}${API_ENDPOINTS.REPORTS}`;
    for (const payload of parsedReportes) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) ok++;
        else {
          fail++;
          const data = await res.json().catch(() => ({}));
          lastError = data?.msg || data?.message || res.statusText;
        }
      } catch (e) {
        fail++;
        lastError = e instanceof Error ? e.message : String(e);
      }
    }
    setSaveResult({ ok, fail, error: lastError });
    setIsSaving(false);
    if (fail === 0) setParsedReportes([]);
  }, [token, parsedReportes]);

  const canSave = Boolean(token && selectedEmpresa && selectedPlant && currentUser && parsedReportes.length > 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">Carga de reportes desde CSV</h3>
      {(!selectedEmpresa || !selectedPlant) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          Selecciona primero <strong>Empresa</strong> y <strong>Planta</strong> en las pestañas correspondientes.
        </div>
      )}
      {selectedPlant && systems.length === 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          La planta no tiene sistemas cargados. Ve a la pestaña <strong>Procesos</strong> para que se carguen los sistemas; las columnas del CSV se asociarán solo a esos sistemas registrados.
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Archivo CSV (formato Cryoinfra: Fecha + sistemas por columnas)</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-gray-100 file:text-gray-700"
        />
      </div>
      {parseError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{parseError}</div>
      )}
      {parsedReportes.length > 0 && (
        <>
          <p className="text-gray-700">
            <strong>{parsedReportes.length}</strong> reporte(s) listos para guardar
            {fileName && ` (${fileName})`}.
          </p>
          <Button
            onClick={handleGuardar}
            disabled={!canSave || isSaving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isSaving ? "Guardando…" : "Guardar reportes"}
          </Button>
        </>
      )}
      {saveResult && (
        <div className={`p-4 rounded-lg border text-sm ${saveResult.fail > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          Guardados: <strong>{saveResult.ok}</strong>
          {saveResult.fail > 0 && (
            <> — Errores: <strong>{saveResult.fail}</strong>{saveResult.error && ` (${saveResult.error})`}</>
          )}
        </div>
      )}
    </div>
  );
}
