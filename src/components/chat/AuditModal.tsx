import { AnimatePresence, motion } from 'motion/react';
import { ScrollText, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

/**
 * Renders a transcript of all messages in the current chat session as JSON,
 * with copy support. Useful for debugging or auditing what the AI returned.
 */
export function AuditModal({ open, onClose }: Props) {
  const messages = useChatStore((s) => s.messages);
  const json = JSON.stringify(messages, null, 2);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110]"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[680px] max-w-[94vw] max-h-[80vh] bg-[#161616] border border-[rgba(255,255,255,0.1)] rounded-2xl shadow-2xl z-[120] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(255,255,255,0.06)]">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-[#BFFF00]" />
                <h3 className="text-sm font-bold text-[#F5F5F5]">Session audit transcript</h3>
                <span className="text-[10px] text-[#666] tabular">
                  {messages.length} messages
                </span>
              </div>
              <button onClick={onClose} className="text-[#666] hover:text-[#F5F5F5]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">
              {messages.length === 0 ? (
                <div className="text-xs text-[#666] text-center py-8">No messages yet</div>
              ) : (
                <pre className="text-[10px] font-mono text-[#A3A3A3] whitespace-pre-wrap leading-relaxed">
                  {json}
                </pre>
              )}
            </div>
            <div className="px-5 py-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[10px] text-[#666]">
              <span>Local-only · stored in browser memory</span>
              <button
                onClick={() => navigator.clipboard.writeText(json)}
                className="text-[#A3A3A3] hover:text-[#F5F5F5]"
              >
                Copy JSON
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
