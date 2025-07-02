"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Navbar } from "@/components/Navbar"
import { Eye, Download } from "lucide-react";

interface ReportePDF {
  id: number;
  nombre: string;
  fecha_creacion: string; // Asegúrate de que tu backend devuelva este campo
  url: string;
  planta: string;
  sistema: string;
  estado: string;
}

export default function ReportList() {
  const [reportes, setReportes] = useState<ReportePDF[]>([]);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<"admin" | "user" | "client">("client")
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('omega_user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUserRole(userData.puesto || "user")
      }
    }
    const fetchReportes = async () => {
      let data: ReportePDF[] = [];
      try {
        const response = await axios.get("http://localhost:4000/api/documentos-pdf");
        data = response.data;
      } catch (error) {
        console.error("Error fetching reportes:", error);
      } finally {
        data.push({
          id: 9999,
          nombre: "Reporte de prueba",
          planta: "Planta Norte",
          sistema: "Sistema de Temperatura",
          estado: "Completado",
          fecha_creacion: new Date().toISOString().split('T')[0], // YYYY-MM-DD only
          url: "/dummy.pdf"
        });

        const ordenados = data.sort((a: ReportePDF, b: ReportePDF) =>
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
        ).slice(0, 12);

        setReportes(ordenados);
        setLoading(false);
      }
    };

    fetchReportes();
  }, []);

  const filtrados = fechaFiltro
    ? reportes.filter(r => r.fecha_creacion.startsWith(fechaFiltro))
    : reportes;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <Navbar role={userRole} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes PDF Generados</h1>
          <p className="text-gray-500 text-sm mt-1">Con filtrado por fecha</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <input
            type="date"
            value={fechaFiltro}
            onChange={e => setFechaFiltro(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 transition"
            onClick={() => window.location.reload()}
          >
            Actualizar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Planta</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Sistema</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Estado</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  Cargando reportes...
                </td>
              </tr>
            ) : filtrados.length > 0 ? (
              filtrados.map(reporte => (
                <tr key={reporte.id} className="border-b hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{reporte.nombre}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      {reporte.planta}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-cyan-500 text-white text-xs px-2 py-1 rounded-full">
                      {reporte.sistema}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      {reporte.estado}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {new Date(reporte.fecha_creacion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 flex gap-2">
                    <button
                      onClick={() => window.open(reporte.url, '_blank')}
                      className="border border-gray-300 p-2 rounded hover:bg-gray-100"
                      title="Ver PDF"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => window.open(`/api/documentos-pdf/${reporte.id}`, '_blank')}
                      className="border border-gray-300 p-2 rounded hover:bg-gray-100"
                      title="Descargar PDF"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                  No hay reportes para la fecha seleccionada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}