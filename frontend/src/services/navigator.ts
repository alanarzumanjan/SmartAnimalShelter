import type { NavigateFunction } from "react-router-dom";

let _navigate: NavigateFunction | null = null;

export function setNavigator(fn: NavigateFunction): void {
  _navigate = fn;
}

export function navigateTo(path: string): void {
  if (_navigate) {
    _navigate(path, { replace: true });
  } else {
    // fallback if called before router mounts (should not happen in practice)
    window.location.href = path;
  }
}
