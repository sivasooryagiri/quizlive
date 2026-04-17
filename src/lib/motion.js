// Shared motion presets. Keep every phase transition consistent so the app
// feels like one surface, not five different animators. easeOutExpo-ish
// curve picked because it decelerates fast — no "stretchy" spring bounce,
// no slow linear drift.

export const EASE_OUT = [0.22, 1, 0.36, 1];

// Page-level / phase-swap transition used by HostPage + PlayerPage.
// Short fade + tiny rise. No scale (scale-pops feel like a clown car).
export const pageFade = {
  initial:    { opacity: 0, y: 8 },
  animate:    { opacity: 1, y: 0 },
  exit:       { opacity: 0, y: -8 },
  transition: { duration: 0.28, ease: EASE_OUT },
};

// Softer entrance for individual elements inside a phase (titles, cards).
export const rise = {
  initial:    { opacity: 0, y: 12 },
  animate:    { opacity: 1, y: 0 },
  transition: { duration: 0.35, ease: EASE_OUT },
};
