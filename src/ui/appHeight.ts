export function installAppHeight(win: Window & typeof globalThis = window): () => void {
  const set = () =>
    win.document.documentElement.style.setProperty("--app-height", `${win.innerHeight}px`);
  set();
  win.addEventListener("resize", set);
  return () => win.removeEventListener("resize", set);
}
