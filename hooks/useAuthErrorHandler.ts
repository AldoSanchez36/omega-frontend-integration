"use client"

import { useRouter } from 'next/navigation';

export function useAuthErrorHandler() {
  const router = useRouter();

  const handleAuthError = (response: Response) => {
    if (response.status === 401) {
      // Token inválido - redirigir al logout
      console.error('Token inválido detectado, redirigiendo al logout');
      localStorage.removeItem('Organomex_token');
      localStorage.removeItem('Organomex_user');
      router.push('/logout');
      return true; // Indica que se manejó el error
    }
    return false; // No se manejó el error
  };

  const handleFetchWithAuth = async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, options);
      
      // Verificar si es un error de autenticación
      if (handleAuthError(response)) {
        return null; // La respuesta será manejada por el hook
      }
      
      return response;
    } catch (error) {
      console.error('Error en fetch:', error);
      return null;
    }
  };

  return {
    handleAuthError,
    handleFetchWithAuth
  };
} 