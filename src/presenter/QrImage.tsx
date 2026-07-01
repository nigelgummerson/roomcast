import { useEffect, useRef } from "react";
import QRCode from "qrcode";

export function QrImage({
  text,
  size,
  ecc = "M",
}: {
  text: string;
  size: number;
  ecc?: "L" | "M" | "Q" | "H";
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && text) {
      QRCode.toCanvas(ref.current, text, { width: size, margin: 2, errorCorrectionLevel: ecc });
    }
  }, [text, size, ecc]);
  return <canvas ref={ref} width={size} height={size} aria-label="QR frame" />;
}
