import { useEffect, useState } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  value: string;
  size?: number;
  /** Hex color for dark modules (default: lime) */
  fg?: string;
  bg?: string;
  className?: string;
}

/**
 * Renders a QR code as a data URL into an <img>. Generated client-side via
 * the `qrcode` lib (~20KB). Used for "Receive funds" wallet address.
 */
export function QRCode({ value, size = 200, fg = '#BFFF00', bg = '#0A0A0A', className }: Props) {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCodeLib.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: fg, light: bg },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [value, size, fg, bg]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#1A1A1A] border border-[rgba(255,255,255,0.06)] rounded-lg flex items-center justify-center text-[10px] text-[#666]"
      >
        QR error
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[#1A1A1A] rounded-lg skeleton"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${value}`}
      width={size}
      height={size}
      className={`rounded-lg ${className ?? ''}`}
    />
  );
}
