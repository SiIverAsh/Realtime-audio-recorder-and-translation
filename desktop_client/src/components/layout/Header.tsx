import { Button, Popover, PopoverTrigger, PopoverContent } from "@heroui/react";
import { Settings, X, Lock, Unlock, Square, Play, Move, RotateCcw } from 'lucide-react';
import type { AppConfig } from '../../types';
import { SettingsPanel } from '../settings/SettingsPanel';

interface HeaderProps {
  isRecording: boolean;
  isLocked: boolean;
  isSettingsOpen: boolean;
  isIdle: boolean; // 新增属性：用于控制空闲时隐藏
  config: AppConfig;
  handlers: {
    startRecording: () => void;
    stopRecording: () => void;
    setIsLocked: (v: boolean) => void;
    setIsSettingsOpen: (v: boolean) => void;
    closeWindow: () => void;
    setIgnoreMouseEvents: (ignore: boolean) => void;
    resetWindowSize: () => void;
  };
  settingsSetters: any; // 透传给 SettingsPanel
  settingsActions: any; // 透传给 SettingsPanel
}

export const Header = ({ 
  isRecording, isLocked, isSettingsOpen, isIdle, config, 
  handlers, settingsSetters, settingsActions 
}: HeaderProps) => {
    
  // 基于状态动态计算 Header 样式
  const headerStyle = {
    // 恢复逻辑：如果不是空闲状态 或者 设置面板已打开 或者 正在录音，则显示高不透明度；否则隐藏为极低透明度
    backgroundColor: `rgba(0, 0, 0, ${ (!isIdle || isSettingsOpen || isRecording) ? Math.max(config.bgOpacity / 100, 0.45) : 0.05 })`,
    backdropFilter: 'blur(12px)',
    borderColor: `rgba(255, 255, 255, ${(!isIdle || isSettingsOpen || isRecording) ? 0.12 : 0.02})`
  };

  return (
    <div 
      className="absolute top-[6px] left-0 right-0 h-10 flex justify-between items-center px-4 z-[100] transition-all duration-500 rounded-b-xl border-b pointer-events-auto"
      style={headerStyle} 
      onMouseEnter={() => handlers.setIgnoreMouseEvents(false)}
      onMouseLeave={() => { if(isLocked && !isSettingsOpen) handlers.setIgnoreMouseEvents(true); }}
    >
      <div className="drag-region flex-1 h-full cursor-move flex items-center gap-4">
        <Move size={14} className="text-white/40" />
        <div className="no-drag">
          <Button 
            size="sm" 
            isIconOnly 
            className={`w-6 h-6 border ${isRecording ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`} 
            onPress={isRecording ? handlers.stopRecording : handlers.startRecording}
          >
            {isRecording ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-4 no-drag transition-opacity duration-500">
        <button onClick={handlers.resetWindowSize} className="text-white/60 hover:text-white" title="还原默认大小">
            <RotateCcw size={16} />
        </button>

        <button onClick={() => handlers.setIsLocked(!isLocked)} className={isLocked ? 'text-red-400' : 'text-white/60 hover:text-white'}>
          {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
        </button>
        
        <Popover 
            placement="bottom-end" 
            offset={10} 
            isOpen={isSettingsOpen} 
            onOpenChange={handlers.setIsSettingsOpen} 
            classNames={{ content: "bg-[#1b1b1f] border border-white/10 shadow-2xl z-[100]" }}
        >
          <PopoverTrigger>
            <button className="text-white/60 hover:text-white"><Settings size={16} /></button>
          </PopoverTrigger>
          <PopoverContent className="w-[340px] p-5 text-[#e2e2e2]">
            <SettingsPanel config={config} setters={settingsSetters} actions={settingsActions} />
          </PopoverContent>
        </Popover>

        <button onClick={handlers.closeWindow} className="text-white/60 hover:text-red-400">
            <X size={18} />
        </button>
      </div>
    </div>
  );
};