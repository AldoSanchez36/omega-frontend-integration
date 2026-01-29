import React from "react";

interface StatsCardsProps {
  dashboardResumen: {
    plantas: number;
    procesos: number;
    variables: number;
    reportes: number;
  } | null;
  userRole?: "admin" | "user" | "client" | "guest" | "analista";
  totalHistoricos?: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ dashboardResumen, userRole, totalHistoricos }) => (
  <div className="row mb-4">
    <div className="col-md-3">
      <div className="card bg-primary text-white">
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="card-title">Plantas</h5>
              <h2 className="mb-0">{dashboardResumen ? dashboardResumen.plantas : "..."}</h2>
            </div>
            <div className="align-self-center">
              <i className="material-icons" style={{ fontSize: "3rem" }}>
                factory
              </i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="col-md-3">
      <div className="card bg-success text-white">
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="card-title">Reportes</h5>
              <h2 className="mb-0">{dashboardResumen ? dashboardResumen.reportes : "..."}</h2>
            </div>
            <div className="align-self-center">
              <i className="material-icons" style={{ fontSize: "3rem" }}>
                assessment
              </i>
            </div>
          </div>
        </div>
      </div>
    </div>
    {/* Solo mostrar Gestión Parámetros si el usuario NO es cliente */}
    {userRole !== "client" && (
      <>
        <div className="col-md-3">
          <div className="card bg-warning text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title">Gestión Parámetros</h5>
                  <h2 className="mb-0">{dashboardResumen ? dashboardResumen.variables : "..."}</h2>
                </div>
                <div className="align-self-center">
                  <i className="material-icons" style={{ fontSize: "3rem" }}>
                    analytics
                  </i>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body">
              <div className="d-flex justify-content-between">
                <div>
                  <h5 className="card-title">Históricos</h5>
                  <h2 className="mb-0">{totalHistoricos !== undefined ? totalHistoricos : "..."}</h2>
                </div>
                <div className="align-self-center">
                  <i className="material-icons" style={{ fontSize: "3rem" }}>
                    timeline
                  </i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
);

export default StatsCards; 