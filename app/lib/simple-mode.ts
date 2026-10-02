import { useState } from "react";

const STORAGE_KEY = "baas_simple_mode";

function readSimpleMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function useSimpleMode(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(() => readSimpleMode());

  function toggle(v: boolean) {
    setEnabled(v);
    try {
      localStorage.setItem(STORAGE_KEY, String(v));
    } catch {
      // ignore storage errors (e.g. private browsing)
    }
    document.documentElement.classList.toggle("simple-mode", v);
  }

  return [enabled, toggle];
}
