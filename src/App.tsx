import { useEffect, useState } from "react";
import { PresenterApp } from "./presenter/PresenterApp";
import { ReaderApp } from "./reader/ReaderApp";
import { ToastProvider } from "./ui/Toast";

export function App() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return (
    <ToastProvider>
      {hash === "#reader" ? <ReaderApp /> : <PresenterApp />}
    </ToastProvider>
  );
}
