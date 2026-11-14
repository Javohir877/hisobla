import { useState } from "react";
import { THEMES, chooseTheme, savedChoice } from "../lib/themes.js";

/* Rang mavzulari to'ri: Sozlamalarda ham, tanlash oynasida ham ishlatiladi */
export default function ThemeGrid() {
  const [current, setCurrent] = useState(savedChoice);
  const pick = (key, event) => {
    setCurrent(key);
    chooseTheme(key, event.currentTarget.querySelector(".theme-swatch"));
  };
  const option = (key, name, swatch) => (
    <button key={key} type="button" role="radio" aria-checked={current === key}
      className={`theme-option${current === key ? " active" : ""}`} onClick={event => pick(key, event)}>
      {swatch}<span>{name}</span>
    </button>
  );
  return (
    <div className="theme-grid" role="radiogroup" aria-label="Rang mavzusi">
      {option("auto", "Avtomatik", <span className="theme-swatch auto" />)}
      {Object.entries(THEMES).map(([key, t]) => option(key, t.name,
        <span className="theme-swatch" style={{ "--sw-bg": t.bg, "--sw-surface": t.surface, "--sw-accent": t.accent }} />))}
    </div>
  );
}
