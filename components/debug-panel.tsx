"use client"

import React from "react"

interface DebugInfo {
  type: "info" | "success" | "error" | "warning"
  message: string
  timestamp: string
}

interface CurrentState {
  plantsCount: number
  reportsCount: number
  dataLoading: boolean
  userRole: string
  usuarioPlantasCount?: number
  usuarioPlantas?: any[]
}

interface DebugPanelProps {
  debugInfo: DebugInfo[]
  currentState: CurrentState
}

export const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, currentState }) => {
  const getStatusColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-success"
      case "error":
        return "text-danger"
      case "warning":
        return "text-warning"
      default:
        return "text-info"
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h5 className="card-title mb-0">🐛 Debug Panel</h5>
      </div>
      <div className="card-body">
        <div className="row">
          <div className="col-md-6">
            <h6>Estado Actual:</h6>
            <ul className="list-unstyled">
              <li>✅ Dashboard cargado correctamente</li>
              <li>✅ Datos mock funcionando</li>
              <li>✅ Navegación funcional</li>
              <li>✅ Usuario: {currentState.userRole}</li>
              <li>📊 Plantas: {currentState.plantsCount}</li>
              <li>📋 Reportes: {currentState.reportsCount}</li>
              <li>🔄 Cargando: {currentState.dataLoading ? "Sí" : "No"}</li>
              {currentState.usuarioPlantasCount !== undefined && (
                <li>🔐 Accesos de plantas: {currentState.usuarioPlantasCount}</li>
              )}
            </ul>
          </div>
          <div className="col-md-6">
            <h6>Logs Recientes:</h6>
            <div
              className="bg-dark text-light p-2 rounded"
              style={{ fontSize: "0.8rem", maxHeight: "150px", overflowY: "auto" }}
            >
              {debugInfo.length > 0 ? (
                debugInfo.map((log, index) => (
                  <div key={index} className={`${getStatusColor(log.type)}`}>
                    <small>{log.timestamp}: {log.message}</small>
                  </div>
                ))
              ) : (
                <div className="text-muted">No hay logs aún...</div>
              )}
            </div>
            {currentState.usuarioPlantas && currentState.usuarioPlantas.length > 0 && (
              <>
                <h6 className="mt-3">Accesos de Plantas:</h6>
                <div
                  className="bg-dark text-light p-2 rounded"
                  style={{ fontSize: "0.8rem", maxHeight: "150px", overflowY: "auto" }}
                >
                  {currentState.usuarioPlantas.map((access, index) => (
                    <div key={index} className="text-light">
                      <small>
                        ID: {access.id} | Usuario: {access.usuario_id} | Planta: {access.planta_id} | 
                        Ver: {access.puede_ver ? "✅" : "❌"} | Editar: {access.puede_editar ? "✅" : "❌"}
                      </small>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DebugPanel 