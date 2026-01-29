import React from "react"
import "./buttons-cards.css"

interface QuickActionsProps {
  handleNewReport: () => void
  handleNewSystem: () => void
}

const QuickActions: React.FC<QuickActionsProps> = ({ handleNewReport, handleNewSystem }) => (
  <div className="row mb-4">
    <div className="col-12">
      <div className="card shadow-sm border-0">
        <div className="card-header bg-gradient-primary text-white border-0">
          <h5 className="card-title mb-0 d-flex align-items-center">
            <i className="material-icons me-2">rocket_launch</i>
            Acciones Rápidas
          </h5>
        </div>
        <div className="card-body p-4">
          <div className="row g-3">
            {/* Nuevo Reporte */}
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="action-card h-100" onClick={handleNewReport}>
                <div className="action-card-body">
                  <div className="action-icon bg-primary">
                    <i className="material-icons">assessment</i>
                  </div>
                  <h6 className="action-title">Reportes</h6>
                  <p className="action-description">Crear reportes personalizados</p>
                </div>
              </div>
            </div>
            {/* Nueva Planta o Sistema */}
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="action-card h-100" onClick={handleNewSystem}>
                <div className="action-card-body">
                  <div className="action-icon bg-success">
                    <i className="material-icons">factory</i>
                  </div>
                  <h6 className="action-title">Nueva Planta</h6>
                  <p className="action-description">Agregar plantas o sistemas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)

export { QuickActions }
export default QuickActions
