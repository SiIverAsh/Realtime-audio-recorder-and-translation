import { useState, useRef } from 'react';
import { Toaster } from 'sonner';

import { Header } from './components/layout/Header';
import { LogList } from './components/log/LogList';

import { useSettings } from './hooks/useSettings';
import { useWebSocket } from './hooks/useWebSocket';
import { useWindowControl } from './hooks/useWindowControl';
import { useIdle } from './hooks/useIdle';

function App() {
  // 1. 状态与配置
  const [isLocked, setIsLocked] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 2. 自定义 Hooks
  const { config, ...settingsSetters } = useSettings();
  const { isRecording, logs, startRecording, stopRecording, clearLogs, validateApiKey } = useWebSocket(config);
  const { closeWindow, setIgnoreMouseEvents, resetWindowSize } = useWindowControl(isSettingsOpen, isLocked);
  const { isIdle, resetIdleTimer } = useIdle(isSettingsOpen);

  // Resize Handle Logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.screenY;
    const startHeight = window.outerHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const currentY = moveEvent.screenY;
      const newHeight = Math.max(180, startHeight + (currentY - startY)); // Min height 180
      window.electronAPI?.resizeWindow(800, newHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 3. 派生样式 (容器层)
  const containerStyle = { 
    // 录音时强制保持不透明度，不再自动隐藏
    backgroundColor: `rgba(0, 0, 0, ${ (!isIdle || isRecording) ? config.bgOpacity / 100 : 0.05 })`,
    borderColor: `rgba(255, 255, 255, ${(!isIdle || isRecording) ? 0.1 : 0.02})`,
    backdropFilter: 'blur(12px)',
    // 移除高度自适应逻辑，让 absolute layout (top-60 bottom-0) 接管高度
    // 这样黑框会永远填满 Header 下方的空间，随窗口拉伸而变大
  };

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent flex flex-col relative font-sans select-none" onMouseMove={resetIdleTimer}>
      <Toaster theme="dark" position="top-center" richColors />
      
      <Header 
        isRecording={isRecording}
        isLocked={isLocked}
        isSettingsOpen={isSettingsOpen}
        isIdle={isIdle}
        config={config}
        handlers={{
            startRecording,
            stopRecording,
            setIsLocked,
            setIsSettingsOpen,
            closeWindow,
            setIgnoreMouseEvents,
            resetWindowSize // 传递新函数
        }}
        settingsSetters={settingsSetters}
        settingsActions={{ clearLogs, validateApiKey }}
      />

      <div className="w-full absolute top-[60px] bottom-0 left-0 right-0 z-[10] pointer-events-none p-2 flex items-start">
        <div 
          className="relative w-full h-full rounded-xl border transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto flex flex-col shadow-2xl"
          onMouseEnter={() => setIgnoreMouseEvents(false)}
          onMouseLeave={() => { if(isLocked && !isSettingsOpen) setIgnoreMouseEvents(true); }}
          style={containerStyle}
        >
          <LogList logs={logs} isSettingsOpen={isSettingsOpen} />
          
          {/* Resize Handle (Only visible/active when unlocked) */}
          {!isLocked && (
             <div 
               className="absolute bottom-0 left-0 right-0 h-4 cursor-s-resize z-50 hover:bg-white/10 transition-colors"
               onMouseDown={handleResizeMouseDown}
             />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;