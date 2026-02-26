import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
const SPLASH_SESSION_KEY = 'lifetracker-splash-shown';
export default function SplashScreen() {
    const [visible, setVisible] = useState(() => {
        // Only show once per browser session
        if (sessionStorage.getItem(SPLASH_SESSION_KEY))
            return false;
        sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
        return true;
    });
    const [fading, setFading] = useState(false);
    useEffect(() => {
        if (!visible)
            return;
        const fadeTimer = setTimeout(() => setFading(true), 2000);
        const removeTimer = setTimeout(() => setVisible(false), 2700);
        return () => {
            clearTimeout(fadeTimer);
            clearTimeout(removeTimer);
        };
    }, [visible]);
    if (!visible)
        return null;
    return (_jsx("div", { className: `splash-screen${fading ? ' splash-fade-out' : ''}`, children: _jsx("img", { src: `${"/Lifetracker/"}cover.png`, alt: "LifeTracker", className: "splash-cover" }) }));
}
