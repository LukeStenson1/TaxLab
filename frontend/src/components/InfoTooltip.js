import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Info } from "lucide-react";

export default function InfoTooltip({ text, label, testid, position = "top", tone = "dark" }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const btnRef = useRef(null);
  const tipRef = useRef(null);

  const calcPosition = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const scrollY = window.scrollY || 0;
    const scrollX = window.scrollX || 0;
    if (position === "bottom") {
      setStyle({
        position: "absolute",
        top: r.bottom + scrollY + 8,
        left: r.left + scrollX + r.width / 2,
        transform: "translateX(-50%)",
        zIndex: 99999,
      });
    } else {
      setStyle({
        position: "absolute",
        top: r.top + scrollY - 8,
        left: r.left + scrollX + r.width / 2,
        transform: "translateX(-50%) translateY(-100%)",
        zIndex: 99999,
      });
    }
  }, [position]);

  useEffect(() => {
    if (!open) return;
    calcPosition();
    function onScroll() { calcPosition(); }
    function onResize() { calcPosition(); }
    function onDocClick(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        tipRef.current && !tipRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open, calcPosition]);

  const iconColor =
    tone === "light"
      ? "text-slate-300 hover:text-white focus:text-white"
      : "text-slate-400 hover:text-teal-600 focus:text-teal-600";

  const tooltip = open
    ? createPortal(
        <span
          ref={tipRef}
          role="tooltip"
          style={style}
          className="w-60 rounded-lg bg-navy-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed tracking-normal text-slate-100 shadow-xl ring-1 ring-white/10"
        >
          {text}
        </span>,
        document.body
      )
    : null;

  return (
    <span className="relative inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={label ? `What is ${label}?` : "More information"}
        data-testid={testid}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          calcPosition();
          setOpen((o) => !o);
        }}
        onMouseEnter={() => { calcPosition(); setOpen(true); }}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => { calcPosition(); setOpen(true); }}
        onBlur={() => setOpen(false)}
        className={`inline-flex items-center justify-center transition-colors focus:outline-none ${iconColor}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {tooltip}
    </span>
  );
}
