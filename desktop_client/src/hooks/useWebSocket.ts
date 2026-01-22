import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { AppConfig, LogEntry } from '../types';

// 开发环境硬编码地址，生产环境建议使用 import.meta.env.VITE_WS_URL
const WS_URL = 'ws://localhost:8000/ws'; 

export const useWebSocket = (config: AppConfig) => {
  const [isRecording, setIsRecording] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const prevConfigRef = useRef<string>("");

  // 当配置变更且 Socket 处于连接状态时同步配置
  useEffect(() => {
    // 提取仅后端关心的配置项，排除前端 UI 配置 (如 bgOpacity)
    const { language, targetLanguage, engine, provider, apiKey } = config;
    const backendConfig = { language, targetLanguage, engine, provider, apiKey };
    const configStr = JSON.stringify(backendConfig);
    
    // 只有当后端相关配置内容真正改变，且 Socket 是连接状态时才发送
    if (socketRef.current?.readyState === WebSocket.OPEN && configStr !== prevConfigRef.current) {
      socketRef.current.send(JSON.stringify({ 
        type: "config_update", 
        data: backendConfig 
      }));
      prevConfigRef.current = configStr;
    }
  }, [config.language, config.targetLanguage, config.engine, config.provider, config.apiKey]); // 明确依赖项，不包含 config.bgOpacity 

  const startRecording = () => {
    const socket = new WebSocket(WS_URL);
    socketRef.current = socket;
    
    socket.onopen = () => {
      setIsRecording(true);
      const { language, targetLanguage, engine, provider, apiKey } = config;
      const backendConfig = { language, targetLanguage, engine, provider, apiKey };
      
      // 初始化发送完整配置，并更新 ref 以防止 useEffect 立即再次发送
      prevConfigRef.current = JSON.stringify(backendConfig);
      socket.send(JSON.stringify({ 
        type: "full_config", 
        data: backendConfig 
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // 处理 Toast 通知 (验证结果/错误信息)
      if (data.type === "toast") {
        data.status === "success" ? toast.success(data.message) : toast.error(data.message);
        return;
      }

      // 处理字幕数据
      if (data.original?.trim()) {
        setLogs(prev => {
          const lastLog = prev.length > 0 ? prev[prev.length - 1] : null;
          // 获取时间戳：优先使用后端传来的，否则使用本地当前时间
          const timestamp = data.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          
          const newLog: LogEntry = { 
            original: data.original, 
            translation: data.translation, 
            isFinal: data.is_final !== false,
            timestamp: timestamp
          };
          
          // 如果上一条还没完结（流式更新中），则替换上一条
          if (lastLog && !lastLog.isFinal) {
            // 保持上一条的时间戳，除非后端发了新的
            return [...prev.slice(0, -1), { ...newLog, timestamp: lastLog.timestamp || timestamp }];
          }
          // 否则追加新的一条
          return [...prev, newLog];
        });
      }
    };

    socket.onclose = () => setIsRecording(false);
  };

  const stopRecording = () => {
    socketRef.current?.close();
    setIsRecording(false);
  };

  const clearLogs = () => {
    setLogs([]);
    toast.success("已清除历史记录");
  };

  const validateApiKey = (tempKey: string, provider: string) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({ 
              type: "llm_api_key_validate", 
              value: tempKey, 
              provider 
          }));
      } else {
          toast.error("请先开启录音/服务连接后再验证 API Key");
      }
  };

  return {
    isRecording,
    logs,
    startRecording,
    stopRecording,
    clearLogs,
    validateApiKey
  };
};