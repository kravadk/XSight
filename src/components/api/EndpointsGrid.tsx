import { motion } from 'framer-motion';
import { Button } from '../common/Button';
import { ENDPOINTS } from '../../utils/mockData';

export const EndpointsGrid = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    {ENDPOINTS.map((e, i) => (
      <motion.div
        key={e.path}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="card p-5"
      >
        <div className="mb-2 flex items-start justify-between">
          <div className="font-mono text-[13px] font-medium text-[#0D0D0D]">
            <span className="mr-2 rounded bg-[#E8F5E9] px-1.5 py-0.5 text-[11px] font-bold text-[#00A344]">
              {e.method}
            </span>
            {e.path}
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[#6B7280]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00C853]" />
            Live
          </div>
        </div>
        <div className="mb-1 text-[20px] font-bold text-[#00C853]">
          ${e.price.toFixed(2)}
          <span className="text-[12px] font-medium text-[#6B7280]"> / call</span>
        </div>
        <p className="mb-4 text-[13px] text-[#6B7280]">{e.description}</p>
        <div className="flex gap-2">
          <Button size="sm">Try →</Button>
          <Button variant="secondary" size="sm">
            Copy curl
          </Button>
        </div>
      </motion.div>
    ))}
  </div>
);
