import React from "react"
import "./buttons-cards.css"

interface QuickActionsProps {
  handleNewReport?: () => void
}

const QuickActions: React.FC<QuickActionsProps> = ({ handleNewReport }) => (
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
            {/* Tabla de Reportes */}
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="action-card h-100" onClick={handleNewReport}>
                <div className="action-card-body">
                  <div className="action-icon bg-primary">
                    <i className="material-icons">table_view</i>
                  </div>
                  <h6 className="action-title">Tabla de Reportes</h6>
                  <p className="action-description">Ver y gestionar tus reportes</p>
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
