"use client"
import { Navigate } from "react-router-dom"
import { useUser } from "../context/UserContext"

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, user, isLoading } = useUser()

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && user?.puesto !== "admin") {
    return <Navigate to="/dashboard-manager" replace />
  }

  return children
}

export default ProtectedRoute
