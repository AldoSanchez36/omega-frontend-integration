"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import { useLanguage } from "@/context/LanguageContext"
import SelectLanguage from "@/components/SelectLanguage";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [resetError, setResetError] = useState("")
  const [resetSuccess, setResetSuccess] = useState(false)
  const [step, setStep] = useState(1)
  const router = useRouter ? useRouter() : { push: () => {} }
  const { translations } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage("")
    try {
      const res = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.FORGOT_PASSWORD}`, { email })
      if (res.data.ok) {
        setShowModal(true)
        setStep(2)
      } else {
        setMessage(res.data.msg || "No se pudo enviar el código. Intenta de nuevo.")
      }
    } catch (err: any) {
      setMessage(err.response?.data?.msg || "No se pudo enviar el código. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = async () => {
    setResetError("")
    setResetSuccess(false)
    if (!code.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setResetError("Completa todos los campos.")
      return
    }
    if (newPassword !== confirmPassword) {
      setResetError("Las contraseñas no coinciden.")
      return
    }
    try {
      const res = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.RESET_PASSWORD}`, {
        email,
        codigo: code.trim(),
        nuevaPassword: newPassword
      })
      if (res.data.ok) {
        setResetSuccess(true)
        setTimeout(() => {
          setShowModal(false)
          router.push("/login")
        }, 1500)
      } else {
        setResetError(res.data.msg || "Código incorrecto o error al actualizar contraseña.")
      }
    } catch (err: any) {
      setResetError(err.response?.data?.msg || "Código incorrecto o error al actualizar contraseña.")
    }
  }

  return (
    <div className="container-fluid vh-100">
      <div className="row h-100">
        <div className="col-md-6 d-flex align-items-center justify-content-center bg-primary">
          <div className="text-center text-white">
            <h1 className="display-4 fw-bold">Organomex</h1>
            <p className="lead">{translations.forgotPassword?.subtitle}</p>
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="w-100" style={{ maxWidth: "400px" }}>
            <div className="card shadow">
              <div className="card-body p-5">
                <SelectLanguage />
                <h2 className="card-title text-center mb-4">{translations.forgotPassword?.title}</h2>
                {message && (
                  <div className="alert alert-success" role="alert">
                    {message}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      {translations.forgotPassword?.email}
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={translations.forgotPassword?.emailPlaceholder}
                      required
                      disabled={isLoading}
                    />
                    <small className="text-muted">{translations.forgotPassword?.info}</small>
                  </div>

                  <button type="submit" className="btn btn-primary w-100 mb-3" disabled={isLoading || !email.trim()}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {translations.forgotPassword?.loading}
                      </>
                    ) : (
                      translations.forgotPassword?.button
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <p>
                    {translations.forgotPassword?.remembered}
                  </p>
                  
                  <a href="/">{translations.forgotPassword?.backHome}</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Modal para ingresar código y nueva contraseña */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{translations.forgotPassword?.modalTitle}</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 12 }}>
            <p>{translations.forgotPassword?.modalText}</p>
            <div style={{ marginTop: 16 }}>
              <input
                type="text"
                placeholder={translations.forgotPassword?.codePlaceholder}
                value={code}
                onChange={e => setCode(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4, marginBottom: 8 }}
                maxLength={8}
              />
              <input
                type="input"
                placeholder={translations.forgotPassword?.newPassword}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4, marginBottom: 8 }}
              />
              <input
                type="password"
                placeholder={translations.forgotPassword?.confirmNewPassword}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
            {resetError && <div style={{ color: 'red', marginTop: 8 }}>{
              resetError === "Completa todos los campos."
                ? translations.forgotPassword?.errorFields
                : resetError === "Las contraseñas no coinciden."
                  ? translations.forgotPassword?.errorPasswordMismatch
                  : translations.forgotPassword?.errorCode || resetError
            }</div>}
            {resetSuccess && <div style={{ color: 'green', marginTop: 8 }}>{translations.forgotPassword?.success}</div>}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={handleReset}
              style={{ background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 4, border: 'none', fontWeight: 600, fontSize: 16 }}
              disabled={resetSuccess}
            >
              {translations.forgotPassword?.resetButton}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
