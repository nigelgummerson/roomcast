import { docxToMarkdown } from "../core/docParser";
import { odtToMarkdown } from "../core/odtParser";
import { packEnvelope, type Envelope, type SecurityProfile } from "../core/envelope";
import { encodeToFrames } from "../core/frames";

export type DocFormat = "docx" | "odt";

export async function buildBroadcast(
  file: ArrayBuffer,
  opts: { title: string; profile: SecurityProfile; ttlHours: number | null; format?: DocFormat },
): Promise<{ md: string; frames: string[]; sizeBytes: number }> {
  const { format = "docx", ...envelopeOpts } = opts;
  const md = await (format === "odt" ? odtToMarkdown(file) : docxToMarkdown(file));
  const envelope: Envelope = { v: 1, md, ...envelopeOpts };
  const bytes = packEnvelope(envelope);
  const frames = encodeToFrames(bytes, { frameBytes: 200, loops: 3 });
  return { md, frames, sizeBytes: bytes.length };
}
