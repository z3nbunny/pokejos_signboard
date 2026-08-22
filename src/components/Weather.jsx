import React, { useState, useEffect } from 'react';
import Clock from './Clock';

export default function Weather({ isFeature }) {
    // We now store the exact weather ID and iconCode from the API
    const [weather, setWeather] = useState({ temp: '--', id: 800, iconCode: '01d' });

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                const API_KEY = "25e905923b52230f8344bb3cbff4b588";
                const CITY = "Austin,US";

                const url = `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&units=imperial&appid=${API_KEY}`;

                const response = await fetch(url);
                if (!response.ok) throw new Error("API not active yet");

                const data = await response.json();
                if (data.main && data.weather && data.weather.length > 0) {
                    setWeather({
                        temp: Math.round(data.main.temp),
                        id: data.weather[0].id,         // e.g., 721 for Haze
                        iconCode: data.weather[0].icon  // e.g., '01n' for Night
                    });
                }
            } catch (error) {
                console.error("Weather fetch failed.");
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 15 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    // The Engine: Maps OWM's strict IDs to Meteocon's file names
    const getMeteoconName = (id, iconCode) => {
        // If the OWM icon code ends in 'n', the sun has officially set!
        const isDay = iconCode.endsWith('d');
        const dayNight = isDay ? 'day' : 'night';

        // 200s: Thunderstorms
        if (id >= 200 && id < 300) return `thunderstorms-${dayNight}`;
        // 300s: Drizzle
        if (id >= 300 && id < 400) return 'drizzle';
        // 500s: Rain
        if (id >= 500 && id < 600) {
            if (id === 500 || id === 501) return `partly-cloudy-${dayNight}-rain`;
            return 'rain';
        }
        // 600s: Snow
        if (id >= 600 && id < 700) return 'snow';
        // 700s: Atmosphere (Granular checks!)
        if (id === 711) return 'smoke';
        if (id === 721) return `haze-${dayNight}`;
        if (id === 731 || id === 761) return 'dust';
        if (id === 741) return `fog-${dayNight}`;
        if (id === 781) return 'tornado';
        if (id >= 700 && id < 800) return 'mist';
        // 800: Clear
        if (id === 800) return `clear-${dayNight}`;
        // 801-804: Clouds
        if (id === 801) return `partly-cloudy-${dayNight}`;
        if (id === 802) return 'cloudy';
        if (id === 803 || id === 804) return `overcast-${dayNight}`;

        // Safe fallback
        return `partly-cloudy-${dayNight}`;
    };

    // Build the dynamic URLs
    const iconName = getMeteoconName(weather.id, weather.iconCode);
    const currentIcon = `https://cdn.meteocons.com/3.0.0-next.10/svg/monochrome/${iconName}.svg`;
    const fallbackIcon = `https://openweathermap.org/img/wn/${weather.iconCode}@4x.png`;

    return (
        <div className={`w-full h-full flex transition-all duration-1000 overflow-hidden text-black ${isFeature ? 'flex-row items-center justify-center gap-[4vw]' : 'flex-col items-center justify-center gap-[2vh] p-[1vw]'
            }`}>

            <div className={`flex items-center justify-center ${isFeature ? 'flex-row gap-[2vw]' : 'flex-col gap-[0vh]'
                }`}>
                <div className={`${isFeature ? 'w-[4vw] h-[4vw]' : 'w-[8vw] h-[8vw]'} overflow-hidden flex items-center justify-center shrink-0`}>
                    <img
                        src={currentIcon}
                        alt="Weather Icon"
                        className="w-full h-full object-contain brightness-0 scale-[1.3]"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = fallbackIcon;
                            // Removes the black silhouette filter so the colored PNG backup works!
                            e.target.classList.remove('brightness-0');
                        }}
                    />
                </div>
                <span className={`${isFeature ? 'text-[3vw]' : 'text-[3.5vw]'} font-bold tracking-tight leading-none`}>
                    {weather.temp}°
                </span>
            </div>

            <div className={`flex items-center justify-center ${isFeature ? 'border-l-2 border-black/20 pl-[4vw] h-[50%]' : 'border-t-2 border-black/20 pt-[2vh] w-[80%]'
                }`}>
                <Clock isFeature={isFeature} />
            </div>

        </div>
    );
}