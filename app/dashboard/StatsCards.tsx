import React from "react";

interface StatsCardsProps {
  dashboardResumen: {
    plantas: number;
    procesos: number;
    variables: number;
    reportes: number;
  } | null;
}

const StatsCards: React.FC<StatsCardsProps> = ({ dashboardResumen }) => (
  <div className="row mb-4">
    <div className="col-md-3">
      <div className="card text-white" style={{background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="card-title" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)'}}>Plantas</h5>
              <h2 className="mb-0" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>{dashboardResumen ? dashboardResumen.plantas : "..."}</h2>
            </div>
            <div className="align-self-center">
              <i className="material-icons" style={{ fontSize: "3rem", filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}>
                factory
              </i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="col-md-3">
      <div className="card text-white" style={{background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="card-title" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)'}}>Reportes</h5>
              <h2 className="mb-0" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>{dashboardResumen ? dashboardResumen.reportes : "..."}</h2>
            </div>
            <div className="align-self-center">
              <i className="material-icons" style={{ fontSize: "3rem", filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}>
                assessment
              </i>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div className="col-md-3">
      <div className="card text-white" style={{background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)', border: 'none', borderRadius: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'}}>
        <div className="card-body">
          <div className="d-flex justify-content-between">
            <div>
              <h5 className="card-title" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.3)', color: '#333'}}>Gestión Parámetros</h5>
              <h2 className="mb-0" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)', color: '#333'}}>{dashboardResumen ? dashboardResumen.variables : "..."}</h2>
            </div>
            <div className="align-self-center">
              <i className="material-icons" style={{ fontSize: "3rem", filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))', color: '#333' }}>
                analytics
              </i>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default StatsCards; 