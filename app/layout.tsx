import type { Metadata } from "next";
import "./globals.css";
import SkillStoreWalletProvider from "./components/SkillStoreWalletProvider";

export const metadata: Metadata = {
  title: "SkillStore — X Layer OnchainOS Skill Marketplace",
  description:
    "The App Store for OKX OnchainOS Skills. Any agent publishes a skill, any AI agent invokes it via x402 on X Layer. Auto-settlement, on-chain audit log.",
  openGraph: {
    title: "SkillStore — X Layer OnchainOS",
    description: "Discover, invoke, and monetize OnchainOS AI skills via x402 on X Layer"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SkillStoreWalletProvider>{children}</SkillStoreWalletProvider>
      </body>
    </html>
  );
}
