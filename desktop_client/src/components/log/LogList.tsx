import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@heroui/react"; 
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown } from 'lucide-react';
import type { LogEntry } from '../../types';
import { LogItem } from './LogItem';

interface LogListProps {
  logs: LogEntry[];
  isSettingsOpen: boolean;
}

export const LogList = ({ logs, isSettingsOpen }: LogListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const isAutoScrolling = useRef(false);
  
  // 自定义滚动条状态
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [thumbHeight, setThumbHeight] = useState(0);
  const [thumbTop, setThumbTop] = useState(0);

  // 更新滚动条位置和高度
  const updateScrollbar = useCallback(() => {
    const container = scrollRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight > clientHeight) {
        const heightRatio = clientHeight / scrollHeight;
        setThumbHeight(Math.max(heightRatio * clientHeight, 20));
        setThumbTop((scrollTop / (scrollHeight - clientHeight)) * (clientHeight - Math.max(heightRatio * clientHeight, 20)));
      } else { setThumbHeight(0); }
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
      // 如果不是正在自动滚动，则根据滚动位置决定是否显示“回到底部”按钮
      if (!isAutoScrolling.current) setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 2);
      updateScrollbar();
      setIsScrollbarVisible(true);
      setTimeout(() => setIsScrollbarVisible(false), 2000);
    }
  };

  useEffect(() => {
    updateScrollbar();
    window.addEventListener('resize', updateScrollbar);
    return () => window.removeEventListener('resize', updateScrollbar);
  }, [logs, isSettingsOpen, updateScrollbar]);

              return (

                <div className="relative w-full h-full overflow-hidden">

                    <div ref={scrollRef} onScroll={handleScroll} className="w-full h-full overflow-y-auto px-10 pt-10 pb-4 no-scrollbar">

                        <div className="flex flex-col gap-6 w-full pb-2">

                            <AnimatePresence mode="popLayout">

                            {logs.map((log, index) => (

                                <LogItem 

                                    key={index} 

                                    log={log} 

                                    isLast={index === logs.length - 1} 

                                    onUpdate={() => {

                                        // 直接检查 DOM 状态而不是依赖可能滞后的 state

                                        if (scrollRef.current) {

                                            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;

                                            const isCloseToBottom = scrollHeight - scrollTop - clientHeight < 50; // 放宽判定范围

                                            if (isCloseToBottom || !showScrollBtn) {

                                                scrollToBottom("auto");

                                            }

                                        }

                                    }} 

                                />

                            ))}

                            </AnimatePresence>

                            <div ref={bottomRef} className="h-2 w-full shrink-0" />

                        </div>

                    </div>

            

                    {/* Custom Scrollbar Indicator */}

                    <div 

                        className={`absolute right-1 w-1 rounded-full bg-black/50 transition-opacity duration-300 ${isScrollbarVisible ? 'opacity-100' : 'opacity-0'}`} 

                        style={{ top: thumbTop, height: thumbHeight }} 

                    />

            

                    {/* Jump to Latest Button */}

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

                                className="rounded-full bg-black/90 text-white shadow-[0_4px_12px_rgba(0,0,0,0.8)] h-7 px-4 font-bold text-[10px] uppercase border border-white/10 backdrop-blur-md" 

                                startContent={<ArrowDown size={14}/>}

                            >

                                最新消息

                            </Button>

                            </motion.div>

                        )}

                    </AnimatePresence>

                </div>

              );

  
};