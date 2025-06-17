import { httpService } from "./httpService"
import { API_ENDPOINTS } from "../config/api"

class PlantService {
  async createPlant(nombre) {
    return httpService.post(API_ENDPOINTS.PLANTAS.CREAR, { nombre })
  }

  async getMyPlants(usuarioId) {
    return httpService.get(`${API_ENDPOINTS.PLANTAS.MIS_PLANTAS}/${usuarioId}`)
  }

  async assignPlantAccess(usuarioId, plantaId) {
    return httpService.post(API_ENDPOINTS.ACCESOS.PLANTAS.ASIGNAR, {
      usuario_id: usuarioId,
      planta_id: plantaId,
    })
  }

  async getUserPlantAccess(usuarioId) {
    return httpService.get(`${API_ENDPOINTS.ACCESOS.PLANTAS.USUARIO}/${usuarioId}`)
  }

  async revokePlantAccess(usuarioId, plantaId) {
    return httpService.delete(API_ENDPOINTS.ACCESOS.PLANTAS.REVOCAR, {
      body: JSON.stringify({ usuario_id: usuarioId, planta_id: plantaId }),
    })
  }
}

export const plantService = new PlantService()
