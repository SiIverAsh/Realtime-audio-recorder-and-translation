import { useState, useRef, useEffect } from 'react';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  onUpdate?: () => void;
}

export const TypewriterText = ({ text, speed = 30, onUpdate }: TypewriterTextProps) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const lastTextRef = useRef("");
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  useEffect(() => {
    if (text !== lastTextRef.current) {
        lastTextRef.current = text;
        if (onUpdateRef.current) onUpdateRef.current();
    }

    const timer = setInterval(() => {
      setVisibleCount(prev => {
        if (prev < text.length) {
          const next = prev + 1;
          if (onUpdateRef.current) onUpdateRef.current();
          return next;
        }
        clearInterval(timer);
        return prev;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {text.slice(0, visibleCount)}
      <span style={{ opacity: 0 }}>{text.slice(visibleCount)}</span>
    </span>
  );
};
