import { motion } from 'framer-motion';
import type { ChatMessage } from '../../store/chatStore';
import { TokenCard } from './TokenCard';
import { SwapPreview } from './SwapPreview';
import { PortfolioCard } from './PortfolioCard';
import { RiskCard } from './RiskCard';
import { YieldCard } from './YieldCard';
import { TxPending } from './TxPending';
import { TxSuccess } from './TxSuccess';

interface Props {
  message: ChatMessage;
}

export const MessageBubble = ({ message }: Props) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: isUser ? 0 : 0.1 }}
      className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#F3F0FF] text-[14px] text-[#7C5CFC]">
          ✦
        </div>
      )}
      <div
        className={`flex max-w-[85%] flex-col gap-3 ${
          isUser ? 'items-end' : 'items-start'
        }`}
      >
        {message.cards.map((card, idx) => {
          if (card.kind === 'text') {
            return (
              <div
                key={idx}
                className={
                  isUser
                    ? 'rounded-2xl bg-[#F5F5F5] px-4 py-3 text-[14px] text-[#0D0D0D]'
                    : 'rounded-2xl border-l-2 border-[#7C5CFC] bg-white px-4 py-3 text-[14px] text-[#0D0D0D] shadow-[0_1px_3px_rgba(0,0,0,0.04)]'
                }
              >
                {card.text}
              </div>
            );
          }
          if (card.kind === 'tokens') {
            return (
              <div key={idx} className="flex flex-wrap gap-3">
                {card.symbols.map((s) => (
                  <TokenCard key={s} symbol={s} />
                ))}
              </div>
            );
          }
          if (card.kind === 'swap') {
            return (
              <SwapPreview
                key={idx}
                fromSymbol={card.fromSymbol}
                toSymbol={card.toSymbol}
                fromAmount={card.fromAmount}
                toAmount={card.toAmount}
              />
            );
          }
          if (card.kind === 'portfolio') {
            return <PortfolioCard key={idx} advice={card.advice} />;
          }
          if (card.kind === 'risk') {
            return <RiskCard key={idx} symbol={card.symbol} />;
          }
          if (card.kind === 'yield') {
            return (
              <div key={idx} className="flex flex-wrap gap-3">
                {card.names.map((n) => (
                  <YieldCard key={n} name={n} />
                ))}
              </div>
            );
          }
          if (card.kind === 'txPending') {
            return (
              <TxPending
                key={idx}
                fromSymbol={card.fromSymbol}
                toSymbol={card.toSymbol}
                fromAmount={card.fromAmount}
                toAmount={card.toAmount}
              />
            );
          }
          if (card.kind === 'txSuccess') {
            return (
              <TxSuccess
                key={idx}
                fromSymbol={card.fromSymbol}
                toSymbol={card.toSymbol}
                fromAmount={card.fromAmount}
                toAmount={card.toAmount}
                hash={card.hash}
              />
            );
          }
          return null;
        })}
      </div>
    </motion.div>
  );
};
