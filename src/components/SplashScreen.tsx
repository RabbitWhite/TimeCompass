import { useState, useEffect, useCallback } from 'react';
import { useApp } from '../store';

const SPLASH_SESSION_KEY = 'timecompass-splash-shown';
const COVER_PHASE_MS = 1500;
const MIN_DISPLAY_MS = 2000;

export default function SplashScreen() {
  const { state } = useApp();
  const { splashPhilosophyText, splashPrizeImage, splashDismissMode, splashDuration } = state.settings;

  const [visible, setVisible] = useState(() => {
    if (sessionStorage.getItem(SPLASH_SESSION_KEY)) return false;
    sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    return true;
  });
  const [fading, setFading] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [tapEnabled, setTapEnabled] = useState(false);

  const dismiss = useCallback(() => {
    if (fading) return;
    setFading(true);
    setTimeout(() => setVisible(false), 500);
  }, [fading]);

  useEffect(() => {
    if (!visible) return;

    const contentTimer = setTimeout(() => setContentVisible(true), COVER_PHASE_MS);
    const tapTimer    = setTimeout(() => setTapEnabled(true),    COVER_PHASE_MS);

    if (splashDismissMode === 'timed') {
      const duration = Math.max(splashDuration * 1000, MIN_DISPLAY_MS);
      const fadeTimer = setTimeout(() => dismiss(), duration);
      return () => {
        clearTimeout(contentTimer);
        clearTimeout(tapTimer);
        clearTimeout(fadeTimer);
      };
    }

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(tapTimer);
    };
  }, [visible, splashDismissMode, splashDuration, dismiss]);

  if (!visible) return null;

  return (
    <div
      onClick={splashDismissMode === 'tap' && tapEnabled ? dismiss : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'linear-gradient(135deg, rgba(30,20,60,0.97) 0%, rgba(15,10,30,0.97) 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
        cursor: splashDismissMode === 'tap' && tapEnabled ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
    >
      <img
        src="/Lifetracker/cover.png"
        alt=""
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
        }}
      />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 0,
      }} />
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        opacity: contentVisible ? 1 : 0,
        transition: 'opacity 0.5s ease',
      }}>
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
      </div>
      {splashDismissMode === 'tap' && (
        <p style={{
          position: 'absolute', bottom: '1.5rem',
          fontSize: 13, opacity: tapEnabled ? 0.45 : 0, margin: 0,
          transition: 'opacity 0.5s ease',
          zIndex: 1,
        }}>
          tap anywhere to continue
        </p>
      )}
      {splashDismissMode === 'tap' && !tapEnabled && (
        <div
          style={{ position: 'absolute', inset: 0, zIndex: 2, cursor: 'default' }}
          onClick={e => e.stopPropagation()}
        />
      )}
    </div>
  );
}
