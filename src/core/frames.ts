import {
  dataToFrames,
  parseFramesReducer,
  areFramesComplete,
  framesToData,
  progressOfFrames,
  type State,
} from "qrloop";

export function encodeToFrames(
  bytes: Uint8Array,
  opts: { frameBytes?: number; loops?: number } = {},
): string[] {
  const { frameBytes = 200, loops = 3 } = opts;
  return dataToFrames(Buffer.from(bytes), frameBytes, loops);
}

export class FrameDecoder {
  // qrloop's reducer state is opaque; start as null and let the reducer build it.
  private state: unknown = null;

  push(frame: string): void {
    this.state = parseFramesReducer(this.state as State, frame);
  }

  get complete(): boolean {
    return this.state != null && areFramesComplete(this.state as State);
  }

  get progress(): number {
    return this.state == null ? 0 : progressOfFrames(this.state as State);
  }

  result(): Uint8Array {
    if (!this.complete) throw new Error("frames not complete");
    return new Uint8Array(framesToData(this.state as State));
  }
}
