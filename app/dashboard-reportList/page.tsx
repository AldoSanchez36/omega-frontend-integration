"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Navbar } from "@/components/Navbar"

interface ReportePDF {
  id: number;
  nombre: string;
  fecha_creacion: string; // Asegúrate de que tu backend devuelva este campo
  url: string;
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
      try {
        const response = await axios.get("/api/documentos-pdf");
        // Suponiendo que tu backend devuelve un array de reportes
        const data = response.data;

        // Ordenar de más nuevo a más viejo y limitar a 12
        const ordenados = data.sort((a: ReportePDF, b: ReportePDF) =>
          new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime()
        ).slice(0, 12);

        setReportes(ordenados);
      } catch (error) {
        console.error("Error fetching reportes:", error);
      } finally {
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
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Fecha de Creación</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  Cargando reportes...
                </td>
              </tr>
            ) : filtrados.length > 0 ? (
              filtrados.map(reporte => (
                <tr
                  key={reporte.id}
                  className="hover:bg-gray-50 transition border-b last:border-b-0"
                >
                  <td className="px-6 py-4 text-gray-900">{reporte.id}</td>
                  <td className="px-6 py-4">{reporte.nombre}</td>
                  <td className="px-6 py-4">{new Date(reporte.fecha_creacion).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <a
                      href={reporte.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Ver PDF
                    </a>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
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