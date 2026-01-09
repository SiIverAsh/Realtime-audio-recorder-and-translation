import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { Button, Select, SelectItem, Popover, PopoverTrigger, PopoverContent, Input, Divider } from "@heroui/react"; 
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from 'sonner';
import { Settings, X, Mic, Move, Lock, Unlock, Square, Play, Trash2, ArrowDown } from 'lucide-react';

const WS_URL = 'ws://localhost:8000/ws';

// --- 全局样式注入 ---
const GlobalStyles = () => (
  <style>{`
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    ::selection { background: rgba(99, 102, 241, 0.3); color: white; }
  `}</style>
);

// --- 打字机效果组件 ---
const TypewriterText = ({ text, className }: { text: string, className?: string }) => {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
      let index = displayedText.length;
      if (text.length < index) {
          setDisplayedText(text);
          return;
      }
      
      if (index >= text.length) return;
  
      const interval = setInterval(() => {
          if (index < text.length) {
              setDisplayedText(text.slice(0, index + 1));
              index++;
          } else {
              clearInterval(interval);
          }
      }, 30);
  
      return () => clearInterval(interval);
    }, [text]);
  
    return <p className={className}>{displayedText}</p>;
};

declare global {
  interface Window {
    electronAPI: {
      setIgnoreMouseEvents: (ignore: boolean) => void;
      resizeWindow: (width: number, height: number) => void;
      closeWindow: () => void;
    }
  }
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [logs, setLogs] = useState<{ original: string; translation: string; isFinal: boolean }[]>([]);
  
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('rt-lang') || "auto");
  const [targetLanguage, setTargetLanguage] = useState<string>(() => localStorage.getItem('rt-target') || "zh-CN");
  const [engine, setEngine] = useState<string>(() => localStorage.getItem('rt-engine') || "google");
  const [provider, setProvider] = useState<string>(() => localStorage.getItem('rt-provider') || "deepseek");
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('rt-key') || "");
  const [bgOpacity, setBgOpacity] = useState<number>(() => parseInt(localStorage.getItem('rt-opacity') || "60"));

  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isValidating, setIsValidating] = useState(false);

  // --- 字体自适应 ---
  const getDynamicFontSize = (translation: string, original: string) => {
    const combined = (translation || "") + (original || "");
    const totalWeight = Array.from(combined).reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 2 : 1), 0);
    if (totalWeight < 20) return "text-4xl";
    if (totalWeight < 40) return "text-3xl";
    if (totalWeight < 80) return "text-2xl";
    if (totalWeight < 120) return "text-xl";
    return "text-lg"; 
  };

  // --- 窗口高度控制 ---
  useEffect(() => {
    if (window.electronAPI) {
      if (isSettingsOpen) {
        window.electronAPI.resizeWindow(800, 520);
      } else {
        window.electronAPI.resizeWindow(800, 160);
      }
    }
  }, [isSettingsOpen]);

  // --- 锁屏逻辑 (默认状态) ---
  useEffect(() => {
    if (window.electronAPI) {
      const shouldIgnore = isLocked && !isSettingsOpen;
      window.electronAPI.setIgnoreMouseEvents(shouldIgnore);
    }
  }, [isLocked, isSettingsOpen]);

  // --- Idle 逻辑 ---
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
        if (!isSettingsOpen) setIsIdle(true);
    }, 5000);
  }, [isSettingsOpen]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown'];
    events.forEach(e => window.addEventListener(e, resetIdleTimer));
    resetIdleTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // --- 滚动逻辑 ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isAutoScrolling = useRef(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);
  const scrollbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateScrollbar = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
        const { scrollTop, scrollHeight, clientHeight } = container;
        if (scrollHeight > clientHeight) {
            const heightRatio = clientHeight / scrollHeight;
            const newThumbHeight = Math.max(heightRatio * clientHeight, 20);
            const maxScrollTop = scrollHeight - clientHeight;
            const maxThumbTop = clientHeight - newThumbHeight;
            setThumbHeight(newThumbHeight);
            setThumbTop((scrollTop / maxScrollTop) * maxThumbTop);
        } else {
            setThumbHeight(0);
        }
    }
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (bottomRef.current) {
        isAutoScrolling.current = true;
        bottomRef.current.scrollIntoView({ behavior, block: "end" });
        setTimeout(() => { isAutoScrolling.current = false; }, 800);
        setShowScrollBtn(false);
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        if (!isAutoScrolling.current) {
            setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 2);
        }
        updateScrollbar();
        setIsScrollbarVisible(true);
        if (scrollbarTimeoutRef.current) clearTimeout(scrollbarTimeoutRef.current);
        scrollbarTimeoutRef.current = setTimeout(() => setIsScrollbarVisible(false), 2000);
    }
  };

  useEffect(() => {
    updateScrollbar();
    window.addEventListener('resize', updateScrollbar);
    return () => window.removeEventListener('resize', updateScrollbar);
  }, [logs, isSettingsOpen, updateScrollbar]);

  useLayoutEffect(() => {
    if (!showScrollBtn) {
      scrollToBottom("auto");
    }
  }, [logs]);

  // --- WebSocket ---
  const socketRef = useRef<WebSocket | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    localStorage.setItem('rt-opacity', bgOpacity.toString());
  }, [bgOpacity]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    localStorage.setItem('rt-lang', language);
    localStorage.setItem('rt-target', targetLanguage);
    localStorage.setItem('rt-engine', engine);
    localStorage.setItem('rt-provider', provider);
    localStorage.setItem('rt-key', apiKey);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "config_update",
        data: { language, targetLanguage, engine, provider, apiKey }
      }));
    }
  }, [language, targetLanguage, engine, provider, apiKey]);

  const handleApiKeyConfirm = () => {
    if (!tempApiKey.trim()) { toast.error("Please enter API Key"); return; }
    setIsValidating(true);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "llm_api_key_validate", value: tempApiKey, provider }));
    } else {
      toast.error("Not connected");
      setIsValidating(false);
    }
  };

  const startRecording = () => {
    stopRecording();
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    socket.onopen = () => {
        setIsRecording(true);
        toast.success("Connected");
        socket.send(JSON.stringify({ type: "full_config", data: { language, targetLanguage, engine, provider, apiKey } }));
    };
    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "toast") {
          setIsValidating(false);
          data.status === "success" ? (setApiKey(tempApiKey), toast.success(data.message)) : toast.error(data.message);
          return;
        }
        if (data.original?.trim()) {
          const isFinal = data.is_final !== false;
          setLogs(prev => {
              const lastLog = prev.length > 0 ? prev[prev.length - 1] : null;
              const newLog = { original: data.original, translation: data.translation, isFinal };
              
              // 核心修复逻辑：
              // 1. 如果上一条是中间结果 (!isFinal)，直接替换。
              // 2. 如果上一条是最终结果 (isFinal)，但原文 (original) 和新的一样，说明是流式翻译的后续更新，也要替换！
              if (lastLog && (!lastLog.isFinal || (lastLog.isFinal && lastLog.original === newLog.original))) {
                  return [...prev.slice(0, -1), newLog];
              }
              
              // 否则才认为是新的一句话
              return [...prev, newLog];
          });
        }
    };
    socket.onclose = () => setIsRecording(false);
  };

  const stopRecording = () => {
    if (socketRef.current) { socketRef.current.close(); socketRef.current = null; }
    setIsRecording(false);
  };

  const clearSubtitles = () => { setLogs([]); toast.success("Cleared"); };
  const popoverProps = { classNames: { content: "bg-[#1b1b1f] border border-white/10 shadow-2xl z-[100]" } };

  return (
    <div className="w-screen h-screen overflow-hidden bg-transparent flex flex-col relative font-sans select-none" onMouseMove={resetIdleTimer} onMouseDown={resetIdleTimer} onKeyDown={resetIdleTimer}>
      <GlobalStyles />
      <Toaster theme="dark" position="top-center" richColors />
      
      {/* Header */}
      <div 
        className="absolute top-0 left-0 right-0 h-10 flex justify-between items-center px-4 z-[70] transition-all duration-500 rounded-b-xl border-b"
        style={{ 
            backgroundColor: `rgba(0, 0, 0, ${ (!isIdle || isSettingsOpen) ? Math.max(bgOpacity / 100, 0.45) : 0.05 })`,
            backdropFilter: 'blur(12px)',
            borderColor: `rgba(255, 255, 255, ${(!isIdle || isSettingsOpen) ? 0.12 : 0.02})`
        }}
        // Header 也要控制鼠标穿透，防止锁定模式下无法操作头部
        onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents(false)}
        onMouseLeave={() => { if(isLocked && !isSettingsOpen) window.electronAPI?.setIgnoreMouseEvents(true); }}
      >
        <div className="drag-region flex-1 h-full cursor-move flex items-center gap-4">
            <Move size={14} className="text-white/40" />
            <div className="no-drag">
                 <Button size="sm" isIconOnly className={`w-6 h-6 border ${isRecording ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`} onPress={isRecording ? stopRecording : startRecording}>
                    {isRecording ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
                 </Button>
            </div>
        </div>
        
        <div className="flex items-center gap-4 no-drag transition-opacity duration-500">
            <button onClick={() => setIsLocked(!isLocked)} className={isLocked ? 'text-red-400' : 'text-white/60 hover:text-white'}>
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
            <Popover placement="bottom-end" offset={10} onOpenChange={setIsSettingsOpen} classNames={popoverProps.classNames}>
                <PopoverTrigger><button className="text-white/60 hover:text-white"><Settings size={16} /></button></PopoverTrigger>
                <PopoverContent className="w-[340px] p-5 text-[#e2e2e2]">
                    <div className="flex flex-col gap-4 w-full">
                        <span className="text-[10px] font-black text-zinc-500 uppercase border-b border-white/10 pb-2 tracking-widest text-left">Control Panel</span>
                        <div className="flex flex-col gap-2">
                             <div className="flex justify-between items-center text-[10px] text-zinc-500 uppercase text-left"><span>UI Opacity</span><span className="text-indigo-400">{bgOpacity}%</span></div>
                             <input type="range" min="10" max="100" value={bgOpacity} onChange={(e) => setBgOpacity(Number(e.target.value))} className="w-full h-1 bg-zinc-700 rounded-lg accent-indigo-500" />
                        </div>
                        {[
                          { label: "Source Lang", val: language, set: setLanguage, opts: [{k:"auto",v:"Auto Detect"}, {k:"ja",v:"Japanese"}, {k:"en",v:"English"}] },
                          { label: "Target Lang", val: targetLanguage, set: setTargetLanguage, opts: [{k:"zh-CN",v:"Simplified Chinese"}, {k:"en",v:"English"}] },
                          { label: "Engine", val: engine, set: setEngine, opts: [{k:"google",v:"Google Translate"}, {k:"llm",v:"LLM (AI)"}] }
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-medium text-zinc-500 uppercase">{item.label}</span>
                              <Select size="sm" selectedKeys={[item.val]} popoverProps={popoverProps} onChange={(e) => e.target.value && item.set(e.target.value)} className="w-[160px]" classNames={{ trigger: "bg-zinc-800/50 h-8", value: "text-xs" }}>
                                  {item.opts.map(o => <SelectItem key={o.k} className="text-xs text-white">{o.v}</SelectItem>)}
                              </Select>
                          </div>
                        ))}

                        {engine === "llm" && (
                            <div className="flex flex-col gap-3 pl-2 border-l-2 border-indigo-500/30 mt-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-medium text-zinc-500 uppercase">Provider</span>
                                    <Select size="sm" selectedKeys={[provider]} popoverProps={popoverProps} onChange={(e) => e.target.value && setProvider(e.target.value)} className="w-[160px]" classNames={{ trigger: "bg-zinc-800/50 h-8", value: "text-xs" }}>
                                        {["deepseek", "openai", "siliconflow", "gemini", "groq"].map(p => <SelectItem key={p} className="text-xs text-white capitalize">{p}</SelectItem>)}
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-medium text-zinc-500 uppercase">API Key</span>
                                    <div className="flex gap-2 w-[160px]">
                                        <Input size="sm" type="password" value={tempApiKey} onValueChange={setTempApiKey} classNames={{ inputWrapper: "bg-zinc-800/50 h-8", input: "text-xs" }} />
                                        <Button size="sm" isIconOnly onPress={handleApiKeyConfirm} isLoading={isValidating} className="bg-indigo-600 h-8 w-8 min-w-8">✓</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Divider className="bg-white/5" />
                        <Button color="danger" variant="flat" size="sm" startContent={<Trash2 size={14}/>} onPress={clearSubtitles} className="w-full font-black text-[10px] uppercase tracking-widest">Clear Subtitles</Button>
                    </div>
                </PopoverContent>
            </Popover>
            <button onClick={() => window.electronAPI?.closeWindow()} className="text-white/60 hover:text-red-400"><X size={18} /></button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full absolute top-[50px] bottom-0 left-0 right-0 z-10 pointer-events-none p-2 flex items-start">
        
        {/* --- 核心修复：Flex 布局父容器 + 鼠标事件守卫 --- */}
        <div 
            // 1. 添加 flex flex-col 确保内部 flex-1 生效，解决高度塌陷导致的无法滚动
            // 2. 添加 onMouseEnter/Leave 确保鼠标在字幕上时，必定取消穿透，允许滚动和点击
            className="relative w-full rounded-xl border transition-all duration-300 ease-in-out overflow-hidden pointer-events-auto flex flex-col"
            onMouseEnter={() => window.electronAPI?.setIgnoreMouseEvents(false)}
            onMouseLeave={() => { if(isLocked && !isSettingsOpen) window.electronAPI?.setIgnoreMouseEvents(true); }}
            style={{ 
                backgroundColor: `rgba(0, 0, 0, ${ !isIdle ? bgOpacity / 100 : 0.05 })`,
                borderColor: `rgba(255, 255, 255, ${!isIdle ? 0.1 : 0.02})`,
                backdropFilter: 'blur(12px)',
                height: isSettingsOpen ? '440px' : 'auto',
                maxHeight: isSettingsOpen ? '440px' : '120px', 
            }}
        >
            {/* 滚动区域：使用 flex-1 自动填满剩余空间 */}
            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="no-scrollbar flex-1 w-full overflow-y-auto px-10 py-4 relative"
            >
                <div 
                    className={`absolute right-1 w-1 rounded-full bg-black/50 transition-opacity duration-300 ${isScrollbarVisible ? 'opacity-100' : 'opacity-0'}`}
                    style={{ top: thumbTop, height: thumbHeight }} 
                />

                {!isRecording && logs.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[60px] text-[10px] text-white/40 uppercase font-black tracking-widest">Ready</div>
                ) : (
                    <div className="flex flex-col gap-6 w-full pb-2">
                        <AnimatePresence mode="popLayout">
                            {logs.map((log, index) => (
                                <motion.div 
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} 
                                    className={`flex flex-col items-center text-center gap-1 w-full shrink-0 ${!log.isFinal ? 'opacity-60' : 'opacity-100'}`}
                                >
                                    <p className={`${getDynamicFontSize(log.translation, log.original)} text-white drop-shadow-[0_2px_12px_rgba(0,0,0,1)] font-bold leading-tight break-words w-full px-2`}>
                                        {log.translation || "..."}
                                    </p>
                                    <TypewriterText 
                                        text={log.original} 
                                        className="text-sm text-white/40 break-words w-full px-4" 
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        {/* 底部垫片 */}
                        <div ref={bottomRef} className="h-6 w-full shrink-0" />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showScrollBtn && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[50]"
                    >
                        <Button 
                            size="sm" 
                            onPress={() => scrollToBottom("smooth")} 
                            className="rounded-full bg-black/90 text-white shadow-[0_4px_12px_rgba(0,0,0,0.8)] h-7 px-4 font-bold text-[10px] uppercase tracking-widest border border-white/10 backdrop-blur-md"
                            startContent={<ArrowDown size={14}/>}
                        >
                            Latest
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default App;