import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../utils/format';
import { motion } from 'motion/react';

interface MessageBubbleProps {
  isAi?: boolean;
  children: React.ReactNode;
}

export function MessageBubble({ isAi, children }: MessageBubbleProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: isAi ? 0.1 : 0 }}
      className={cn("flex gap-4 max-w-[85%]", isAi ? "self-start" : "self-end flex-row-reverse")}
    >
      {isAi && (
        <div className="w-7 h-7 rounded-full bg-[#A78BFA] flex items-center justify-center shrink-0 mt-1">
          <Sparkles className="w-4 h-4 text-[#0A0A0A]" />
        </div>
      )}
      <div className={cn(
        "px-5 py-3.5 rounded-2xl text-sm leading-relaxed",
        isAi 
          ? "bg-[#151515] text-[#F5F5F5] border-l-2 border-[#A78BFA]" 
          : "bg-[#1A1A1A] text-[#F5F5F5]"
      )}>
        {children}
      </div>
    </motion.div>
  );
}


