import SeatIcon from "../hooks/SeatIcon"
import hallLayout from "../data/hallLayout.json"
import { useState } from "react";
import { useNavigate } from "react-router-dom";


const TicketSelectPage = () => {
    const [selectedSeats, setSelectedSeats] = useState<string[]>([])
    const navigate = useNavigate();

    const handleSeat = (seatId: string, status: string) => {
        if (status === 'booked') {
            alert('Bu koltuk dolu.')
            return;
        }

        
        if (selectedSeats.includes(seatId))
            setSelectedSeats(selectedSeats.filter(seat => seat !== seatId))
        else if (selectedSeats.length >= 5) {
            alert('En fazla 5 koltuk seçebilirsiniz.')
            return;
        }
        else
            setSelectedSeats([...selectedSeats, seatId])
    }

    const handlePayment = () => {
      sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
      navigate('/checkout', { state: { selectedSeats } });
    }

    return (
    <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-slate-800/80 rounded-3xl flex flex-col items-center justify-center p-8 select-none font-sans shadow-2xl text-slate-100">
      
      {/* 1. ÜST KAVİSLİ PERDE (SCREEN) */}
      <div className="w-full max-w-4xl flex flex-col items-center mb-10">
        <svg viewBox="0 0 800 60" className="w-full h-12 stroke-amber-500 fill-transparent drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
          <path d="M 10 50 Q 400 10 790 50" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <span className="text-amber-500/80 font-bold tracking-[0.4em] text-xs mt-2 uppercase">
          P E R D E
        </span>
      </div>

      {/* 2. SALON YERLEŞİMİ */}
      <div className="flex flex-col gap-2.5 items-center overflow-x-auto max-w-full p-2">
        {hallLayout.map((rowItem, rIdx) => {
          if (rowItem.row === 'SPACE' || !rowItem.pattern) {
            return <div key={rIdx} className="h-4" />;
          }

          let seatCounter = 1;

          return (
            <div key={rowItem.row} className="flex items-center gap-1.5">
              {/* Sol Sıra Harfi */}
              <span className="w-6 text-center text-xs font-bold text-slate-500">
                {rowItem.row}
              </span>

              {/* Koltuklar */}
              <div className="flex gap-1.5 items-center">
                {rowItem.pattern.split('').map((char, cIdx) => {
                  if (char === '_') {
                    return <div key={cIdx} className="w-6 h-6" />;
                  }

                  const currentSeatId = `${rowItem.row}${seatCounter++}`;
                  const status = char === 'B' ? 'booked' : 'available';
                  const type = char === 'D' ? 'disabled' : 'standard';
                  const isSelected = selectedSeats.includes(currentSeatId);

                  return (
                    <button
                      key={cIdx}
                      onClick={() => handleSeat(currentSeatId, status)}
                      disabled={status === 'booked'}
                      title={`Koltuk ${currentSeatId}`}
                      className="focus:outline-none disabled:cursor-not-allowed cursor-pointer"
                    >
                      <SeatIcon
                        status={status}
                        type={type}
                        isSelected={isSelected}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Sağ Sıra Harfi */}
              <span className="w-6 text-center text-xs font-bold text-slate-500">
                {rowItem.row}
              </span>
            </div>
          );
        })}
      </div>

      {/* Lejant (Alt Bilgilendirme) */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-6 border-t border-slate-800/80 text-xs font-medium text-slate-400">
        <div className="flex items-center gap-2">
          <SeatIcon status="booked" />
          <span>Dolu</span>
        </div>

        <div className="flex items-center gap-2">
          <SeatIcon status="available" />
          <span>Boş</span>
        </div>

        <div className="flex items-center gap-2">
          <SeatIcon type="disabled" />
          <span>Engelli</span>
        </div>

        <div className="flex items-center gap-2">
          <SeatIcon isSelected={true} />
          <span>Seçiminiz</span>
        </div>
      </div>

      {/* Seçim Özeti Barı */}
      {selectedSeats.length >= 1 && (
        <div className="mt-8 px-6 py-3.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl shadow-lg shadow-orange-500/20 text-sm flex items-center gap-4 animate-bounce-short">
          <span>Seçilen Koltuklar: <b className="text-amber-100">{selectedSeats.join(', ')}</b></span>
          <span className="bg-slate-950/40 backdrop-blur-md text-amber-300 font-bold px-3 py-1 rounded-xl text-xs border border-amber-500/30">
            {selectedSeats.length * 150} TL
          </span>
        </div>
      )}
      {selectedSeats.length >= 1 && (
      <div className="flex justify-center">
        <button className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-xl cursor-pointer transition-all mt-4 text-base shadow-lg shadow-orange-500/20" onClick={handlePayment}>Ödeme İşlemine Geç</button>
      </div>
      )}
    </div>
  );
}

export default TicketSelectPage;
