import React, { useState, useEffect } from 'react';
import Clock from './Clock';

const VIBES = {
    Clear: "bg-gradient-to-br from-blue-500 to-sky-400 border-blue-300/30 shadow-blue-900/20 text-white",
    Clouds: "bg-gradient-to-br from-slate-700 to-slate-500 border-slate-400/30 shadow-slate-900/20 text-white",
    Rain: "bg-gradient-to-br from-gray-900 to-blue-900 border-blue-600/40 shadow-blue-900/40 text-white",
    Drizzle: "bg-gradient-to-br from-slate-800 to-blue-800 border-blue-500/30 shadow-blue-900/30 text-white",
    Thunderstorm: "bg-gradient-to-br from-indigo-900 to-purple-900 border-purple-500/40 shadow-purple-900/40 text-white",
    Snow: "bg-gradient-to-br from-slate-200 to-white border-white shadow-white/10 text-slate-900",
    Default: "bg-gradient-to-br from-white/10 to-white/5 border-white/10 text-white"
};

const ANIMATED_ICONS = {
    Clear: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/clear-day.svg",
    Clouds: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/cloudy.svg",
    Rain: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/rain.svg",
    Drizzle: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/drizzle.svg",
    Thunderstorm: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/thunderstorms.svg",
    Snow: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/snow.svg",
    Default: "https://cdn.jsdelivr.net/gh/basmilius/weather-icons@master/design/fill/animation-ready/partly-cloudy-day.svg"
};

const FALLBACK_ICONS = {
    Clear: "https://openweathermap.org/img/wn/01d@4x.png",
    Clouds: "https://openweathermap.org/img/wn/03d@4x.png",
    Rain: "https://openweathermap.org/img/wn/10d@4x.png",
    Drizzle: "https://openweathermap.org/img/wn/09d@4x.png",
    Thunderstorm: "https://openweathermap.org/img/wn/11d@4x.png",
    Snow: "https://openweathermap.org/img/wn/13d@4x.png",
    Default: "https://openweathermap.org/img/wn/02d@4x.png"
};

export default function Weather() {
    const [weather, setWeather] = useState({ temp: '--', condition: 'Default' });

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const API_KEY = "25e905923b52230f8344bb3cbff4b588";

                // 1. Set your location here
                const CITY = "Austin,US"; // Change this to your desired city, e.g., "Round Rock,US"

                const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=imperial&appid=${API_KEY}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error("API not active yet");

                const data = await response.json();
                if (data.main && data.main.temp) {
                    setWeather({
                        temp: Math.round(data.main.temp),
                        condition: data.weather[0].main
                    });
                }
            } catch (error) {
                console.error("Weather fetch failed. Waiting for API key to activate...");
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const currentVibe = VIBES[weather.condition] || VIBES.Default;
    const currentIcon = ANIMATED_ICONS[weather.condition] || ANIMATED_ICONS.Default;

    return (
        // Replaced justify-between with precise gap spacing
        <div className={`py-[2.5vh] px-[1.5vw] rounded-[1vw] border shadow-xl flex flex-col items-center gap-[2vh] transition-colors duration-1000 ${currentVibe}`}>

            {/* Top Line: Logo */}


            {/* Middle Line: Icon (Left) and Temp (Right) */}
            <div className="w-full flex items-center justify-between px-[0.5vw]">
                <div className="flex flex-col items-center justify-center">
                    <div className="w-[5.5vw] h-[5.5vw] opacity-90">
                        <img
                            src={currentIcon}
                            alt={weather.condition}
                            className="w-full h-full drop-shadow-lg"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = FALLBACK_ICONS[weather.condition] || FALLBACK_ICONS.Default;
                            }}
                        />
                    </div>
                    <h3 className="text-[0.8vw] tracking-widest uppercase font-bold opacity-80 mt-[0.5vh] drop-shadow-sm text-center">
                        {weather.condition !== 'Default' ? weather.condition : 'Austin, TX'}
                    </h3>
                </div>

                <span className="text-[5vw] font-light tracking-tighter drop-shadow-md leading-none">
                    {weather.temp}°
                </span>
            </div>

            {/* Bottom Line: Massive Centered Time */}
            <div className="w-full shrink-0 flex justify-center border-t border-white/20 pt-[1.5vh]">
                <Clock />
            </div>

        </div>
    );
}