/**
 * Engineering mode (E) and the debug chapter keys (1-9, 0) are development tools. They are always on in `next dev`,
 * and in a production build only when the URL carries ?engineering, so a viewer pressing a number key by accident
 * never jumps the film.
 */
export const isEngineeringAllowed = () =>
  process.env.NODE_ENV !== "production" ||
  (typeof window !== "undefined" && new URLSearchParams(window.location.search).has("engineering"));
