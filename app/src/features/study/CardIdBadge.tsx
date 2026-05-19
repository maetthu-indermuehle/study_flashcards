"use client";

/**
 * CardIdBadge — renders the card's originalId in monospace and shows a
 * small tooltip with the card's topics and tags when clicked.
 *
 * The visual appearance of the ID text is unchanged — the tooltip appears
 * above it and disappears when the user clicks anywhere else.
 */

import { useState, useEffect, useRef } from "react";

type Props = {
  originalId: string;
  topics: string[];
  tags: string[];
};

export default function CardIdBadge({ originalId, topics, tags }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  // Close on any outside click.
  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const hasInfo = topics.length > 0 || tags.length > 0;

  return (
    <span ref={ref} className="relative">
      <span
        role={hasInfo ? "button" : undefined}
        tabIndex={hasInfo ? 0 : undefined}
        onClick={() => hasInfo && setOpen((v) => !v)}
        onKeyDown={(e) => e.key === "Enter" && hasInfo && setOpen((v) => !v)}
        className={`font-mono text-xs text-slate-400 ${hasInfo ? "cursor-pointer select-none" : ""}`}
      >
        {originalId}
      </span>

      {open && hasInfo && (
        <span className="absolute bottom-full left-0 z-10 mb-1.5 w-56 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-md">
          {topics.length > 0 && (
            <span className="mb-1.5 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Topics
              </span>
              {topics.map((t) => (
                <span
                  key={t}
                  className="mb-0.5 block text-xs text-slate-700"
                >
                  {t}
                </span>
              ))}
            </span>
          )}
          {tags.length > 0 && (
            <span className="block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                Tags
              </span>
              <span className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                  >
                    {t}
                  </span>
                ))}
              </span>
            </span>
          )}
        </span>
      )}
    </span>
  );
}
