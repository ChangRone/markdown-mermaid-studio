import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";

const nextConfig: NextConfig = {
  // GitHub Pages only serves static files. Keep the existing vinext/Cloudflare
  // build untouched, and opt into a static export in the Pages workflow.
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath: "/markdown-mermaid-studio",
        assetPrefix: "/markdown-mermaid-studio/",
        trailingSlash: true,
        images: { unoptimized: true },
        typescript: { tsconfigPath: "tsconfig.pages.json" },
      }
    : {}),
};

export default nextConfig;
