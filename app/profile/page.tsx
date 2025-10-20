"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useUser } from "@/context/UserContext"
import Navbar from "@/components/Navbar"

export default function Profile() {
  const { user, logout, isAuthenticated, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])


  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar role={user?.puesto || 'client'} />
      {/* Main Content */}
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-6 rounded-lg shadow mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                <span className="material-icons text-3xl">person</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mi Perfil</h1>
                <p className="opacity-90">Información de tu cuenta de usuario</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-8">
            {/* Información principal del usuario */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-blue-600 text-3xl">person</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{user.username}</h2>
              <p className="text-gray-500 mb-3">{user.email}</p>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                user.puesto === "admin" 
                  ? "bg-red-100 text-red-700" 
                  : "bg-blue-100 text-blue-700"
              }`}>
                {user.puesto}
              </span>
            </div>

            {/* Información detallada - diseño minimalista */}
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-400 mr-3">person</span>
                    <span className="text-gray-600">Nombre de usuario</span>
                  </div>
                  <span className="font-medium text-gray-800">{user.username}</span>
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-400 mr-3">email</span>
                    <span className="text-gray-600">Email</span>
                  </div>
                  <span className="font-medium text-gray-800">{user.email}</span>
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-400 mr-3">admin_panel_settings</span>
                    <span className="text-gray-600">Rol</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    user.puesto === "admin" 
                      ? "bg-red-100 text-red-700" 
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {user.puesto}
                  </span>
                </div>
              </div>

              <div className="border-b border-gray-200 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-400 mr-3">calendar_today</span>
                    <span className="text-gray-600">Fecha de registro</span>
                  </div>
                  <span className="font-medium text-gray-800">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : "No disponible"}
                  </span>
                </div>
              </div>

              <div className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="material-icons text-gray-400 mr-3">fingerprint</span>
                    <span className="text-gray-600">ID de usuario</span>
                  </div>
                  <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono text-gray-700">{user.id}</code>
                </div>
              </div>
            </div>

            {/* Botón de acción */}
            <div className="flex justify-center mt-8">
              <Link href="/dashboard" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg flex items-center transition shadow-sm hover:shadow-md">
                <span className="material-icons mr-2">dashboard</span>
                Volver al dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
