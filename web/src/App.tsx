import { useState, useRef, useEffect, type UIEvent } from 'react';
import { Button, Card, CardBody, Chip, ScrollShadow, Select, SelectItem, Divider, Tooltip, Popover, PopoverTrigger, PopoverContent, Input } from "@heroui/react";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from 'sonner';

const WS_URL = 'ws://localhost:8000/ws';

function App() {
  // --- 状态定义 ---
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<{ original: string; translation: string; time: string }[]>([]);
  
  // 本地持久化配置
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('rt-lang') || "auto");
  const [targetLanguage, setTargetLanguage] = useState<string>(() => localStorage.getItem('rt-target') || "zh-CN");
  const [engine, setEngine] = useState<string>(() => localStorage.getItem('rt-engine') || "google");
  const [provider, setProvider] = useState<string>(() => localStorage.getItem('rt-provider') || "deepseek");
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('rt-key') || "");
  
  // 校验相关
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [isValidating, setIsValidating] = useState(false);
  
  const [isAtBottom, setIsAtBottom] = useState(true); 
  const socketRef = useRef<WebSocket | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const isFirstRender = useRef(true);

  // 映射表
  const langMap: any = { auto: "智能识别", zh: "中文识别", en: "英文识别", ja: "日文识别" };
  const targetMap: any = { "zh-CN": "翻译为中文", en: "翻译为英文", ja: "翻译为日文" };

  // 自动滚动
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior });
      shouldAutoScrollRef.current = true;
      setIsAtBottom(true);
    }
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) scrollToBottom();
  }, [logs]);

  // 配置同步与保存
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

  // 发起 API Key 联网校验
  const handleApiKeyConfirm = () => {
    if (!tempApiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }
    setIsValidating(true);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "llm_api_key_validate",
        value: tempApiKey,
        provider: provider // 告诉后端用哪家的 URL 校验
      }));
    } else {
      toast.error("服务器未连接，请先开始识别");
      setIsValidating(false);
    }
  };

  const startRecording = () => {
    try {
      socketRef.current = new WebSocket(WS_URL);
      socketRef.current.onopen = () => {
        setIsRecording(true);
        toast.success("已成功连接服务器");
        socketRef.current?.send(JSON.stringify({
          type: "full_config",
          data: { language, targetLanguage, engine, provider, apiKey }
        }));
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "toast") {
          setIsValidating(false);
          if (data.status === "success") {
            setApiKey(tempApiKey);
            toast.success(data.message);
          } else {
            toast.error("验证失败", { description: data.message });
          }
          return;
        }
        if (data.original && data.original.trim()) {
          const newEntry = { 
            ...data, 
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
          };
          setLogs((prev) => [...prev, newEntry]);
        }
      };

      socketRef.current.onclose = () => setIsRecording(false);
      socketRef.current.onerror = () => setIsRecording(false);
    } catch (error) { toast.error("连接失败"); }
  };

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScrollRef.current = atBottom;
    setIsAtBottom(atBottom);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-[#e2e2e2] font-sans flex flex-col items-center select-none">
      <Toaster theme="dark" position="bottom-right" richColors />

      <div className="z-10 w-full max-w-5xl flex flex-col h-screen p-6 md:p-10">
        
        {/* Header */}
        <header className="flex justify-between items-end mb-10 px-2">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter italic">
              RT<span className="text-indigo-500">Trans</span>
            </h1>
            <p className="text-xs font-bold tracking-[0.4em] text-zinc-600 mt-2 uppercase">version 1.0</p>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-sm font-black text-zinc-500 tracking-widest mb-1 italic">ENGINE STATUS</span>
            <div className="flex items-center gap-4">
              {isRecording && <motion.div animate={{ opacity: [0.2, 1, 0.2], width: ["24px", "48px", "24px"] }} transition={{ repeat: Infinity, duration: 2 }} className="h-2 bg-red-500 rounded-full shadow-[0_0_15px_#6366f1]" />}
              <span className={`text-base font-black tracking-widest ${isRecording ? 'text-indigo-400' : 'text-zinc-500'}`}>{isRecording ? "ACTIVE" : "STANDBY"}</span>
            </div>
          </div>
        </header>

        {/* 字幕容器 */}
        <Card className="flex-1 bg-[#09090b] border-2 border-zinc-800 shadow-2xl rounded-[2.5rem] overflow-hidden flex flex-col relative">
          <div className="flex justify-between items-center px-10 py-7 border-b border-zinc-800 bg-[#0c0c0e] z-20">
            <span className="text-xl font-black text-zinc-200 uppercase">会话历史记录</span>
            {logs.length > 0 && <span className="text-sm font-bold text-zinc-500 uppercase">{logs.length} 条记录解析</span>}
          </div>

          <ScrollShadow ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 px-8 md:px-16 py-8" size={120}>
            <div className="min-h-full flex flex-col gap-20 pb-10">
              {logs.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-40 opacity-20 text-xs tracking-[1em] uppercase">Waiting for audio...</div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {logs.map((log, index) => (
                    <motion.div key={index} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center">
                      <div className="mb-6 flex items-center gap-8 w-full opacity-30 font-mono text-base font-black">
                         <div className="h-[1px] flex-1 bg-zinc-800" />{log.time}<div className="h-[1px] flex-1 bg-zinc-800" />
                      </div>
                      <p className="text-lg md:text-xl font-medium text-zinc-400 mb-6">{log.original}</p>
                      <p className="text-2xl md:text-3xl text-indigo-100 font-black italic">{log.translation || "..."}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </ScrollShadow>

          <AnimatePresence>
            {!isAtBottom && logs.length > 0 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
                <Button size="sm" onPress={() => scrollToBottom()} className="bg-indigo-600/90 text-white font-black text-[10px] rounded-full backdrop-blur-md px-6">VIEW LATEST ↓</Button>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* 控制底栏 */}
        <footer className="mt-10 flex justify-center pb-8">
          <div className="bg-[#121214] p-4 rounded-full border border-zinc-700 flex items-center gap-6 shadow-3xl">
             <div className="pl-6 flex items-center gap-5">
                <span className="text-sm font-black text-indigo-500 italic tracking-[0.2em]">LANG</span>
                <Select className="w-44" size="md" selectedKeys={[language]} onChange={(e) => {
                  const val = e.target.value; if(!val) return; setLanguage(val); toast.success(`${langMap[val]}`);
                }} classNames={{ trigger: "bg-transparent text-white border-none shadow-none !opacity-100", value: "text-zinc-100 font-black text-base uppercase", popoverContent: "bg-[#121214] border border-zinc-700 text-white !opacity-100 shadow-2xl" }}>
                  <SelectItem key="auto" textValue="智能识别">智能识别</SelectItem>
                  <SelectItem key="zh" textValue="中文识别">中文识别</SelectItem>
                  <SelectItem key="en" textValue="英文识别">英文识别</SelectItem>
                  <SelectItem key="ja" textValue="日文识别">日文识别</SelectItem>
                </Select>
             </div>

             <div className="pl-2 flex items-center gap-5">
                <span className="text-sm font-black text-indigo-500 italic tracking-[0.2em]">TARGET</span>
                <Select className="w-44" size="md" selectedKeys={[targetLanguage]} onChange={(e) => {
                  const val = e.target.value; if(!val) return; setTargetLanguage(val); toast.success(`${targetMap[val]}`);
                }} classNames={{ trigger: "bg-transparent text-white border-none shadow-none !opacity-100", value: "text-zinc-100 font-black text-base uppercase", popoverContent: "bg-[#121214] border border-zinc-700 text-white !opacity-100 shadow-2xl" }}>
                  <SelectItem key="zh-CN" textValue="翻译为中文">翻译为中文</SelectItem>
                  <SelectItem key="en" textValue="翻译为英文">翻译为英文</SelectItem>
                  <SelectItem key="ja" textValue="翻译为日文">翻译为日文</SelectItem>
                </Select>
             </div>

              <Divider orientation="vertical" className="h-10 bg-zinc-800" />

              {/* 核心改动：设置弹窗 */}
              <Popover placement="top" offset={20} classNames={{ content: "bg-[#121214] border border-zinc-700 shadow-2xl !opacity-100 p-0" }}>
                <PopoverTrigger><Button isIconOnly className="bg-zinc-800 text-zinc-400 rounded-full w-14 h-14 border border-zinc-700 font-black text-xs">SET</Button></PopoverTrigger>
                <PopoverContent className="w-[320px] p-6 !opacity-100">
                  <div className="flex flex-col gap-6 w-full text-[#e2e2e2]">
                    <div className="flex flex-col gap-3 text-center">
                      <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Translation Engine</span>
                      <Select size="sm" selectedKeys={[engine]} onChange={(e) => setEngine(e.target.value)} classNames={{ trigger: "bg-zinc-800 border-zinc-700 !opacity-100", popoverContent: "bg-[#18181b] border border-zinc-700 text-white !opacity-100" }}>
                        <SelectItem key="google" textValue="Google">Google (无需Key)</SelectItem>
                        <SelectItem key="llm" textValue="LLM (AI)">LLM (AI模式)</SelectItem>
                      </Select>
                    </div>

                    {engine === "llm" && (
                      <div className="flex flex-col gap-4">
                        {/* 供应商选择 */}
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">AI Provider</span>
                          <Select size="sm" selectedKeys={[provider]} onChange={(e) => setProvider(e.target.value)} classNames={{ trigger: "bg-zinc-800 border-zinc-700 !opacity-100", popoverContent: "bg-[#18181b] border border-zinc-700 text-white !opacity-100" }}>
                            <SelectItem key="deepseek" textValue="DeepSeek">DeepSeek</SelectItem>
                            <SelectItem key="openai" textValue="OpenAI">OpenAI</SelectItem>
                            <SelectItem key="siliconflow" textValue="SiliconFlow">SiliconFlow (硅基流动)</SelectItem>
                            <SelectItem key="openrouter" textValue="OpenRouter">OpenRouter (全能网关)</SelectItem>
                            <SelectItem key="gemini" textValue="Google Gemini">Google Gemini</SelectItem>
                            <SelectItem key="groq" textValue="Groq (极速)">Groq</SelectItem>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                           <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">API KEY</span>
                           <Input size="sm" placeholder="sk-..." value={tempApiKey} onValueChange={setTempApiKey} type="password" disabled={isValidating} classNames={{ inputWrapper: "bg-zinc-800 border-zinc-700 !opacity-100" }} />
                        </div>
                        <Button size="sm" color="primary" isLoading={isValidating} className="font-bold tracking-widest bg-indigo-600 shadow-lg" onPress={handleApiKeyConfirm}>
                          {isValidating ? "正在联网验证" : "确认并验证"}
                        </Button>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <div className="flex items-center gap-4">
                {!isRecording ? <Button onPress={startRecording} className="h-14 px-12 rounded-full bg-indigo-600 text-white font-black text-base tracking-widest shadow-xl">START</Button> : <Button onPress={() => socketRef.current?.close()} className="h-14 px-12 rounded-full bg-red-600 text-white font-black text-base tracking-widest shadow-xl">STOP</Button>}
                <Button onPress={() => { setLogs([]); toast.info("屏幕已清空"); }} className="h-14 px-8 rounded-full bg-zinc-800 text-zinc-300 font-black text-sm tracking-widest">CLEAR</Button>
              </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;