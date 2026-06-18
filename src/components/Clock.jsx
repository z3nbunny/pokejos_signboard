import React, { useState, useEffect } from 'react';

export default function Clock() {
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            }));
        };

        updateTime();
        const interval = setInterval(updateTime, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-[2.2vw] font-black tracking-widest text-white/90 drop-shadow-sm w-full text-center">
            {time}
        </div>
    );
}