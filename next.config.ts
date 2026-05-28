import type { NextConfig } from "next";

// Derive the Supabase Storage hostname from the env variable so that
// Next.js <Image> can serve signed URLs from both local dev (127.0.0.1)
// and the production Supabase project without hard-coding hosts.
function buildImagePatterns(): NonNullable<NextConfig["images"]> {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!rawUrl) return { remotePatterns: [] };

  try {
    const { hostname, port, protocol } = new URL(rawUrl);
    return {
      remotePatterns: [
        {
          protocol: protocol.replace(":", "") as "http" | "https",
          hostname,
          port: port || undefined,
          pathname: "/storage/v1/object/**",
        },
      ],
    };
  } catch {
    return { remotePatterns: [] };
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: buildImagePatterns(),
};

export default nextConfig;
