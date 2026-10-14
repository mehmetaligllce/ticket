import { useState } from 'react'
import './App.css'
import TicketSelectPage from './components/ticketSelectPage'

function App() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [user, setUser] = useState<{ id: number; name?: string; email: string; created_at?: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setLoading(true)

    const endpoint = isLogin ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/register'
    const payload = isLogin ? { email, password } : { email, password, name }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Bir hata oluştu.')
      }

      setMessage({ type: 'success', text: data.message })
      setUser(data.user)
    } catch (err: unknown) {
      setMessage({ type: 'error', text: (err as Error).message || 'Sunucuya bağlanılamadı.' })
    } finally {
      setLoading(false)
    }
    
  }

  const handleLogout = () => {
    setUser(null)
    setEmail('')
    setPassword('')
    setName('')
    setMessage(null)
  }

  return (
    <div className="app-container" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
      {user ? (
        <div className="ticket-page-wrapper" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
          {/* Çıkış Yap Barı */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', padding: '14px 20px', background: 'rgba(17, 24, 39, 0.85)', backdropFilter: 'blur(16px)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#fff' }}>
                {(user.name || user.email).charAt(0).toUpperCase()}
              </div>
              <div>
                <span style={{ color: '#fff', fontWeight: 600, display: 'block', fontSize: '14px' }}>{user.name || 'Kullanıcı'}</span>
                <span style={{ color: '#94a3b8', fontSize: '12px' }}>{user.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="logout-btn" style={{ width: 'auto', marginTop: 0, padding: '8px 16px' }}>
              Çıkış Yap
            </button>
          </div>

          {/* Koltuk Seçim Sayfası */}
          <TicketSelectPage />
        </div>
      ) : (
        <div className="auth-wrapper">
          {/* Header */}
          <div className="auth-header">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1 className="auth-title">
              {isLogin ? 'Hesabınıza Giriş Yapın' : 'Yeni Hesap Oluşturun'}
            </h1>
            <p className="auth-subtitle">
              {isLogin ? 'Devam etmek için bilgilerinizi giriniz.' : 'Hemen kayıt olun ve kullanmaya başlayın.'}
            </p>
          </div>

          {/* Segmented Control Tabs */}
          <div className="tab-switcher">
            <button
              type="button"
              className={`tab-button ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setMessage(null); }}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              className={`tab-button ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setMessage(null); }}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Alert Message */}
          {message && (
            <div className={`alert-banner ${message.type}`}>
              {message.type === 'success' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">Ad Soyad</label>
                <div className="input-container">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Mehmet Yılmaz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <span className="input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">E-posta Adresi</label>
              <div className="input-container">
                <input
                  type="email"
                  className="form-input"
                  placeholder="ornek@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Şifre</label>
              <div className="input-container">
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className="input-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <span>{isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default App
