import { Badge } from '../common/Badge';
import { Button } from '../common/Button';

export const EconomyLoop = () => (
  <div
    className="rounded-[16px] border border-[#E6F4EC] bg-[#F0FFF4] p-6"
    style={{ borderLeftWidth: 3, borderLeftColor: '#00C853' }}
  >
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-[18px] font-semibold">Economy loop</h3>
        <p className="text-[13px] text-[#6B7280]">
          x402 Income → Wallet → LP Pool → Yield → reinvest
        </p>
      </div>
      <Badge tone="green">
        <span className="pulse-dot mr-1" /> ON
      </Badge>
    </div>

    <div className="mb-4 overflow-x-auto">
      <svg viewBox="0 0 720 160" className="min-w-[560px] w-full">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#00C853" />
          </marker>
        </defs>
        {[
          { x: 40, label: 'x402 Income', sub: '$4.82' },
          { x: 220, label: 'Wallet', sub: 'USDT' },
          { x: 400, label: 'LP Pool', sub: 'ETH/USDT' },
          { x: 580, label: 'Yield', sub: '$0.72' },
        ].map((node) => (
          <g key={node.x}>
            <rect
              x={node.x}
              y={50}
              width="120"
              height="60"
              rx="12"
              fill="#fff"
              stroke="#E6F4EC"
            />
            <text x={node.x + 60} y={78} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0D0D0D">
              {node.label}
            </text>
            <text x={node.x + 60} y={95} textAnchor="middle" fontSize="11" fill="#6B7280">
              {node.sub}
            </text>
          </g>
        ))}
        {[
          [160, 340],
          [340, 520],
          [520, 700],
        ].map(([x1, x2], i) => (
          <path
            key={i}
            className="loop-path"
            d={`M ${x1} 80 L ${x2} 80`}
            stroke="#00C853"
            strokeWidth="2"
            fill="none"
            markerEnd="url(#arrow)"
          />
        ))}
        <path
          className="loop-path"
          d="M 700 110 Q 730 150 400 140 Q 100 130 40 110"
          stroke="#00C853"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrow)"
        />
        <text x={360} y={155} textAnchor="middle" fontSize="11" fill="#00A344">
          reinvest ↩
        </text>
      </svg>
    </div>

    <div className="flex gap-2">
      <Button size="sm">Configure</Button>
      <Button variant="secondary" size="sm">
        Pause
      </Button>
    </div>
  </div>
);
