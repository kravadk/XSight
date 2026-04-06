import { Button } from '../common/Button';

export const ApiHeader = () => (
  <div
    className="rounded-[16px] border border-[#E6F4EC] bg-[#F0FFF4] p-6"
    style={{ borderLeftWidth: 3, borderLeftColor: '#00C853' }}
  >
    <h2 className="mb-1 text-[20px] font-bold text-[#0D0D0D]">
      XSight x402 API
    </h2>
    <p className="mb-4 text-[14px] text-[#6B7280]">
      Pay per call. Zero gas on X Layer.
    </p>
    <div className="mb-4 inline-flex items-center rounded-[10px] border border-[#E6F4EC] bg-white px-3 py-2 font-mono text-[12px] text-[#0D0D0D]">
      https://api.xsight.xyz/v1
    </div>
    <div className="flex gap-2">
      <Button size="sm">View Docs</Button>
      <Button variant="secondary" size="sm">
        Copy URL
      </Button>
    </div>
  </div>
);
