/* To'g'ri javob uchun kichik konfetti (rangli bo'laklar CSS animatsiyasi bilan uchadi) */
const COLORS = ["#6b8cf6", "#8ff5cf", "#ffd27a", "#ff8f9d", "#a3b8ff"];

export function burstConfetti(anchor) {
  if (!anchor || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const rect = anchor.getBoundingClientRect();
  for (let i = 0; i < 26; i++) {
    const piece = document.createElement("span");
    const angle = Math.random() * Math.PI * 2, distance = 60 + Math.random() * 120;
    piece.className = "confetti-piece";
    Object.assign(piece.style, {
      left: `${rect.left + rect.width / 2}px`,
      top: `${rect.top + 20}px`,
      background: COLORS[i % COLORS.length],
      animationDelay: `${Math.random() * 80}ms`
    });
    piece.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--dy", `${Math.sin(angle) * distance - 40}px`);
    piece.style.setProperty("--rot", `${Math.random() * 720 - 360}deg`);
    document.body.appendChild(piece);
    setTimeout(() => piece.remove(), 1300);
  }
}
