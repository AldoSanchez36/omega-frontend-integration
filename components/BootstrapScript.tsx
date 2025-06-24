"use client"

import { useEffect } from 'react'

export default function BootstrapScript() {
  useEffect(() => {
    // Load Bootstrap JavaScript only on client side
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
    script.integrity = 'sha384-geWF76RCwLtnZ8qwWowPQNguL3RmwHVBC9FhGdlKrxdiJJigb/j/68SIy3Te4Bkz'
    script.crossOrigin = 'anonymous'
    document.head.appendChild(script)

    return () => {
      // Cleanup script when component unmounts
      const existingScript = document.querySelector(`script[src="${script.src}"]`)
      if (existingScript) {
        existingScript.remove()
      }
    }
  }, [])

  return null
} 