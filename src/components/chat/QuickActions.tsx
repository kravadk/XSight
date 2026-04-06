import { QUICK_ACTIONS } from '../../utils/mockData';
import { useChat } from '../../hooks/useChat';

export const QuickActions = () => {
  const { send } = useChat();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2">
      {QUICK_ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => send(a.message)}
          className="flex-none rounded-[12px] bg-[#F5F5F5] px-4 py-2 text-[13px] font-medium text-[#0D0D0D] transition-colors hover:bg-[#E8F5E9]"
        >
          {a.label}
        </button>
      ))}
    </div>
  );
};
