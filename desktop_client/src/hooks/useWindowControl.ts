import { useEffect } from 'react';

export const useWindowControl = (isSettingsOpen: boolean, isLocked: boolean) => {
  useEffect(() => {
    if (window.electronAPI) {
      isSettingsOpen ? window.electronAPI.resizeWindow(800, 620) : window.electronAPI.resizeWindow(800, 180);
    }
  }, [isSettingsOpen]);

  useEffect(() => {
    if (window.electronAPI) {
      if (isLocked && !isSettingsOpen) {
          // 延迟执行鼠标穿透，给窗口 resize 留出时间，避免竞争导致 resize 失效
          const timer = setTimeout(() => {
              window.electronAPI.setIgnoreMouseEvents(true);
          }, 50);
          return () => clearTimeout(timer);
      } else {
          window.electronAPI.setIgnoreMouseEvents(false);
      }
    }
  }, [isLocked, isSettingsOpen]);

  const closeWindow = () => window.electronAPI?.closeWindow();
  const setIgnoreMouseEvents = (ignore: boolean) => window.electronAPI?.setIgnoreMouseEvents(ignore);
  const resetWindowSize = () => window.electronAPI?.resizeWindow(800, 180);

  return { closeWindow, setIgnoreMouseEvents, resetWindowSize };
};
