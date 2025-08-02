"use client"

import React, { useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import "./RegisterScreen.css"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { API_BASE_URL, API_ENDPOINTS } from "@/config/constants"
import SelectLanguage from "@/components/SelectLanguage";

export default function RegisterScreen() {
  const { translations, changeLanguage, language } = useLanguage()
  const [formData, setFormData] = useState({
    username: "",
    empresa: "",
    email: "",
    password: "",
    confirmPassword: "",
    newPassword: "",
    confirmNewPassword: ""
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

    // Validate initial password and confirmPassword match
    if (formData.password !== formData.confirmPassword) {
      setError(language === "es" ? "Las contraseñas no coinciden" : "Passwords do not match")
      return
    }

    // If verification modal is shown and verification is successful, validate new password fields
    if (showVerifyModal && verifySuccess) {
      // Validate new password length
      if (formData.newPassword.length < 8) {
        setError(language === "es" ? "La nueva contraseña debe tener al menos 8 caracteres" : "New password must be at least 8 characters")
        return
      }
      // Validate new password contains at least one special character from the set .!"#$%&/()=?|´+{},.-;:_
      const hasSpecial = /[.!\"#$%&/()=?|´+{},.\-;:_]/.test(formData.newPassword)
      if (!hasSpecial) {
        setError(language === "es" ? "La nueva contraseña debe contener al menos un carácter especial como .!\"#$%&/()=?|´+{},.-;:_" : "New password must contain at least one special character like .!\"#$%&/()=?|´+{},.-;:_")
        return
      }
      // Validate new password and confirmNewPassword match
      if (formData.newPassword !== formData.confirmNewPassword) {
        setError(language === "es" ? "Las nuevas contraseñas no coinciden" : "New passwords do not match")
        return
      }

      // Submit new password to backend or finalize registration here
      try {
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.REGISTER}`, {
          username: formData.username.trim(),
          empresa: formData.empresa.trim(),
          email: formData.email.trim(),
          password: formData.newPassword,
          confirmPassword: formData.confirmNewPassword,
        })
        if (response.status === 201) {
          router.push("/login")
        }
      } catch (error: any) {
        if (error.response) {
          setError(error.response.data.msg || (language === "es" ? "Error al registrar el usuario" : "Error registering user"))
        } else {
          setError(language === "es" ? "Error del servidor" : "Server error")
        }
      }
      return
    }

    // Initial registration request
    try {
      const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.REGISTER}`, {
        username: formData.username.trim(),
        empresa: formData.empresa.trim(),
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
        if (error.response.data.pendienteVerificacion) {
          setPendingEmail(formData.email.trim());
          setShowVerifyModal(true);
          alert("Ya existe una cuenta pendiente de verificación. ¿Deseas reenviar el código?");
          return;
        }
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
          router.push("/login")
        }, 2000)
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
        <SelectLanguage />
        <h1>{translations.register?.title}</h1>
        {error && <p className="error-message">{error}</p>}
        <div className="form-group">
          <label htmlFor="username">{translations.register?.username}:</label>
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
          <label htmlFor="empresa">{translations.register?.empresa || "Empresa"}:</label>
          <input
            type="text"
            id="empresa"
            name="empresa"
            value={formData.empresa}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">{translations.register?.email}:</label>
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
          <label htmlFor="password">{translations.register?.password}:
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
          <label htmlFor="confirmPassword">{translations.register?.confirmPassword}:</label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        <div className="password-hint-wrapper">
          <p>{translations.register?.passwordHintTitle}</p>
          <div className={`condition is-long-enough ${formData.password.length >= 8 ? 'valid' : 'invalid'}`}>
            <span className="icon">{formData.password.length >= 8 ? "✅" : "❌"}</span>
            <span>La contraseña tiene al menos 8 caracteres</span>
          </div>
          <div className={`condition has-all-characters ${
            /[.!\"#$%&/()=?|´+{},.\-;:_]/.test(formData.password) ? 'valid' : 'invalid'}`}>
            <span className="icon">{
              /[.!\"#$%&/()=?|´+{},.\-;:_]/.test(formData.password) ? "✅" : "❌"
            }</span>
            <span>La contraseña contiene al menos un carácter especial como .!"#$%&/()=?|´+{},.-;:_</span>
          </div>
          <div className={`condition passwords-match ${formData.password === formData.confirmPassword && formData.password !== "" ? 'valid' : 'invalid'}`}>
            <span className="icon">{formData.password === formData.confirmPassword && formData.password !== "" ? "✅" : "❌"}</span>
            <span>Las contraseñas coinciden</span>
          </div>
        </div>

        {showVerifyModal && verifySuccess && (
          <>
            <div className="form-group">
              <label htmlFor="newPassword">{translations.register?.newPasswordLabel}</label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                placeholder="New password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmNewPassword">{translations.register?.confirmNewPasswordLabel}</label>
              <input
                type="password"
                id="confirmNewPassword"
                name="confirmNewPassword"
                value={formData.confirmNewPassword}
                onChange={handleChange}
                required
                placeholder="Confirm new password"
              />
            </div>
            <div className="password-hint-wrapper">
              <p>{translations.register?.passwordHintTitle}</p>
              <div className={`condition is-long-enough ${formData.newPassword.length >= 8 ? 'valid' : 'invalid'}`}>
                <span className="icon">{formData.newPassword.length >= 8 ? "✅" : "❌"}</span>
                <span>La contraseña tiene al menos 8 caracteres</span>
              </div>
              <div className={`condition has-all-characters ${
                /[.!\"#$%&/()=?|´+{},.\-;:_]/.test(formData.newPassword) ? 'valid' : 'invalid'}`}>
                <span className="icon">{
                  /[.!\"#$%&/()=?|´+{},.\-;:_]/.test(formData.newPassword) ? "✅" : "❌"
                }</span>
                <span>La contraseña contiene al menos un carácter especial como .!"#$%&/()=?|´+{},.-;:_</span>
              </div>
              <div className={`condition passwords-match ${formData.newPassword === formData.confirmNewPassword && formData.newPassword !== "" ? 'valid' : 'invalid'}`}>
                <span className="icon">{formData.newPassword === formData.confirmNewPassword && formData.newPassword !== "" ? "✅" : "❌"}</span>
                <span>Las contraseñas coinciden</span>
              </div>
            </div>
          </>
        )}

        {!showVerifyModal && (
          <button type="submit" className="register-button">
            {translations.register?.button}
          </button>
        )}
        <br />
        <button
          className="back-button"
          type="button"
          onClick={() => router.push("/login")}
        >
          ← {translations.register?.loginButton}
        </button>
      </form>
      {/* Modal de verificación de código */}
      <Dialog open={showVerifyModal}>
        <DialogContent className="bg-gray-100">
          <DialogHeader>
            <DialogTitle>{translations.register?.modalTitle}</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: 12 }}>
            {!verifySuccess ? (
              <>
                <p>{translations.register?.modalText}</p>
                <div style={{ marginTop: 16 }}>
                  <input
                    type="text"
                    placeholder={translations.register?.codePlaceholder}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value)}
                    style={{ width: '100%', padding: 8, fontSize: 16, border: '1px solid #ccc', borderRadius: 4 }}
                    maxLength={8}
                  />
                </div>
                {verifyError && <div style={{ color: 'red', marginTop: 8 }}>{translations.register?.codeError || verifyError}</div>}
              </>
            ) : (
              <div style={{ color: 'green', marginTop: 8 }}>{translations.register?.codeSuccess}</div>
            )}
          </div>
          <DialogFooter>
            {!verifySuccess ? (
              <button
                type="button"
                onClick={handleVerify}
                style={{ background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 4, border: 'none', fontWeight: 600, fontSize: 16 }}
              >
                {translations.register?.verifyButton}
              </button>
            ) : (
              <button
                type="submit"
                form="register-form"
                style={{ background: '#2563eb', color: 'white', padding: '8px 20px', borderRadius: 4, border: 'none', fontWeight: 600, fontSize: 16 }}
              >
                {translations.register?.setPasswordButton || translations.register?.verifyButton}
              </button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
