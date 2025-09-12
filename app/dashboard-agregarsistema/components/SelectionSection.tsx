"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Plus, Edit, Trash2 } from "lucide-react"

type Props = {
  users: any[]
  plants: any[]
  systems: any[]
  selectedUser: any
  selectedPlant: any
  selectedSystemId: string | null
  showCreatePlant: boolean
  newPlantName: string
  newPlantDestinatario: string
  newPlantMensaje: string
  loading: boolean
  showEditPlantDialog: boolean
  editPlantName: string
  editPlantDestinatario: string
  editPlantMensaje: string
  showCreateSystem: boolean
  newSystemName: string
  newSystemDescription: string
  showEditSystemDialog: boolean
  editSystemName: string
  actions: any
}

export default function SelectionSection(props: Props) {
  const {
    users, plants, systems,
    selectedUser, selectedPlant, selectedSystemId,
    showCreatePlant, newPlantName, newPlantDestinatario, newPlantMensaje, loading,
    showEditPlantDialog, editPlantName, editPlantDestinatario, editPlantMensaje,
    showCreateSystem, newSystemName, newSystemDescription,
    showEditSystemDialog, editSystemName,
    actions
  } = props
  const {
    handleSelectUser, handleSelectPlant, setShowCreatePlant, setNewPlantName, setNewPlantDestinatario, setNewPlantMensaje,
    handleCreatePlant, handleOpenEditPlant, setShowEditPlantDialog, setEditPlantName, setEditPlantDestinatario, setEditPlantMensaje,
    handleUpdatePlant, handleDeletePlant, setShowCreateSystem, setNewSystemName, setNewSystemDescription,
    handleCreateSystem, handleOpenEditSystem, handleDeleteSystem, setShowEditSystemDialog,
    setEditSystemName, handleUpdateSystem, setSelectedSystemId
  } = actions

  return (
    <div>
      <h2 className="text-lg font-medium leading-6 text-gray-900">Selección Jerárquica</h2>
      <p className="mt-1 text-sm text-gray-500">Seleccione Cliente, Planta y Sistema para gestionar parámetros.</p>
      <div className="mt-6 flex flex-col space-y-6">
        {/* Cliente (Usuario) */}
        <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-4">
          <Label className="pt-2 text-sm font-medium text-gray-700">Cliente (Usuario)</Label>
          <div className="flex flex-col">
            <Select value={selectedUser?.id ?? ""} onValueChange={handleSelectUser}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccione un usuario" />
              </SelectTrigger>
              <SelectContent className="bg-[#f6f6f6] text-gray-900">
                {users.map((user: any) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-gray-500">Seleccione el usuario para ver las plantas asociadas.</p>
          </div>
        </div>

        {/* Planta */}
        {selectedUser && (
          <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-4">
            <Label className="pt-2 text-sm font-medium text-gray-700">Planta</Label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Select value={selectedPlant?.id} onValueChange={handleSelectPlant} disabled={plants.length === 0}>
                  <SelectTrigger className="w-full sm:min-w-[150px] max-w-[200px] ">
                    <SelectValue placeholder="Seleccione una planta" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#f6f6f6] text-gray-900 sm:min-w-[150px]">
                    {plants.map((plant: any) => (
                      <SelectItem key={plant.id} value={plant.id}>
                        {plant.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full">
                  <Button
                    type="button"
                    onClick={() => setShowCreatePlant(true)}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 w-full md:w-auto whitespace-nowrap shrink-0"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Crear Planta
                  </Button>
                  {selectedPlant && (
                    <Button 
                      type="button" 
                      onClick={() => handleOpenEditPlant(selectedPlant)} 
                      variant="outline"
                      className="border-blue-300 text-blue-700 hover:bg-blue-50 w-full md:w-auto whitespace-nowrap shrink-0"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Editar Nombre
                    </Button>
                  )}
                  {selectedPlant && (
                    <Button
                      type="button"
                      onClick={() => handleDeletePlant(selectedPlant)}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 w-full md:w-auto whitespace-nowrap shrink-0"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Borrar Planta
                    </Button>
                  )}
                </div>
              </div>
              {showCreatePlant && (
                <div className="grid w-full grid-cols-1 gap-3 rounded-lg border p-3">
                  <Input
                    placeholder="Nombre de la nueva planta"
                    value={newPlantName}
                    onChange={(e) => setNewPlantName(e.target.value)}
                  />
                  <Input
                    placeholder="Nombre de a quien va dirigido el reporte"
                    value={newPlantDestinatario}
                    onChange={(e) => setNewPlantDestinatario(e.target.value)}
                  />
                  <Input
                    placeholder="Mensaje para el cliente"
                    value={newPlantMensaje}
                    onChange={(e) => setNewPlantMensaje(e.target.value)}
                  />
                  <Button 
                    type="button" 
                    onClick={handleCreatePlant} 
                    disabled={loading || !newPlantName.trim() || !newPlantDestinatario.trim() || !newPlantMensaje.trim()} 
                    className="w-full sm:w-auto justify-self-end"
                  >
                    Guardar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sistema */}
        {selectedPlant && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-[150px_1fr] items-start gap-4">
              <Label className="pt-2 text-sm font-medium text-gray-700">Sistema</Label>
              <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-between">
                <Button type="button" onClick={() => setShowCreateSystem(true)} variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 w-full md:w-auto whitespace-nowrap shrink-0">
                  <Plus className="mr-2 h-4 w-4" /> Crear Sistema
                </Button>
              </div>
            </div>
          </div>
        )}

        {selectedPlant && systems.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {systems.map((system: any) => (
                <div key={system.id} className="flex flex-col h-full">
                  <div
                    onClick={() => setSelectedSystemId(system.id)}
                    className={`flex flex-col h-full justify-between px-4 py-3 text-sm font-medium rounded border cursor-pointer ${
                      selectedSystemId === system.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex-grow flex items-center justify-center text-center w-full overflow-hidden">
                      <span className="block max-w-full truncate" title={system.nombre}>{system.nombre}</span>
                    </div>
                    <div
                      className="flex justify-center mt-2 pt-2 border-t border-gray-300 border-opacity-30"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenEditSystem(system);
                        }}
                        onKeyDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center"
                        aria-label={`Editar nombre de ${system.nombre}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                      </button>
                      <div className="w-2"></div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteSystem(system);
                        }}
                        onKeyDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        className="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 flex items-center"
                        aria-label={`Eliminar ${system.nombre}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modales de Sistema y Planta */}
        <Dialog open={showEditSystemDialog} onOpenChange={setShowEditSystemDialog}>
          <DialogContent className="bg-[#f6f6f6] text-gray-900">
            <DialogHeader>
              <DialogTitle>Editar Nombre del Sistema</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-system-name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="edit-system-name"
                  value={editSystemName}
                  onChange={(e) => setEditSystemName(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditSystemDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleUpdateSystem}
                disabled={loading || !editSystemName.trim()}
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditPlantDialog} onOpenChange={setShowEditPlantDialog}>
          <DialogContent className="bg-[#f6f6f6] text-gray-900">
            <DialogHeader>
              <DialogTitle>Editar Planta</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-plant-name" className="text-right">
                  Nombre
                </Label>
                <Input
                  id="edit-plant-name"
                  value={editPlantName}
                  onChange={(e) => setEditPlantName(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-plant-destinatario" className="text-right">
                  Dirigido a
                </Label>
                <Input
                  id="edit-plant-destinatario"
                  value={editPlantDestinatario}
                  onChange={(e) => setEditPlantDestinatario(e.target.value)}
                  className="col-span-3"
                  placeholder="Nombre de a quien va dirigido el reporte"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-plant-mensaje" className="text-right">
                  Mensaje
                </Label>
                <Input
                  id="edit-plant-mensaje"
                  value={editPlantMensaje}
                  onChange={(e) => setEditPlantMensaje(e.target.value)}
                  className="col-span-3"
                  placeholder="Mensaje para el cliente"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEditPlantDialog(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button 
                type="button" 
                onClick={handleUpdatePlant}
                disabled={loading || !editPlantName.trim() || !editPlantDestinatario.trim() || !editPlantMensaje.trim()}
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal: Crear Sistema */}
        <Dialog open={showCreateSystem} onOpenChange={setShowCreateSystem}>
          <DialogContent className="bg-[#f6f6f6] text-gray-900">
            <DialogHeader>
              <DialogTitle>Crear Sistema</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-system-name" className="text-right">Nombre</Label>
                <Input
                  id="new-system-name"
                  value={newSystemName}
                  onChange={(e) => setNewSystemName(e.target.value)}
                  className="col-span-3"
                  placeholder="Ej. Sistema principal"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="new-system-desc" className="text-right">Descripción</Label>
                <Input
                  id="new-system-desc"
                  value={newSystemDescription}
                  onChange={(e) => setNewSystemDescription(e.target.value)}
                  className="col-span-3"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateSystem(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleCreateSystem}
                disabled={loading || !newSystemName.trim()}
              >
                {loading ? "Creando..." : "Crear Sistema"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}