import { CheckCircle2, ExternalLink } from 'lucide-react';
import { tokenMeta } from '../../config/tokens';
import { TokenIcon } from '../common/TokenIcon';
import { CipherScramble } from '../common/CipherScramble';
import { explorerTx } from '../../config/links';

interface Props {
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  hash: string;
}

export function TxSuccessCard({ fromSymbol, toSymbol, fromAmount, toAmount, hash }: Props) {
  const f = tokenMeta(fromSymbol);
  const t = tokenMeta(toSymbol);
  const explorerUrl = explorerTx(hash);
  const shortHash = `${hash.slice(0, 10)}...${hash.slice(-6)}`;
  return (
    <div className="bg-[#161616] rounded-2xl border border-[rgba(34,197,94,0.2)] p-4 mt-1 w-full max-w-[360px]">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
        <div className="text-sm font-bold text-[#F5F5F5]">Swap confirmed</div>
      </div>
      <div className="flex items-center gap-2 text-sm text-[#F5F5F5] mb-3">
        <span className="tabular">{fromAmount}</span>
        <TokenIcon symbol={f.symbol} size={16} />
        <span>{f.symbol}</span>
        <span className="text-[#666]">→</span>
        <span className="tabular">{toAmount.toFixed(4)}</span>
        <TokenIcon symbol={t.symbol} size={16} />
        <span>{t.symbol}</span>
      </div>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-xs text-[#BFFF00] hover:text-[#D4FF33] font-mono"
      >
        <CipherScramble text={shortHash} mono duration={900} />
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
