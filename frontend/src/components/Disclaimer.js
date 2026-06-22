import React from "react";

export default function Disclaimer({ fixed = false }) {
  if (fixed) {
    return (
      <div
        data-testid="disclaimer-banner"
        className="sticky bottom-0 z-30 w-full border-t border-slate-200 bg-white/90 px-4 py-2.5 text-center text-xs text-slate-500 backdrop-blur-xl"
      >
        This is for educational purposes only and does not constitute tax or financial advice.
      </div>
    );
  }
  return (
    <p data-testid="disclaimer-text" className="text-xs text-slate-500">
      This is for educational purposes only and does not constitute tax or financial advice.
    </p>
  );
}
