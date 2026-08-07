import type { Metadata } from "next";
import "./globals.css";

const publicBasePath = process.env.GITHUB_ACTIONS === "true" ? "/markdown-mermaid-studio" : "";

export const metadata: Metadata = {
  title: "Markdown Mermaid Studio",
  description: "匯入、編輯、即時預覽與檢核 Markdown 及 Mermaid 文件的本機優先工作台。",
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
