

/** One set of durations/easings for the whole app. */
export const ease = [0.22, 1, 0.36, 1] ;
export const fast = { duration: 0.18, ease };
export const base = { duration: 0.32, ease };
export const spring = { type: "spring", stiffness: 420, damping: 38 };

export const page = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: base },
  exit: { opacity: 0, y: -4, transition: fast },
};
export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } } };
export const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: base } };
export const pop = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: base },
  exit: { opacity: 0, scale: 0.97, transition: fast },
};
export const collapse = {
  hidden: { height: 0, opacity: 0 },
  show: { height: "auto", opacity: 1, transition: base },
  exit: { height: 0, opacity: 0, transition: fast },
};
