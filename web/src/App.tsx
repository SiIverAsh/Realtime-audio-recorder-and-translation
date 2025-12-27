import { useState, useRef, useEffect, type UIEvent } from 'react';
import { Button, Card, CardBody, Chip, ScrollShadow, Select, SelectItem, Divider, Tooltip, Popover, PopoverTrigger, PopoverContent, Input } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";

const WS_URL = 'ws://localhost:8000/ws';

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<{ original: string; translation: string; time: string }[]>([]);
  const [language, setLanguage] = useState<string>("auto");
  const [targetLanguage, setTargetLanguage] = useState<string>("zh-CN");
  const [engine, setEngine] = useState<string>("google");
  const [apiKey, setApiKey] = useState<string>("");
  
  const socketRef = useRef<WebSocket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (shouldAutoScrollRef.current && scrollContainerRef.current) {
      const scrollTarget = scrollContainerRef.current;
      scrollTarget.scrollTo({ top: scrollTarget.scrollHeight, behavior: "smooth" });
    }
  }, [logs]);

  // 监听语言设置变化并发送给后端
  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "language", value: language }));
    }
  }, [language]);

  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "target_language", value: targetLanguage }));
    }
  }, [targetLanguage]);

  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "translation_engine", value: engine }));
    }
  }, [engine]);

  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "llm_api_key", value: apiKey }));
    }
  }, [apiKey]);

  const startRecording = () => {
    try {
      socketRef.current = new WebSocket(WS_URL);
      socketRef.current.onopen = () => {
        setIsRecording(true);
        // 连接建立时发送当前配置
        socketRef.current?.send(JSON.stringify({ type: "language", value: language }));
        socketRef.current?.send(JSON.stringify({ type: "target_language", value: targetLanguage }));
        socketRef.current?.send(JSON.stringify({ type: "translation_engine", value: engine }));
        socketRef.current?.send(JSON.stringify({ type: "llm_api_key", value: apiKey }));
      };
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const newEntry = { ...data, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        setLogs((prev) => [...prev, newEntry]);
      };
      socketRef.current.onclose = () => setIsRecording(false);
      socketRef.current.onerror = () => setIsRecording(false);
    } catch (error) { console.error('Connection failed:', error); }
  };

  const stopRecording = () => { socketRef.current?.close(); setIsRecording(false); };
  const clearLogs = () => setLogs([]);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    shouldAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 50;
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#e2e2e2] font-sans flex flex-col items-center">
      <div className="z-10 w-full max-w-5xl flex flex-col h-screen p-6 md:p-10">
        
        {/* --- 顶部栏 --- */}
        <header className="flex justify-between items-end mb-10 px-2">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-[-0.05em] leading-none">
              SILVER<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">ASH</span>
            </h1>
            <p className="text-[11px] font-bold tracking-[0.4em] text-zinc-600 mt-3 uppercase">
              Realtime Translate v1.0
            </p>
          </div>
          
          {/* 右上角状态指示 */}
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-zinc-500 tracking-widest mb-1 italic">ENGINE STATUS</span>
            <div className="flex items-center gap-4">
              {isRecording && (
                <motion.div 
                  animate={{ opacity: [0.2, 1, 0.2], width: ["24px", "48px", "24px"] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-2 bg-indigo-500 rounded-full shadow-[0_0_15px_#6366f1]"
                />
              )}
              <span className={`text-base font-black tracking-widest ${isRecording ? 'text-indigo-400' : 'text-zinc-500'}`}>
                {isRecording ? "SYSTEM ACTIVE" : "STANDBY"}
              </span>
            </div>
          </div>
        </header>

        {/* --- 主内容区 --- */}
        <Card className="flex-1 bg-[#09090b] border-2 border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center px-10 py-7 border-b border-zinc-800 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <span className="text-sm font-black text-indigo-500 tracking-[0.2em] italic">HISTORY</span>
              <span className="text-lg font-black text-zinc-200 tracking-tight uppercase">会话历史记录</span>
            </div>
            
            {/* 解析记录文字 */}
            {logs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-indigo-400 font-mono tracking-tighter">{logs.length}</span>
                <span className="text-sm font-bold text-zinc-500 uppercase tracking-wide">条记录已解析</span>
              </div>
            )}
          </div>

          <ScrollShadow 
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 px-8 md:px-16 py-8"
            size={120}
            hideScrollBar={false}
          >
            <div className="min-h-full flex flex-col gap-20 pb-10">
              {logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40">
                  <span className="text-xs tracking-[1em] font-black text-zinc-800 uppercase animate-pulse">
                    Waiting for voice stream
                  </span>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {logs.map((log, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      className="flex flex-col items-center text-center max-w-3xl mx-auto w-full group"
                    >
                      <div className="mb-6 flex items-center gap-8 w-full opacity-40 group-hover:opacity-100 transition-all duration-500">
                         <div className="h-[1px] flex-1 bg-zinc-800" />
                         <span className="text-base font-black font-mono text-zinc-500 tracking-[-0.05em]">
                            {log.time}
                         </span>
                         <div className="h-[1px] flex-1 bg-zinc-800" />
                      </div>

                      <p className="text-lg md:text-xl font-medium text-zinc-400 leading-relaxed tracking-tight mb-6 px-10">
                        {log.original}
                      </p>
                      
                      <div className="relative">
                        <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                        <p className="relative text-2xl md:text-3xl text-indigo-100 font-black tracking-tight leading-tight italic">
                          {log.translation || "..."}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollShadow>
        </Card>

        {/* --- 底部控制栏 */}
        <footer className="mt-10 flex justify-center pb-8">
          <div className="bg-[#121214] p-4 rounded-full border border-zinc-700 flex items-center gap-6 shadow-3xl">
             
             {/* 语言选择区域 */}
             <div className="pl-6 pr-2 flex items-center gap-5">
                <span className="text-sm font-black text-indigo-500 italic tracking-[0.2em]">LANG</span>
                <Select 
                  className="w-44" 
                  size="md"
                  selectedKeys={[language]} 
                  onChange={(e) => setLanguage(e.target.value)}
                  classNames={{
                    trigger: "bg-transparent text-white border-none shadow-none h-auto p-0 !opacity-100 min-h-[unset]",
                    value: "text-zinc-100 font-black text-base tracking-tight uppercase",
                    popoverContent: "bg-[#121214] border border-zinc-700 text-zinc-300 rounded-xl"
                  }}
                >
                  <SelectItem key="auto" textValue="智能自动识别">智能自动识别</SelectItem>
                  <SelectItem key="zh" textValue="中文识别模式">中文识别模式</SelectItem>
                  <SelectItem key="en" textValue="英文识别模式">英文识别模式</SelectItem>
                  <SelectItem key="ja" textValue="日文识别模式">日文识别模式</SelectItem>
                </Select>
             </div>

             {/* 目标语言选择区域 */}
             <div className="pl-2 pr-2 flex items-center gap-5">
                <span className="text-sm font-black text-indigo-500 italic tracking-[0.2em]">TARGET</span>
                <Select 
                  className="w-44" 
                  size="md"
                  selectedKeys={[targetLanguage]} 
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  classNames={{
                    trigger: "bg-transparent text-white border-none shadow-none h-auto p-0 !opacity-100 min-h-[unset]",
                    value: "text-zinc-100 font-black text-base tracking-tight uppercase",
                    popoverContent: "bg-[#121214] border border-zinc-700 text-zinc-300 rounded-xl"
                  }}
                >
                  <SelectItem key="zh-CN" textValue="翻译为中文">翻译为中文</SelectItem>
                  <SelectItem key="en" textValue="翻译为英文">翻译为英文</SelectItem>
                  <SelectItem key="ja" textValue="翻译为日文">翻译为日文</SelectItem>
                </Select>
             </div>

              <Divider orientation="vertical" className="h-10 bg-zinc-800" />

              {/* 引擎设置按钮 */}
              <Popover placement="top" showArrow={true} offset={20} classNames={{ content: "bg-[#18181b] border border-zinc-700" }}>
                <PopoverTrigger>
                  <Button isIconOnly className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-full w-14 h-14 border border-zinc-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-4">
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Translation Engine</span>
                      <Select 
                        size="sm"
                        selectedKeys={[engine]} 
                        onChange={(e) => setEngine(e.target.value)}
                        classNames={{
                          trigger: "bg-zinc-800 border-zinc-700 text-white",
                          popoverContent: "bg-[#18181b] border border-zinc-700 text-zinc-300"
                        }}
                      >
                        <SelectItem key="google" textValue="Google Translate">Google Translate</SelectItem>
                        <SelectItem key="llm" textValue="LLM (DeepSeek/OpenAI)">LLM (DeepSeek/OpenAI)</SelectItem>
                      </Select>
                    </div>

                    {engine === "llm" && (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">API Key</span>
                        <Input 
                          size="sm"
                          placeholder="sk-..." 
                          value={apiKey}
                          onValueChange={setApiKey}
                          type="password"
                          classNames={{
                            inputWrapper: "bg-zinc-800 border-zinc-700 group-data-[focus=true]:bg-zinc-800",
                            input: "text-white placeholder:text-zinc-600"
                          }}
                        />
                        <p className="text-[10px] text-zinc-500">Leave empty to use server config</p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* 操作按钮区域 */}
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <Button 
                    onPress={startRecording}
                    className="h-14 px-12 rounded-full bg-indigo-600 text-white font-black text-base tracking-widest hover:bg-indigo-500 hover:scale-105 transition-all shadow-xl shadow-indigo-900/30"
                  >
                    START SESSION
                  </Button>
                ) : (
                  <Button 
                    onPress={stopRecording}
                    className="h-14 px-12 rounded-full bg-red-600 text-white font-black text-base tracking-widest hover:bg-red-500 hover:scale-105 transition-all shadow-xl shadow-red-900/30"
                  >
                    STOP STREAM
                  </Button>
                )}

                <Tooltip content="清除所有历史记录" delay={0}>
                  <Button 
                    onPress={clearLogs}
                    isDisabled={logs.length === 0}
                    className="h-14 px-8 rounded-full bg-zinc-800 text-zinc-300 font-black text-sm tracking-widest hover:text-white hover:bg-zinc-700 transition-all border border-zinc-700"
                  >
                    CLEAR
                  </Button>
                </Tooltip>
              </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;