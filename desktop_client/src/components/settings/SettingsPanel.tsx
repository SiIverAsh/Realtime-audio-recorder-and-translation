import { useState } from 'react';
import { Select, SelectItem, Input, Button, Divider } from "@heroui/react";
import type { AppConfig } from '../../types';

interface SettingsPanelProps {
  config: AppConfig;
  setters: {
    setLanguage: (v: string) => void;
    setTargetLanguage: (v: string) => void;
    setEngine: (v: string) => void;
    setProvider: (v: string) => void;
    setApiKey: (v: string) => void;
    setBgOpacity: (v: number) => void;
  };
  actions: {
    clearLogs: () => void;
    validateApiKey: (key: string, provider: string) => void;
  };
}

export const SettingsPanel = ({ config, setters, actions }: SettingsPanelProps) => {
  const [tempApiKey, setTempApiKey] = useState(config.apiKey);

  const handleApiKeyValidation = () => {
    if (!tempApiKey.trim()) return;
    // 乐观更新：先设置 key 让 Hook 发送，同时触发验证
    setters.setApiKey(tempApiKey); 
    actions.validateApiKey(tempApiKey, config.provider);
  };

  return (
    <div className="flex flex-col gap-4 w-full text-left">
      <span className="text-[10px] font-black text-zinc-500 uppercase border-b border-white/10 pb-2 tracking-widest">控制面板</span>
      
      {/* 透明度控制 */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-[10px] text-zinc-500">
            <span>界面不透明度</span>
            <span className="text-indigo-400">{config.bgOpacity}%</span>
        </div>
        <input 
            type="range" 
            min="10" 
            max="100" 
            value={config.bgOpacity} 
            onChange={(e) => setters.setBgOpacity(Number(e.target.value))} 
            className="w-full h-1 bg-zinc-700 rounded-lg accent-indigo-500" 
        />
      </div>

      {/* 语言与引擎控制 */}
      <SettingSelect 
        label="源语言" 
        value={config.language} 
        onChange={setters.setLanguage} 
        options={[{k:"auto",v:"自动检测"}, {k:"zh",v:"中文"}, {k:"ja",v:"日语"}, {k:"en",v:"英语"}]} 
      />
      <SettingSelect 
        label="目标语言" 
        value={config.targetLanguage} 
        onChange={setters.setTargetLanguage} 
        options={[{k:"zh-CN",v:"简体中文"}, {k:"en",v:"English"}]} 
      />
      <SettingSelect 
        label="翻译引擎" 
        value={config.engine} 
        onChange={setters.setEngine} 
        options={[{k:"google",v:"Google"}, {k:"llm",v:"LLM (AI)"}]} 
      />

      {/* LLM 专属控制项 */}
      {config.engine === "llm" && (
        <div className="flex flex-col gap-3 pl-2 border-l-2 border-indigo-500/30 mt-1">
          <SettingSelect 
            label="提供商" 
            value={config.provider} 
            onChange={setters.setProvider} 
            options={["deepseek", "openai", "siliconflow", "gemini", "groq"].map(p => ({k:p, v:p}))}
            capitalize
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium text-zinc-500 uppercase">API Key</span>
            <div className="flex gap-2 w-[160px]">
              <Input 
                size="sm" 
                type="password" 
                value={tempApiKey} 
                onValueChange={setTempApiKey} 
                classNames={{ inputWrapper: "bg-zinc-800/50 h-8", input: "text-xs" }} 
              />
              <Button 
                size="sm" 
                isIconOnly 
                onPress={handleApiKeyValidation} 
                className="bg-indigo-600 h-8 w-8 min-w-8"
              >
                ✓
              </Button>
            </div>
          </div>
        </div>
      )}

      <Divider className="bg-white/5" />
      <Button color="danger" variant="flat" size="sm" onPress={actions.clearLogs} className="w-full font-black text-[10px] uppercase">
        清除识别历史
      </Button>
    </div>
  );
};

// 辅助子组件：通用下拉选择框
const SettingSelect = ({ label, value, onChange, options, capitalize = false }: any) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[10px] font-medium text-zinc-500 uppercase">{label}</span>
    <Select 
        size="sm" 
        selectedKeys={[value]} 
        onChange={(e) => e.target.value && onChange(e.target.value)} 
        className="w-[160px]" 
        classNames={{ trigger: "bg-zinc-800/50 h-8", value: `text-xs ${capitalize ? 'capitalize' : ''}` }}
        popoverProps={{
            classNames: {
                content: "bg-[#1b1b1f] border border-white/10"
            }
        }}
    >
      {options.map((o: any) => <SelectItem key={o.k} className={`text-xs text-white ${capitalize ? 'capitalize' : ''}`}>{o.v}</SelectItem>)}
    </Select>
  </div>
);