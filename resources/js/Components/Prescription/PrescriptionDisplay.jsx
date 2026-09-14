"use client";

import { useEffect } from "react";
import PrescriptionPrint from "@/Components/Common/PrescriptionPrint";

export default function PrescriptionDisplay({
  prescription = {}, appointment = {}, doctor = {}, patient = {}, onClose,
  variant = "modal", autoPrint = false,
}) {
  const isDrawer = variant === "drawer";

  useEffect(() => {
    if (!autoPrint) return undefined;

    const closeAfterPrint = () => onClose?.();
    const timer = window.setTimeout(() => window.print(), 250);
    window.addEventListener("afterprint", closeAfterPrint);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", closeAfterPrint);
    };
  }, [autoPrint, onClose]);

  return (
    <div
      className={`fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-[2px] print:static print:bg-white ${isDrawer ? "" : "flex items-center justify-center overflow-y-auto p-4"}`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className={`${isDrawer ? "absolute right-0 top-0 h-full w-full max-w-5xl" : "max-h-[92vh] w-full max-w-5xl rounded-2xl"} overflow-y-auto border border-slate-200 bg-white shadow-2xl print:static print:h-auto print:max-h-none print:max-w-none print:overflow-visible print:border-0 print:shadow-none`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescription-display-title"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3 print:hidden">
          <h2 id="prescription-display-title" className="text-lg font-bold text-slate-900">Prescription Preview</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-700">Print</button>
            <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-bold text-slate-600 hover:bg-slate-50" aria-label="Close prescription">X</button>
          </div>
        </div>

        <PrescriptionPrint prescription={prescription} appointment={appointment} doctor={doctor} patient={patient} />
      </div>
    </div>
  );
}
