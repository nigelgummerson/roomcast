import { gzipSync, gunzipSync } from "fflate";

export type SecurityProfile = "confidential" | "standard";

export interface Envelope {
  v: 1;
  profile: SecurityProfile;
  ttlHours: number;
  title: string;
  md: string;
}

export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvelopeError";
  }
}

export function packEnvelope(env: Envelope): Uint8Array {
  const json = new TextEncoder().encode(JSON.stringify(env));
  return gzipSync(json);
}

export function unpackEnvelope(bytes: Uint8Array): Envelope {
  let json: string;
  try {
    json = new TextDecoder().decode(gunzipSync(bytes));
  } catch {
    throw new EnvelopeError("could not decompress payload");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new EnvelopeError("payload is not valid JSON");
  }
  const e = parsed as Envelope;
  if (!e || e.v !== 1) throw new EnvelopeError("unsupported envelope version");
  if (e.profile !== "confidential" && e.profile !== "standard") {
    throw new EnvelopeError("unknown security profile");
  }
  return e;
}
