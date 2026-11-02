"use client";
// components/ui/use-toast.ts

import { useState, createContext, useContext, ReactNode } from "react";

interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive" | "success";
}

interface ToastContextType {
  toasts: Toast[];
  toast: (props: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, variant = "default" }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    
    setTimeout(() => {
      dismiss(id);
    }, 3000);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  const getToastClassName = (variant: string) => {
    if (variant === "destructive") {
      return "bg-red-500 text-white";
    }
    if (variant === "success") {
      return "bg-green-500 text-white";
    }
    return "bg-gray-800 text-white";
  };

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={`p-4 rounded-lg shadow-lg min-w-[300px] animate-in slide-in-from-right-full ${getToastClassName(toastItem.variant || "default")}`}
          >
            {toastItem.title && <div className="font-semibold">{toastItem.title}</div>}
            {toastItem.description && <div className="text-sm mt-1">{toastItem.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
