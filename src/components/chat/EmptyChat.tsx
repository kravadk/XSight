import { motion } from 'framer-motion';
import { SUGGESTIONS } from '../../utils/mockData';
import { useChat } from '../../hooks/useChat';

export const EmptyChat = () => {
  const { send } = useChat();
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mb-4 text-[48px] text-[#7C5CFC]"
      >
        ✦
      </motion.div>
      <h2 className="mb-2 text-[20px] font-semibold text-[#0D0D0D]">
        XSight AI Copilot
      </h2>
      <p className="mb-8 max-w-md text-[14px] text-[#6B7280]">
        I analyze X Layer markets, manage your portfolio, and execute trades.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={s}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            onClick={() => send(s.replace(/^[^\w]+/, '').trim())}
            className="rounded-full bg-[#F5F5F5] px-4 py-2.5 text-[13px] font-medium text-[#0D0D0D] transition-colors hover:bg-[#E8F5E9]"
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
