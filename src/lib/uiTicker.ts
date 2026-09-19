/**
 * One shared 10 Hz timer for every piece of DOM chrome that mirrors continuous film state (the progress hairline, the
 * engineering readouts). They write straight to DOM nodes; none of them go through React state. It runs only while at
 * least one subscriber exists.
 */
type Tick = () => void;

const subscribers = new Set<Tick>();
let timer: ReturnType<typeof setInterval> | null = null;

export function subscribeUiTick(tick: Tick) {
  subscribers.add(tick);
  tick();
  timer ??= setInterval(() => {
    for (const subscriber of subscribers) subscriber();
  }, 100);
  return () => {
    subscribers.delete(tick);
    if (subscribers.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}
