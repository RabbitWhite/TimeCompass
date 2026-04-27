import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { useApp } from '../store.js';
const INTRO_SESSION_KEY = 'timecompass-intro-shown';
export default function SplashScreen() {
    const { state } = useApp();
    const { splashPhilosophyText, splashPrizeImage, splashDismissMode, splashDuration } = state.settings;
    const [visible, setVisible] = useState(() => {
        if (sessionStorage.getItem(INTRO_SESSION_KEY))
            return false;
        sessionStorage.setItem(INTRO_SESSION_KEY, '1');
        return true;
    });
    if (!visible)
        return null;
    return (_jsx("div", { style: { position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }, children: _jsx("video", { src: "/Lifetracker/TimeCompass_Intro.mp4", autoPlay: true, muted: true, playsInline: true, style: { width: '100%', height: '100%', objectFit: 'cover' }, onEnded: () => setVisible(false), onError: () => setVisible(false) }) }));
}
