"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navbar } from "@/components/Navbar"

// Define types locally to resolve import issue
interface Client {
  id: string
  name: string
  email: string
  company: string
}

type UserRole = "admin" | "user" | "client" | "guest";

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export default function AgregarPlanta() {
  const router = useRouter()

  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string>("")
  const [plantData, setPlantData] = useState({
    name: "",
    location: "",
    description: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
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
    const loadClients = async () => {
      try {
        // Mock data - replace with real fetch call
        /*
        const response = await fetch('/api/clients')
        const clientsData = await response.json()
        setClients(clientsData)
        */

        const mockClients: Client[] = [
          {
            id: "1",
            name: "Cliente A",
            email: "contacto@clientea.com",
            company: "Empresa A S.A.",
          },
          {
            id: "2",
            name: "Cliente B",
            email: "info@clienteb.com",
            company: "Corporación B",
          },
          {
            id: "3",
            name: "Cliente C",
            email: "admin@clientec.com",
            company: "Industrias C Ltda.",
          },
        ]

        setClients(mockClients)
      } catch (error) {
        console.error(`Error cargando clientes: ${error}`)
      } finally {
        setLoading(false)
      }
    }

    loadClients()
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setPlantData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const plantPayload = {
        ...plantData,
        clientId: selectedClient,
        status: "active",
        createdAt: new Date().toISOString(),
      }

      // Mock save - replace with real API call
      /*
      const response = await fetch('/api/plants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plantPayload)
      })
      
      if (!response.ok) {
        throw new Error('Error creating plant')
      }
      
      const result = await response.json()
      */

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      router.push("/dashboard")
    } catch (error) {
      console.error(`Error creando planta: ${error}`)
    } finally {
      setSaving(false)
    }
  }

  const isFormValid = selectedClient && plantData.name && plantData.location

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar role={mockUser.role} />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role={mockUser.role} />

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Agregar Nueva Planta</h1>
          <p className="text-gray-600">Completa la información para crear una nueva planta</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Client Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Selección de Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Cliente *</label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente existente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} - {client.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedClient && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900">Cliente Seleccionado</h4>
                    {(() => {
                      const client = clients.find((c) => c.id === selectedClient)
                      return client ? (
                        <div className="text-sm text-blue-700 mt-1">
                          <p>{client.company}</p>
                          <p>{client.email}</p>
                        </div>
                      ) : null
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Plant Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Información de la Planta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Nombre de la Planta *</label>
                  <Input
                    value={plantData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Ej: Planta Norte"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Ubicación *</label>
                  <Input
                    value={plantData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="Ej: Ciudad, País"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <Textarea
                    value={plantData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Descripción detallada de la planta..."
                    rows={3}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Persona de Contacto</label>
                  <Input
                    value={plantData.contactPerson}
                    onChange={(e) => handleInputChange("contactPerson", e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email de Contacto</label>
                  <Input
                    type="email"
                    value={plantData.contactEmail}
                    onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                    placeholder="contacto@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Teléfono de Contacto</label>
                  <Input
                    value={plantData.contactPhone}
                    onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.push("/dashboard")}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!isFormValid || saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Guardando...
                    </>
                  ) : (
                    "🏭 Crear Planta"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
