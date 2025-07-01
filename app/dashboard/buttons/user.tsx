import React from "react"

interface QuickActionsProps {
  handleNewReport: () => void
  handleNewPlant: () => void
  handleNewSystem: () => void
  handleNewVariable: () => void
}

const QuickActions: React.FC<QuickActionsProps> = ({ handleNewReport, handleNewPlant, handleNewSystem, handleNewVariable }) => (
  <div className="row mb-4">
    <div className="col-12">
      <div className="card">
        <div className="card-header">
          <h5 className="card-title mb-0">🚀 Acciones Rápidas</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={handleNewReport}
              >
                <i className="material-icons me-2">add</i>
                Nuevo Reporte
              </button>
            </div>
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-success w-100"
                onClick={handleNewPlant}
              >
                <i className="material-icons me-2">factory</i>
                Planta
              </button>
            </div>
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-info w-100"
                onClick={handleNewSystem}
              >
                <i className="material-icons me-2">settings</i>
                Sistema
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  </div>
)

export { QuickActions }
export default QuickActions
