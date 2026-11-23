/* Google Noto emoji rasmlari (public/emoji, Apache 2.0) — har qanday telefonda bir xil va chiroyli ko'rinadi.
   anim: "wave" | "flicker" | "twinkle" | "pop" — yengil CSS harakati */
export default function Emoji({ name, size = "1.15em", anim, label }) {
  return (
    <img className={`emoji${anim ? ` emoji-${anim}` : ""}`} src={`emoji/${name}.svg`} width="72" height="72"
      style={{ width: size, height: size }} alt={label || ""} aria-hidden={label ? undefined : "true"} draggable="false" decoding="async" />
  );
}
