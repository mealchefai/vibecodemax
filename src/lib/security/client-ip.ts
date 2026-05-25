import { isIP } from "node:net";

type HeaderBag = {
  get(name: string): string | null;
};

function normalizeCandidateIp(value: string | null | undefined) {
  if (!value) return null;
  let trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(",")) {
    trimmed = trimmed.split(",")[0]?.trim() || "";
  }

  if (trimmed.startsWith("::ffff:")) {
    trimmed = trimmed.slice("::ffff:".length);
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(trimmed)) {
    trimmed = trimmed.slice(0, trimmed.lastIndexOf(":"));
  }

  return isIP(trimmed) ? trimmed : null;
}

export function getClientIp(headers: HeaderBag) {
  const cfConnectingIp = normalizeCandidateIp(headers.get("cf-connecting-ip"));
  if (cfConnectingIp) return cfConnectingIp;

  const xRealIp = normalizeCandidateIp(headers.get("x-real-ip"));
  if (xRealIp) return xRealIp;

  const xForwardedFor = normalizeCandidateIp(headers.get("x-forwarded-for"));
  if (xForwardedFor) return xForwardedFor;

  return "unknown";
}
