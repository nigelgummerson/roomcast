import { docxToMarkdown } from "../core/docParser";
import { packEnvelope, type Envelope, type SecurityProfile } from "../core/envelope";
import { encodeToFrames } from "../core/frames";

export async function buildBroadcast(
  file: ArrayBuffer,
  opts: { title: string; profile: SecurityProfile; ttlHours: number },
): Promise<{ md: string; frames: string[] }> {
  const md = await docxToMarkdown(file);
  const envelope: Envelope = { v: 1, md, ...opts };
  const frames = encodeToFrames(packEnvelope(envelope), { frameBytes: 200, loops: 3 });
  return { md, frames };
}
