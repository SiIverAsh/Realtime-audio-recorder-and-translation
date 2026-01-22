import { useState, useRef, useCallback, useEffect } from 'react';

export const useIdle = (isSettingsOpen: boolean, timeout: number = 5000) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => { 
        if (!isSettingsOpen) setIsIdle(true); 
    }, timeout);
  }, [isSettingsOpen, timeout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => events.forEach(e => window.removeEventListener(e, resetIdleTimer));
  }, [resetIdleTimer]);

  return { isIdle, resetIdleTimer };
};
