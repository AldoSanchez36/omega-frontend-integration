"use client"

import React, { useState } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useLanguage } from "../../Elements/LanguageContext"
import "./RegisterScreen.css"

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
      const response = await axios.post("http://localhost:4000/api/auth/register", {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })
      if (response.status === 201) {
        alert(language === "es" ? "Usuario registrado exitosamente" : "User registered successfully")
        router.push("/login")
      }
    } catch (error: any) {
      if (error.response) {
        setError(error.response.data.msg || (language === "es" ? "Error al registrar el usuario" : "Error registering user"))
      } else {
        setError(language === "es" ? "Error del servidor" : "Server error")
      }
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
    </div>
  )
}
