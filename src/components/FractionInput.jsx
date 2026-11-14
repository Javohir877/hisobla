import { useRef } from "react";

/* Kasr kiritish: ishora, butun qism, surat / maxraj.
   Suratda "/" bosilsa — maxrajga, butun qismda bo'shliq — suratga o'tadi. */
export default function FractionInput({ caption, value, onChange }) {
  const numRef = useRef(null);
  const denRef = useRef(null);
  const set = part => event => onChange({ ...value, [part]: event.target.value });
  const field = { type: "text", inputMode: "numeric", autoComplete: "off" };

  return (
    <div className="frac-field">
      <span className="frac-caption">{caption}</span>
      <div className="frac-input">
        <button type="button" className={`frac-sign${value.negative ? " negative" : ""}`}
          aria-pressed={value.negative} aria-label="Ishorani almashtirish"
          onClick={() => onChange({ ...value, negative: !value.negative })}>
          {value.negative ? "−" : "+"}
        </button>
        <input {...field} className="frac-whole" placeholder="0" aria-label={`${caption}: butun qism`}
          value={value.w} onChange={set("w")}
          onKeyDown={event => { if (event.key === " ") { event.preventDefault(); numRef.current.focus(); } }} />
        <div className="frac-stack">
          <input {...field} ref={numRef} className="frac-num" placeholder="surat" aria-label={`${caption}: surat`}
            value={value.n} onChange={set("n")}
            onKeyDown={event => { if (event.key === "/" || event.key === ":") { event.preventDefault(); denRef.current.focus(); } }} />
          <span className="frac-bar" aria-hidden="true" />
          <input {...field} ref={denRef} className="frac-den" placeholder="maxraj" aria-label={`${caption}: maxraj`}
            value={value.d} onChange={set("d")} />
        </div>
      </div>
    </div>
  );
}
