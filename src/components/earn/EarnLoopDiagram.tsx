import { motion } from 'motion/react';

const nodes = [
  { id: 'earn', label: 'EARN', sub: 'x402 payments', color: '#BFFF00', textColor: '#0A0A0A', icon: '⚡' },
  { id: 'store', label: 'STORE', sub: 'agentic wallet', color: '#A78BFA', textColor: '#F5F5F5', icon: '🔒' },
  { id: 'pay', label: 'DEPLOY', sub: 'USDT → OKB swap', color: '#38BDF8', textColor: '#0A0A0A', icon: '🔄' },
  { id: 'compound', label: 'YIELD', sub: 'OKB position', color: '#22C55E', textColor: '#F5F5F5', icon: '📈' },
];

function FlowArrow({ delay }: { delay: number }) {
  return (
    <div className="flex items-center justify-center w-8 shrink-0">
      <motion.div
        className="w-6 h-0.5 bg-gradient-to-r from-[rgba(191,255,0,0.2)] to-[rgba(191,255,0,0.8)] rounded-full"
        animate={{ scaleX: [0, 1, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, delay, ease: 'easeInOut' }}
      />
    </div>
  );
}

export function EarnLoopDiagram() {
  return (
    <div className="bg-[#0D0D0D] rounded-2xl border border-[rgba(255,255,255,0.06)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[#F5F5F5]">Earn → Pay → Earn Loop</h3>
        <span className="text-[10px] text-[#A78BFA] bg-[rgba(167,139,250,0.1)] px-2 py-0.5 rounded font-semibold">LIVE</span>
      </div>
      <div className="flex items-center justify-between overflow-x-auto">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex flex-col items-center gap-1.5 min-w-[72px]"
            >
              <motion.div
                className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold shadow-lg"
                style={{ backgroundColor: node.color, color: node.textColor }}
                animate={{ boxShadow: [`0 0 0px ${node.color}40`, `0 0 16px ${node.color}60`, `0 0 0px ${node.color}40`] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.5 }}
              >
                {node.icon}
              </motion.div>
              <div className="text-center">
                <div className="text-[11px] font-extrabold tracking-wider" style={{ color: node.color }}>{node.label}</div>
                <div className="text-[9px] text-[#666] leading-tight max-w-[72px] text-center">{node.sub}</div>
              </div>
            </motion.div>
            {i < nodes.length - 1 && <FlowArrow delay={i * 0.35} />}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1.5 justify-center">
        <motion.div
          className="h-0.5 rounded-full bg-gradient-to-r from-[#BFFF00] via-[#A78BFA] to-[#22C55E]"
          style={{ width: '60%' }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <span className="text-[9px] text-[#444] font-mono">cyclical</span>
        <motion.div
          className="h-0.5 rounded-full bg-gradient-to-r from-[#22C55E] via-[#A78BFA] to-[#BFFF00]"
          style={{ width: '60%' }}
          animate={{ opacity: [0.8, 0.3, 0.8] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </div>
    </div>
  );
}
