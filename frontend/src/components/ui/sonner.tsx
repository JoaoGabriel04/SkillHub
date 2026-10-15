"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useTema } from "@/components/tema/tema-provider"

// Segue o tema aplicado (TemaProvider); as cores vêm dos tokens de vidro
const Toaster = ({ ...props }: ToasterProps) => {
  const { tema } = useTema()
  return (
    <Sonner
      theme={tema === "escuro" ? "dark" : "light"}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4 text-accent-text" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--glass-strong-bg)",
          "--normal-text": "var(--foreground)",
          "--normal-border": "var(--glass-strong-border)",
          "--border-radius": "12px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast font-secondary backdrop-blur-[20px]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
