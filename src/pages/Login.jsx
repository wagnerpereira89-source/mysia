import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/ui/Button'
import { config } from '../config'
 
export default function Login() {
  const { login } = useAuth()
  const [form, setForm] = useState({
    siteUrl: config.siteUrl,
    username: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
 
  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.siteUrl || !form.username || !form.password) return
    setLoading(true)
    try {
      await login(form)
    } finally {
      setLoading(false)
    }
  }
 
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-between p-6">
      <div className="flex-1 w-full max-w-sm flex flex-col justify-center">
        {/* Logo do cliente */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={config.logos.full}
            alt={config.clientName}
            className="h-20 w-auto object-contain"
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
          <div
            style={{ display: 'none' }}
            className="w-16 h-16 rounded-2xl bg-primary items-center justify-center"
          >
            <span className="text-white text-2xl font-bold">A</span>
          </div>
        </div>
 
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* URL do site */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#52525b]">URL do site</label>
            <input
              type="url"
              name="siteUrl"
              value={form.siteUrl}
              onChange={handleChange}
              placeholder={config.siteUrl}
              required
              className="w-full h-12 px-4 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#a1a1aa]"
            />
          </div>
 
          {/* Usuário */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#52525b]">Usuário do WordPress</label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="admin"
              required
              autoComplete="username"
              className="w-full h-12 px-4 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#a1a1aa]"
            />
          </div>
 
          {/* Application Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-[#52525b]">Application Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="xxxx xxxx xxxx xxxx"
                required
                autoComplete="current-password"
                className="w-full h-12 px-4 pr-12 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#a1a1aa]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a1a1aa] hover:text-[#52525b]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
 
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            className="mt-2"
          >
            Entrar
          </Button>
        </form>
      </div>
 
      {/* Rodapé: Desenvolvido por FK Digital */}
      <div className="w-full flex flex-col items-center gap-2 pt-6">
        <p className="text-xs text-[#a1a1aa]">Desenvolvido por:</p>
        <img
          src="/logo%20azul%20escuro.png"
          alt="FK Digital"
          className="h-10 w-auto object-contain opacity-80"
          onError={(e) => { e.target.style.display = 'none' }}
        />
      </div>
    </div>
  )
}
