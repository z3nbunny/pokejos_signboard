import React, { useState, useEffect } from 'react';

export default function Clock({ isFeature }) {
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('en-US', {
                timeZone: 'America/Chicago',
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
        <div className={`${isFeature ? 'text-[3.2vw]' : 'text-[2.2vw]'} font-regular tracking-widest text-black w-full text-center`}>
            {time}
        </div>
    );
}