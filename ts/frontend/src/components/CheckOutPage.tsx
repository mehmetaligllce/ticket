import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const GO_API_URL = import.meta.env.VITE_GO_URL || 'http://localhost:8080';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const getInitialSeats = (): string[] => {
    if (location.state?.selectedSeats && Array.isArray(location.state.selectedSeats) && location.state.selectedSeats.length > 0) {
      return location.state.selectedSeats;
    }
    const saved = sessionStorage.getItem('selectedSeats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return ['A1', 'A2'];
  };

  const selectedSeats: string[] = getInitialSeats();
  const seatCount = selectedSeats.length;
  const seatPrice = 250; 
  const subtotal = seatCount * seatPrice;
  const serviceFee = seatCount > 0 ? 15 : 0;
  const totalPrice = subtotal + serviceFee;

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cardName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setFormData({ ...formData, cardNumber: val });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setFormData({ ...formData, expiry: val });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;

      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seats: selectedSeats,
          user_id: user ? user.id : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Ödeme sırasında hata oluştu.');
        setLoading(false);
        return;
      }

      const generatedOrderNo = data.orderNumber || 'TKT-999999';
      setOrderNumber(generatedOrderNo);
      sessionStorage.removeItem('selectedSeats');

      try {
        const userId = user?.id ? String(user.id) : 'guest';
        for (const seat of selectedSeats) {
          fetch(`${GO_API_URL}/api/seats/release`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userID: userId, seat, eventID: '1' }),
          }).catch(() => {});
        }
      } catch {
        //  
      }

      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const getCardBrand = () => {
    const rawNum = formData.cardNumber.replace(/\s/g, '');
    if (rawNum.startsWith('4')) return 'VISA';
    if (rawNum.startsWith('5') || rawNum.startsWith('2')) return 'MASTERCARD';
    if (rawNum.startsWith('9') ) return 'TROY';
    
    return '';
  };

  if (success) {
    return (
      <div 
        className="relative w-full min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-6 text-slate-100 font-sans"
        style={{ backgroundImage: "url('/pexels-pixabay-459225.jpg')" }}
      >
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md pointer-events-none" />

        <div 
          className="relative z-10 w-full max-w-xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-3xl text-center shadow-2xl overflow-hidden my-8"
          style={{ padding: '40px 36px' }}
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-emerald-500 to-teal-500" />
          
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            ✓
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Ödeme Başarılı!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Biletleriniz başarıyla oluşturuldu ve e-posta adresinize gönderildi.
          </p>

          <div 
            className="bg-slate-950/80 border border-slate-800 rounded-2xl text-left mb-6 text-sm"
            style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
          >
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <span className="text-slate-400">Sipariş Referansı:</span>
              <span className="font-mono font-bold text-amber-400 text-base">{orderNumber}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Satın Alınan Koltuklar ({seatCount} Adet):</span>
              <span className="font-semibold text-white">{selectedSeats.join(', ')}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Toplam Ödenen Tutar:</span>
              <span className="font-bold text-emerald-400 text-base">₺{totalPrice.toLocaleString('tr-TR')},00</span>
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-400">Durum:</span>
              <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-semibold text-xs border border-emerald-500/30">
                Onaylandı
              </span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-4 px-6 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl font-bold text-base transition-all shadow-lg shadow-orange-500/25 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 sm:p-8 lg:p-12 text-slate-100 font-sans"
      style={{ backgroundImage: "url('/pexels-pixabay-459225.jpg')" }}
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md pointer-events-none" />

      <div 
        className="relative z-10 w-full bg-slate-900/85 backdrop-blur-2xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6"
        style={{ maxWidth: '1280px', padding: '40px 48px' }}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-linear-to-r from-orange-500 via-amber-500 to-orange-600" />

        <div 
          className="bg-slate-950/70 rounded-2xl border border-slate-800/80"
          style={{ padding: '18px 28px', marginBottom: '40px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 text-sm font-semibold text-slate-300 hover:text-orange-400 transition cursor-pointer bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-xl border border-slate-700/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Koltuk Seçimine Dön
          </button>

          <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-4 py-2.5 rounded-full border border-emerald-500/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            256-Bit SSL Uçtan Uca Şifreli Ödeme
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          
          <div 
            className="lg:col-span-5 bg-slate-950/60 rounded-3xl border border-slate-800/80"
            style={{ padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '32px' }}
          >
            <div 
              className="relative w-full rounded-2xl bg-linear-to-br from-slate-800 via-slate-900 to-black border border-slate-700/70 shadow-2xl overflow-hidden"
              style={{ padding: '28px', minHeight: '230px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-linear-to-br from-orange-500/25 to-amber-500/0 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex justify-between items-center" style={{ marginBottom: '16px' }}>
                <div className="w-12 h-9 bg-linear-to-tr from-amber-400 to-yellow-200 rounded-md border border-yellow-300/40 relative overflow-hidden flex items-center justify-center shadow-inner">
                  <div className="w-full h-px bg-slate-800/40 absolute top-3" />
                  <div className="w-full h-px bg-slate-800/40 absolute bottom-3" />
                  <div className="h-full w-px bg-slate-800/40 absolute left-4" />
                </div>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400 opacity-80">
                  <path d="M8.5 14.5A5 5 0 0 0 15.5 14.5" />
                  <path d="M6 12A8.5 8.5 0 0 1 18 12" />
                  <path d="M3.5 9.5A12 12 0 0 1 20.5 9.5" />
                </svg>
              </div>

              <div 
                className="font-mono text-xl sm:text-2xl tracking-widest text-slate-100 font-bold drop-shadow flex items-center"
                style={{ margin: '16px 0', minHeight: '36px', padding: '0 4px' }}
              >
                {formData.cardNumber || ''}
              </div>

              <div className="flex justify-between items-end text-xs sm:text-sm" style={{ padding: '0 4px' }}>
                <div className="min-w-0 flex-1 mr-3">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-1">KART SAHİBİ</div>
                  <div className="font-medium text-slate-100 uppercase tracking-wide truncate min-h-5">
                    {formData.cardName || ''}
                  </div>
                </div>

                <div className="mr-4">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider mb-1">SKT</div>
                  <div className="font-mono font-medium text-slate-100 min-h-5">
                    {formData.expiry || ''}
                  </div>
                </div>

                <div className="font-bold italic text-amber-400 text-sm sm:text-base tracking-tighter min-w-12.5 text-right">
                  {getCardBrand()}
                </div>
              </div>
            </div>

            <div 
              className="bg-slate-950/80 border border-slate-800/90 rounded-2xl"
              style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <h4 className="text-base sm:text-lg font-bold text-slate-100 pb-3 border-b border-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-2"><span>🎟️</span> Sipariş Özeti</span>
                <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  {seatCount} Bilet
                </span>
              </h4>

              <div className="py-1">
                <span className="text-slate-400 text-xs font-semibold block mb-2">Seçilen Koltuk Listesi:</span>
                <div className="flex flex-wrap gap-2">
                  {selectedSeats.length > 0 ? (
                    selectedSeats.map((seat) => (
                      <span key={seat} className="bg-amber-500/15 text-amber-300 font-bold px-3 py-1.5 rounded-xl border border-amber-500/30 text-xs flex items-center gap-1.5 shadow-sm">
                        <span>💺 {seat}</span>
                        <span className="text-slate-400 font-normal">₺250</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-400 text-xs italic">Koltuk seçilmedi</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center text-sm py-1 border-t border-slate-800/60 pt-3">
                <span className="text-slate-400">Bilet Tutarı ({seatCount} x ₺250):</span>
                <span className="font-semibold text-slate-200">₺{subtotal.toLocaleString('tr-TR')},00</span>
              </div>

              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-400">Hizmet Bedeli:</span>
                <span className="text-slate-200">₺{serviceFee},00</span>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-base font-bold text-white">Toplam Ödenecek:</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-orange-400 to-amber-400">
                  ₺{totalPrice.toLocaleString('tr-TR')},00
                </span>
              </div>
            </div>

          </div>

          <div 
            className="lg:col-span-7 bg-slate-950/60 rounded-3xl border border-slate-800/80"
            style={{ padding: '36px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">Kart Bilgileri</h3>
            <p className="text-sm text-slate-400 mb-8">Lütfen ödemeyi tamamlamak için kart bilgilerinizi giriniz.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider block">
                  Kart Üzerindeki İsim
                </label>
                <div className="relative flex items-center">
                  <input
                    required
                    type="text"
                    value={formData.cardName}
                    onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                    style={{ paddingLeft: '60px', paddingRight: '20px', paddingTop: '18px', paddingBottom: '18px', fontSize: '18px', width: '100%' }}
                    className="bg-slate-950/90 border border-slate-800 rounded-2xl font-medium text-slate-100 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all uppercase shadow-inner"
                  />
                  <svg 
                    className="w-6 h-6 text-slate-500 pointer-events-none"
                    style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider block">
                  Kart Numarası
                </label>
                <div className="relative flex items-center">
                  <input
                    required
                    type="text"
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    style={{ paddingLeft: '60px', paddingRight: '20px', paddingTop: '18px', paddingBottom: '18px', fontSize: '18px', width: '100%' }}
                    className="bg-slate-950/90 border border-slate-800 rounded-2xl font-mono font-medium text-slate-100 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all shadow-inner"
                  />
                  <svg 
                    className="w-6 h-6 text-slate-500 pointer-events-none"
                    style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider block">
                    Son Kullanma
                  </label>
                  <div className="relative flex items-center">
                    <input
                      required
                      type="text"
                      value={formData.expiry}
                      onChange={handleExpiryChange}
                      style={{ paddingLeft: '60px', paddingRight: '20px', paddingTop: '18px', paddingBottom: '18px', fontSize: '18px', width: '100%' }}
                      className="bg-slate-950/90 border border-slate-800 rounded-2xl font-mono font-medium text-slate-100 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all shadow-inner"
                    />
                    <svg 
                      className="w-6 h-6 text-slate-500 pointer-events-none"
                      style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label className="text-xs sm:text-sm font-bold text-slate-300 uppercase tracking-wider block">
                    CVV / CVC
                  </label>
                  <div className="relative flex items-center">
                    <input
                      required
                      type="password"
                      maxLength={3}
                      value={formData.cvv}
                      onChange={(e) => setFormData({ ...formData, cvv: e.target.value.replace(/\D/g, '') })}
                      style={{ paddingLeft: '60px', paddingRight: '20px', paddingTop: '18px', paddingBottom: '18px', fontSize: '18px', width: '100%' }}
                      className="bg-slate-950/90 border border-slate-800 rounded-2xl font-mono font-medium text-slate-100 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all shadow-inner"
                    />
                    <svg 
                      className="w-6 h-6 text-slate-500 pointer-events-none"
                      style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)' }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{ marginTop: '16px', padding: '20px 32px', fontSize: '18px' }}
                className="w-full bg-linear-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white rounded-2xl font-extrabold transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75"
              >
                {loading ? (
                  <span className="flex items-center gap-3">
                    <span className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    Güvenli Ödeme İşleniyor...
                  </span>
                ) : (
                  <>
                    <span>₺{totalPrice.toLocaleString('tr-TR')},00 Ödemeyi Tamamla</span>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="5" y1="12" x2="19" y2="12" />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}