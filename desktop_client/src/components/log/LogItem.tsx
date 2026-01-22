import { motion } from "framer-motion";
import type { LogEntry } from "../../types";
import { TypewriterText } from "../ui/TypewriterText";

interface LogItemProps {
  log: LogEntry;
  isLast: boolean;
  onUpdate: () => void;
}

const getDynamicFontSize = (translation: string, original: string) => {
  const combined = (translation || "") + (original || "");
  const totalWeight = Array.from(combined).reduce((acc, char) => acc + (char.charCodeAt(0) > 255 ? 2 : 1), 0);
  if (totalWeight < 20) return "text-4xl";
  if (totalWeight < 40) return "text-3xl";
  if (totalWeight < 80) return "text-2xl";
  return "text-xl"; 
};

export const LogItem = ({ log, isLast, onUpdate }: LogItemProps) => {
  return (
    <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="relative flex flex-col items-center text-center gap-1 w-full shrink-0 pt-2"
    >
      {log.timestamp && (
        <span className="absolute left-2 top-4 text-[10px] text-white/30 font-mono select-none">
            {log.timestamp}
        </span>
      )}
      
      <p className={`${getDynamicFontSize(log.translation, log.original)} text-white drop-shadow-[0_2px_12px_rgba(0,0,0,1)] font-bold leading-tight break-words w-full px-2`}>
        {log.translation ? (
          isLast ? <TypewriterText text={log.translation} speed={35} onUpdate={onUpdate} /> : log.translation
        ) : (
          <span className="opacity-50 animate-pulse font-normal">...</span>
        )}
      </p>
      <p className="text-sm text-white/40 break-words w-full px-4">
        {isLast ? <TypewriterText text={log.original} speed={15} onUpdate={onUpdate} /> : log.original}
      </p>
    </motion.div>
  );
};
