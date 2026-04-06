import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  delay?: number;
}

export const StatCard = ({ label, value, delta, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="card p-6"
  >
    <div className="label mb-2">{label}</div>
    <div className="text-[32px] font-bold leading-tight text-[#0D0D0D]">
      {value}
    </div>
    {delta && <div className="mt-2">{delta}</div>}
  </motion.div>
);
