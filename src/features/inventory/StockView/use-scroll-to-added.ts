import { useEffect, useEffectEvent } from "react";

const lookEveryMs = 150;
const lookForMs = 3000;
const highlightMs = 4000;

/**
 * Scrolls the card of a product that was just added into view, then calls `onShown` once its
 * highlight has been visible long enough for the caller to clear it.
 */
export function useScrollToAdded(addedId: string | undefined, onShown: (() => void) | undefined) {
  const shown = useEffectEvent(() => onShown?.());

  useEffect(() => {
    if (!addedId) {
      return;
    }
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    // The card appears once the refreshed pantry has rendered, so look for it for a short while.
    const find = setInterval(() => {
      const card = document.getElementById(`product-${addedId}`);
      if (!card) {
        return;
      }
      card.scrollIntoView({ behavior, block: "center" });
      clearInterval(find);
    }, lookEveryMs);
    const giveUp = setTimeout(() => clearInterval(find), lookForMs);
    const done = setTimeout(shown, highlightMs);
    return () => {
      clearInterval(find);
      clearTimeout(giveUp);
      clearTimeout(done);
    };
  }, [addedId]);
}
