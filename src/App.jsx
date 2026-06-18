import React from 'react';
import Weather from './components/Weather';
import MerchCarousel from './components/MerchCarousel';
import BottomCards from './components/BottomCards';

export default function App() {
  return (
    <div className="w-screen h-screen overflow-hidden bg-zinc-100 text-black font-sans p-[2vw] grid grid-rows-[58%_42%] gap-[3vh] select-none transition-colors duration-500">

      {/* Top Section: Flexbox with a locked gap so nothing floats too far away */}
      <div className="flex items-center gap-[3vw] w-full h-full overflow-hidden">

        {/* Left Side: Weather Card (Reduced from 18vw to 16vw) */}
        <div className="shrink-0 w-[16vw] h-full flex flex-col justify-center">
          <Weather />
        </div>

        {/* Center: Carousel (Fills the massive remaining space, scaling shirts up) */}
        <div className="flex-1 h-full overflow-hidden flex items-center justify-center">
          <MerchCarousel />
        </div>

        {/* Right Side: QR Code (Tightened to 12vw so there is zero wasted space) */}
        <div className="shrink-0 w-[10vw] h-full flex flex-col items-center justify-center">
          <h2 className="text-[1.8vw] font-black tracking-widest uppercase text-black mb-[1.5vh] text-center leading-tight shrink-0">
            Scan To<br />Shop<br />Merch
          </h2>
          <div className="w-[10vw] h-[10vw] bg-white border border-black/10 rounded-xl flex items-center justify-center p-[0.5vw] shadow-xl shrink-0">
            <img src="/qr-code.png" className="w-full h-full object-contain rounded-md" alt="QR Code" />
          </div>
        </div>

      </div>

      {/* Bottom Section */}
      <div className="h-full overflow-hidden">
        <BottomCards />
      </div>

    </div>
  );
}