"use client"

import React, { useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useLanguage } from "../../Elements/LanguageContext"
import "./RegisterScreen.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"

export default function RegisterScreen() {
  const { translations, changeLanguage, language } = useLanguage()
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const [verifyCode, setVerifyCode] = useState("")
  const [verifyError, setVerifyError] = useState("")
  const [verifySuccess, setVerifySuccess] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (formData.password !== formData.confirmPassword) {
      setError(language === "es" ? "Las contraseñas no coinciden" : "Passwords do not match")
      return
    }
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.REGISTER}`, {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })
      if (response.status === 201) {
        setPendingEmail(formData.email.trim())
        setShowVerifyModal(true)
      }
    } catch (error: any) {
      if (error.response) {
        setError(error.response.data.msg || (language === "es" ? "Error al registrar el usuario" : "Error registering user"))
      } else {
        setError(language === "es" ? "Error del servidor" : "Server error")
      }
    }
  }

  const handleVerify = async () => {
    setVerifyError("")
    setVerifySuccess(false)
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.VERIFY_EMAIL}`, {
        email: pendingEmail,
        codigo: verifyCode.trim(),
      })
      if (response.data.ok) {
        setVerifySuccess(true)
        setTimeout(() => {
          setShowVerifyModal(false)
          router.push("/login")
        }, 1500)
      } else {
        setVerifyError(response.data.msg || (language === "es" ? "Código incorrecto" : "Incorrect code"))
      }
    } catch (error: any) {
      setVerifyError(error.response?.data?.msg || (language === "es" ? "Código incorrecto" : "Incorrect code"))
    }
  }

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '70px', position: 'relative', left: '250px' }}>🌐&nbsp;
          <select
            onChange={e => changeLanguage(e.target.value)}
            value={language}
            style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '14px' }}
          >
            <option value="en">En</option>
            <option value="es">Es</option>
          </select>
        </div>
        <h1>{translations.register}</h1>
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <label htmlFor="username">{translations.username}:</label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">{translations.email}:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">{translations.password}:
            <span className="toggle-password material-icons"
              onClick={() => setShowPassword(!showPassword)}
              style={{ position: 'relative', top: '7px', left: '2px', cursor: 'pointer' }}>
              {showPassword ? 'visibility_off' : 'visibility'}
            </span>
          </label>
          <div className="password-input-container">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="confirmPassword">{translations.password}:</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <button type="submit" className="register-button">
          {translations.registerButton}
        </button>
        <br />
        <button
          className="back-button"
          type="button"
          onClick={() => router.push("/login")}
        >
          ← {translations.loginButton}
        </button>
      </form>
      {/* Modal de verificación de código */}
      <Dialog open={showVerifyModal} onOpenChange={setShowVerifyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "es" ? "Verifica tu correo" : "Verify your email"}</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 12 }}>
            <p>{language === "es"
              ? "Hemos enviado un código de verificación a tu correo. Ingresa el código para activar tu cuenta."
              : "We have sent a verification code to your email. Enter the code to activate your account."}</p>
            <div style={{ marginTop: 16 }}>
              <input
                type="text"
                placeholder={language === "es" ? "Código de verificación" : "Verification code"}
                value={verifyCode}
                onChange={e => setVerifyCode(e.target.value)}
                style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4 }}
                maxLength={8}
              />
            </div>
            {verifyError && <div style={{ color: 'red', marginTop: 8 }}>{verifyError}</div>}
            {verifySuccess && <div style={{ color: 'green', marginTop: 8 }}>{language === "es" ? "¡Cuenta verificada! Redirigiendo..." : "Account verified! Redirecting..."}</div>}
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={handleVerify}
              style={{ background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 4, border: 'none', fontWeight: 600, fontSize: 16 }}
              disabled={verifySuccess}
            >
              {language === "es" ? "Verificar" : "Verify"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
