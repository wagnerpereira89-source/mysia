import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { validateCredentials } from '../api/auth'
import { saveCredentials, loadCredentials, clearCredentials } from '../utils/storage'
import toast from 'react-hot-toast'

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = loading
  const navigate = useNavigate()

  useEffect(() => {
    loadCredentials().then((creds) => {
      setIsAuthenticated(!!creds)
    })
  }, [])

  const login = useCallback(async ({ siteUrl, username, password }) => {
    try {
      await validateCredentials({ siteUrl, username, password })
      await saveCredentials({ siteUrl, username, password })
      setIsAuthenticated(true)
      navigate('/inventory')
    } catch (err) {
      if (err.response?.status === 401) {
        toast.error('Credenciais inválidas. Verifique usuário e senha.')
      } else if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
        toast.error('Site não acessível. Verifique a URL.')
      } else {
        toast.error(err.message || 'Erro ao conectar')
      }
      throw err
    }
  }, [navigate])

  const logout = useCallback(() => {
    clearCredentials()
    setIsAuthenticated(false)
    navigate('/login')
  }, [navigate])

  return { isAuthenticated, login, logout }
}
