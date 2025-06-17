import { httpService } from "./httpService"
import { API_ENDPOINTS } from "./authService"

class ReportService {
  async createReport(reportData) {
    return httpService.post(API_ENDPOINTS.REPORTES.CREATE, reportData)
  }

  async getReportById(id) {
    return httpService.get(`${API_ENDPOINTS.REPORTES.BY_ID}/${id}`)
  }

  async getUserReports(usuarioId) {
    return httpService.get(`${API_ENDPOINTS.REPORTES.BY_USER}/${usuarioId}`)
  }

  async uploadFile(file) {
    return httpService.uploadFile(API_ENDPOINTS.UPLOAD, file)
  }

  // Métodos para mantener compatibilidad con localStorage
  saveReportToLocal(reportData) {
    const reports = this.getLocalReports()
    const newReport = {
      id: Date.now().toString(),
      ...reportData,
      created_at: new Date().toISOString(),
    }
    reports.push(newReport)
    localStorage.setItem("omega_reports", JSON.stringify(reports))
    return newReport
  }

  getLocalReports() {
    const reports = localStorage.getItem("omega_reports")
    return reports ? JSON.parse(reports) : []
  }

  // Método híbrido que intenta backend primero, luego localStorage
  async saveReport(reportData, useBackend = true) {
    if (useBackend) {
      try {
        return await this.createReport(reportData)
      } catch (error) {
        console.warn("Backend not available, saving locally:", error)
        return this.saveReportToLocal(reportData)
      }
    } else {
      return this.saveReportToLocal(reportData)
    }
  }

  async getReports(userId, useBackend = true) {
    if (useBackend) {
      try {
        return await this.getUserReports(userId)
      } catch (error) {
        console.warn("Backend not available, using local storage:", error)
        return this.getLocalReports()
      }
    } else {
      return this.getLocalReports()
    }
  }
}

export const reportService = new ReportService()
