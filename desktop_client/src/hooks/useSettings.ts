import { useState, useEffect } from 'react';
import type { AppConfig } from '../types';

export const useSettings = () => {
  const [language, setLanguage] = useState<string>(() => localStorage.getItem('rt-lang') || "auto");
  const [targetLanguage, setTargetLanguage] = useState<string>(() => localStorage.getItem('rt-target') || "zh-CN");
  const [engine, setEngine] = useState<string>(() => localStorage.getItem('rt-engine') || "google");
  const [provider, setProvider] = useState<string>(() => localStorage.getItem('rt-provider') || "deepseek");
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('rt-key') || "");
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('rt-opacity');
    const parsed = parseInt(saved || "60", 10);
    return isNaN(parsed) ? 60 : parsed;
  });

  useEffect(() => {
    localStorage.setItem('rt-opacity', bgOpacity.toString());
    localStorage.setItem('rt-lang', language);
    localStorage.setItem('rt-target', targetLanguage);
    localStorage.setItem('rt-engine', engine);
    localStorage.setItem('rt-provider', provider);
    localStorage.setItem('rt-key', apiKey);
  }, [language, targetLanguage, engine, provider, apiKey, bgOpacity]);

  const config: AppConfig = {
    language,
    targetLanguage,
    engine,
    provider,
    apiKey,
    bgOpacity
  };

  return {
    config,
    setLanguage,
    setTargetLanguage,
    setEngine,
    setProvider,
    setApiKey,
    setBgOpacity
  };
};
