// components/sonner-provider.tsx
"use client";

import { Toaster as SonnerToaster } from "sonner";

export function SonnerProvider() {
  return (
    <SonnerToaster 
      position="top-right" 
      toastOptions={{
        classNames: {
          toast: "group border-border bg-background text-foreground",
          title: "text-foreground font-semibold",
          description: "text-muted-foreground",
          success: "!bg-green-100 !border-green-400 dark:!bg-green-900 dark:!border-green-800",
          error: "!bg-red-100 !border-red-400 dark:!bg-red-900 dark:!border-red-800",
          info: "!bg-blue-100 !border-blue-400 dark:!bg-blue-900 dark:!border-blue-800",
        }
      }}
    />
  );
}