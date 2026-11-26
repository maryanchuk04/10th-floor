"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="pop w-full max-w-md rounded-t-3xl bg-[var(--card)] p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
