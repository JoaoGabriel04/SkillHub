import type { Metadata } from "next";
import { Inter, Jersey_15, Jersey_20, Jersey_25, Poppins } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { SessionProvider } from "@/components/auth/session-provider";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// o CSS do Font Awesome já vem importado acima (evita ícone gigante no primeiro paint)
config.autoAddCss = false;

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});
const jersey15 = Jersey_15({ subsets: ["latin"], weight: "400", variable: "--font-jersey-15" });
const jersey20 = Jersey_20({ subsets: ["latin"], weight: "400", variable: "--font-jersey-20" });
const jersey25 = Jersey_25({ subsets: ["latin"], weight: "400", variable: "--font-jersey-25" });

export const metadata: Metadata = {
  title: "SkillHub",
  description: "SkillHub",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // "dark" fixo: o design system só tem tema escuro
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${poppins.variable} ${jersey15.variable} ${jersey20.variable} ${jersey25.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProvider>{children}</SessionProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
