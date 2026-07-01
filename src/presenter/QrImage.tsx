import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrImage({ text, size }: { text: string; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && text) {
      QRCode.toCanvas(ref.current, text, { width: size, margin: 2, errorCorrectionLevel: "M" });
    }
  }, [text, size]);
  return <canvas ref={ref} width={size} height={size} aria-label="QR frame" />;
}
