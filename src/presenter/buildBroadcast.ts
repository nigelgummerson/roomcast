import { docxToMarkdown } from "../core/docParser";
import { packEnvelope, type Envelope, type SecurityProfile } from "../core/envelope";
import { encodeToFrames } from "../core/frames";

export async function buildBroadcast(
  file: ArrayBuffer,
  opts: { title: string; profile: SecurityProfile; ttlHours: number },
): Promise<{ md: string; frames: string[]; sizeBytes: number }> {
  const md = await docxToMarkdown(file);
  const envelope: Envelope = { v: 1, md, ...opts };
  const bytes = packEnvelope(envelope);
  const frames = encodeToFrames(bytes, { frameBytes: 200, loops: 3 });
  return { md, frames, sizeBytes: bytes.length };
}
