export interface LogEntry {
  original: string;
  translation: string;
  isFinal: boolean;
  timestamp?: string;
}

export interface AppConfig {
  language: string;
  targetLanguage: string;
  engine: string;
  provider: string;
  apiKey: string;
  bgOpacity: number;
}
