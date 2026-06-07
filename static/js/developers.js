(function () {
  "use strict";

  const cards = Array.from(document.querySelectorAll(".developer-card"));
  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 5;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -5;
      card.style.transform = `translateY(-6px) rotateX(${y.toFixed(2)}deg) rotateY(${x.toFixed(2)}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
})();
