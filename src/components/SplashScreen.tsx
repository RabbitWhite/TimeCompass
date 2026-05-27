import { useState } from 'react';

const INTRO_SESSION_KEY = 'timecompass-intro-shown';

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    if (sessionStorage.getItem(INTRO_SESSION_KEY)) return false;
    sessionStorage.setItem(INTRO_SESSION_KEY, '1');
    return true;
  });
  const [showFallback, setShowFallback] = useState(false);

  if (!visible) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
      <video
        src="/TimeCompass/TimeCompass_Intro.mp4"
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: showFallback ? 'none' : 'block' }}
        onEnded={() => setVisible(false)}
        onError={() => setShowFallback(true)}
      />
      {showFallback && (
        <img
          src="/TimeCompass/cover.png"
          alt=""
          onClick={() => setVisible(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
        />
      )}
    </div>
  );
}
