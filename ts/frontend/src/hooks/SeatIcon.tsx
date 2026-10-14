interface SeatProps {
    status?: string;
    type?: string;
    isSelected?: boolean;
}
const SeatIcon = ({status,type,isSelected}:SeatProps) =>{

  let fillColor = '#8cb426'; 
  const isOccupied = status === 'booked';

  if (isOccupied) {
    fillColor = '#cbd5e1';
  } else if (isSelected) {
    fillColor = '#15803d';
  } else if (type === 'disabled') {
    fillColor = '#f59e0b';
  }
    return (
    <div className="relative w-6 h-6 flex items-center justify-center transition-transform transform hover:scale-110">
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-sm"
        style={{ fill: fillColor }}
      >
        <path d="M 22 15 C 22 8, 78 8, 78 15 L 78 65 C 78 70, 22 70, 22 65 Z" />
        <rect x="18" y="60" width="64" height="26" rx="6" />
        <rect x="10" y="38" width="10" height="42" rx="4" />
        <rect x="80" y="38" width="10" height="42" rx="4" />
      </svg>

      {isOccupied && (
        <svg
          className="w-3.5 h-3.5 absolute text-white/90"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}
export default SeatIcon