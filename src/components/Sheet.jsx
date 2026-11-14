import { useEffect, useState } from "react";

/* Pastdan chiquvchi oyna. Ochilish/yopilish animatsiyasi CSS'da (.sheet, .closing) */
export default function Sheet({ open, onClose, label, variant = "", children }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const timer = setTimeout(() => { setMounted(false); setClosing(false); }, 220);
    return () => clearTimeout(timer);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const onKey = event => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  const state = closing ? " closing" : "";
  return (
    <>
      <div className={`sheet-backdrop${state}`} onClick={onClose} />
      <div className={`sheet ${variant}${state}`} role="dialog" aria-modal="true" aria-label={label}>
        <div className="sheet-handle" aria-hidden="true" />
        {children}
      </div>
    </>
  );
}
