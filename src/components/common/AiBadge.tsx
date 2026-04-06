export const AiBadge = ({ className = '' }: { className?: string }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full bg-[#F3F0FF] px-2.5 py-1 text-[11px] font-semibold text-[#7C5CFC] ${className}`}
  >
    <span className="text-[13px] leading-none">✦</span> AI
  </span>
);
