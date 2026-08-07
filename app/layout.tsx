import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";

const publicBasePath = process.env.GITHUB_ACTIONS === "true" ? "/markdown-mermaid-studio" : "";

export const metadata: Metadata = {
  title: "Markdown Mermaid Studio",
  description: "多文件、版本快照、雙向定位、即時預覽與檢核 Markdown 及 Mermaid 的本機優先工作台。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: `${publicBasePath}/favicon.svg`,
    shortcut: `${publicBasePath}/favicon.svg`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
