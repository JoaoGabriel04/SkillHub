import type { Metadata } from "next";
import "./globals.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { ToastContainer } from "react-toastify";
import { QueryProvider } from "@/providers/QueryProvider";

config.autoAddCss = false;

export const metadata: Metadata = {
  title: "SkillHub",
  description: "A plataforma perfeita para você!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <QueryProvider>
          <ToastContainer />
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
