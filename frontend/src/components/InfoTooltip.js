import React, { useEffect, useRef, useState } from "react";
import { Info } from "lucide-react";

// Small accessible info icon that reveals a plain-English explanation on
// hover, focus, or tap. Works on both light and dark backgrounds.
export default function InfoTooltip({ text, label, testid, position = "top", tone = "dark" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const iconColor =
    tone === "light"
      ? "text-slate-300 hover:text-white focus:text-white"
      : "text-slate-400 hover:text-teal-600 focus:text-teal-600";

  const bubblePos =
    position === "bottom"
      ? "top-full mt-2"
      : "bottom-full mb-2";

  const arrow =
    position === "bottom"
      ? "bottom-full left-1/2 -translate-x-1/2 border-b-navy-900 border-t-transparent"
      : "top-full left-1/2 -translate-x-1/2 border-t-navy-900 border-b-transparent";

  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label ? `What is ${label}?` : "More information"}
        data-testid={testid}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline-flex items-center justify-center transition-colors focus:outline-none ${iconColor}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute left-1/2 z-50 w-60 -translate-x-1/2 rounded-lg bg-navy-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-100 shadow-xl ring-1 ring-white/10 ${bubblePos}`}
        >
          {text}
          <span className={`absolute border-4 border-l-transparent border-r-transparent ${arrow}`} />
        </span>
      )}
    </span>
  );
}
