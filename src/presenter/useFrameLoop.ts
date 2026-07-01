import { useEffect, useState } from "react";

export function useFrameLoop(frames: string[], fps: number): string {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (frames.length === 0 || fps <= 0) return;
    const id = setInterval(() => setI((n) => (n + 1) % frames.length), 1000 / fps);
    return () => clearInterval(id);
  }, [frames, fps]);
  return frames.length ? frames[i % frames.length] : "";
}
