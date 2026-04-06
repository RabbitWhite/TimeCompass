import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../store';

const SPLASH_SESSION_KEY = 'lifetracker-splash-shown';

export default function SplashScreen() {
  const { state } = useApp();
  const { splashPhilosophyText, splashPrizeImage, splashDismissMode, splashDuration } = state.settings;

  const [visible, setVisible] = useState(() => {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return false;
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    return true;
  });
  const [fading, setFading] = useState(false);

  const dismiss = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => setVisible(false), 500);
  }, [fading]);

  useEffect(() => {
    if (!visible) return;
    if (splashDismissMode === 'timed') {
      const fadeTimer = setTimeout(() => dismiss(), splashDuration * 1000);
      return () => clearTimeout(fadeTimer);
    }
  }, [visible, splashDismissMode, splashDuration, dismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={splashDismissMode === 'tap' ? dismiss : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(30,20,60,0.97) 0%, rgba(15,10,30,0.97) 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
        cursor: splashDismissMode === 'tap' ? 'pointer' : 'default',
      }}
    >
      {splashPhilosophyText && (
        <p style={{
          fontSize: 16, lineHeight: 1.7,
          textAlign: 'center', maxWidth: 480,
          whiteSpace: 'pre-wrap', marginBottom: splashPrizeImage ? '1.5rem' : 0,
        }}>
          {splashPhilosophyText}
        </p>
      )}
      {splashPrizeImage && (
        <img
          src={splashPrizeImage}
          alt="Prize"
          style={{
            maxHeight: '60vh', maxWidth: '100%',
            objectFit: 'contain', borderRadius: 8,
          }}
        />
      )}
      {splashDismissMode === 'tap' && (
        <p style={{
          position: 'absolute', bottom: '1.5rem',
          fontSize: 13, opacity: 0.45, margin: 0,
        }}>
          tap anywhere to continue
        </p>
      )}
    </div>
  );
}
