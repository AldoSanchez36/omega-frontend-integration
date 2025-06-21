"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Navbar } from "@/components/navbar"
import { DebugPanel } from "@/components/debug-panel"
import { useDebugLogger } from "@/hooks/useDebugLogger"
import type { User } from "@/types"

export default function Settings() {
  const { debugInfo, addDebugLog } = useDebugLogger()

  const [userData, setUserData] = useState({
    name: "",
    email: "",
    role: "",
    department: "",
    phone: "",
    bio: "",
    preferences: {
      notifications: true,
      darkMode: false,
      language: "es",
    },
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const mockUser: User = {
    id: "1",
    name: "Admin User",
    email: "admin@omega.com",
    role: "admin",
  }

  useEffect(() => {
    const loadUserData = async () => {
      addDebugLog("info", "Cargando datos del usuario")

      try {
        // Mock user data - replace with real fetch call
        /*
        const response = await fetch('/api/user/profile')
        const userProfile = await response.json()
        setUserData(userProfile)
        */

        const mockUserData = {
          name: "Admin User",
          email: "admin@omega.com",
          role: "admin",
          department: "Sistemas",
          phone: "+1 234 567 8900",
          bio: "Administrador del sistema Omega Dashboard con experiencia en monitoreo industrial.",
          preferences: {
            notifications: true,
            darkMode: false,
            language: "es",
          },
        }

        setUserData(mockUserData)
        addDebugLog("success", "Datos del usuario cargados exitosamente")
      } catch (error) {
        addDebugLog("error", `Error cargando datos del usuario: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [addDebugLog])

  const handleInputChange = (field: string, value: string) => {
    setUserData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handlePreferenceChange = (preference: string, value: boolean | string) => {
    setUserData((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        [preference]: value,
      },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    addDebugLog("info", "Guardando configuración del usuario")

    try {
      // Mock save - replace with real API call
      /*
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      })
      
      if (!response.ok) {
        throw new Error('Error updating user profile')
      }
      */

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      addDebugLog("success", "Configuración guardada exitosamente")
    } catch (error) {
      addDebugLog("error", `Error guardando configuración: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "operator":
        return "bg-blue-100 text-blue-800"
      case "viewer":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={mockUser} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={mockUser} />

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Gestiona tu perfil y preferencias del sistema</p>
        </div>

        {/* Profile Overview */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Perfil de Usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {userData.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h3 className="text-xl font-semibold">{userData.name}</h3>
                <p className="text-gray-600">{userData.email}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge className={getRoleBadgeColor(userData.role)}>{userData.role.toUpperCase()}</Badge>
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-500">{userData.department}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre Completo</label>
                <Input
                  value={userData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Tu nombre completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <Input
                  type="email"
                  value={userData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Departamento</label>
                <Input
                  value={userData.department}
                  onChange={(e) => handleInputChange("department", e.target.value)}
                  placeholder="Tu departamento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Teléfono</label>
                <Input
                  value={userData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">Biografía</label>
                <Textarea
                  value={userData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Preferences */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preferencias del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notificaciones</h4>
                  <p className="text-sm text-gray-600">Recibir notificaciones del sistema</p>
                </div>
                <Button
                  variant={userData.preferences.notifications ? "default" : "outline"}
                  onClick={() => handlePreferenceChange("notifications", !userData.preferences.notifications)}
                >
                  {userData.preferences.notifications ? "Activado" : "Desactivado"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Modo Oscuro</h4>
                  <p className="text-sm text-gray-600">Cambiar a tema oscuro</p>
                </div>
                <Button
                  variant={userData.preferences.darkMode ? "default" : "outline"}
                  onClick={() => handlePreferenceChange("darkMode", !userData.preferences.darkMode)}
                >
                  {userData.preferences.darkMode ? "Activado" : "Desactivado"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Idioma</h4>
                  <p className="text-sm text-gray-600">Idioma de la interfaz</p>
                </div>
                <select
                  className="px-3 py-2 border rounded-md"
                  value={userData.preferences.language}
                  onChange={(e) => handlePreferenceChange("language", e.target.value)}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                  <option value="pt">Português</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                🔒 Cambiar Contraseña
              </Button>
              <Button variant="outline" className="w-full">
                📱 Configurar Autenticación de Dos Factores
              </Button>
              <Button variant="outline" className="w-full">
                📋 Ver Sesiones Activas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Guardando...
                  </>
                ) : (
                  "💾 Guardar Configuración"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <DebugPanel
          debugInfo={debugInfo}
          currentState={{
            userName: userData.name,
            userRole: userData.role,
            notifications: userData.preferences.notifications,
            darkMode: userData.preferences.darkMode,
            language: userData.preferences.language,
          }}
        />
      </div>
    </div>
  )
}
