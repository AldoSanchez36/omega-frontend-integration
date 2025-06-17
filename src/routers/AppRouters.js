import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { UserProvider } from "../context/UserContext"

// Importamos tus componentes existentes
import Login from "../screens/Login"
import RegisterScreen from "../screens/RegisterScreen"
import Home from "../screens/home"
import About from "../screens/about"
import Contact from "../screens/contact"
import Services from "../screens/services"
import ForgotPassword from "../screens/forgotpassword"
import Profile from "../screens/profile"
import Reporte from "../screens/Reporte"
import Reports from "../screens/Reports"
import DashboardManager from "../screens/dashboardmanager"
import ManagerDashboard from "../screens/ManagerDashboard"
import ParamManager from "../screens/param_manager"
import UsersManagement from "../screens/usersmanagement"
import FormularioDinamico from "../screens/formularioDinamico"

// Importamos las rutas protegidas existentes
import ProtectedRoute from "./ProtectedRoute"
import DashboardRoutes from "./DashboardRoutes"

export const AppRouter = () => {
  return (
    <UserProvider>
      <Router>
        <Routes>
          {/* Rutas públicas */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/services" element={<Services />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterScreen />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Rutas protegidas */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reporte"
            element={
              <ProtectedRoute>
                <Reporte />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard-manager"
            element={
              <ProtectedRoute>
                <DashboardManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manager-dashboard"
            element={
              <ProtectedRoute>
                <ManagerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/param-manager"
            element={
              <ProtectedRoute adminOnly>
                <ParamManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/users-management"
            element={
              <ProtectedRoute adminOnly>
                <UsersManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/formulario-dinamico"
            element={
              <ProtectedRoute>
                <FormularioDinamico />
              </ProtectedRoute>
            }
          />

          {/* Rutas del dashboard (si las tienes) */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <DashboardRoutes />
              </ProtectedRoute>
            }
          />

          {/* Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </UserProvider>
  )
}
