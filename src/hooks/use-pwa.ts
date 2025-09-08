import { useEffect, useState } from "react";

export function usePWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const navigator = window.navigator as Navigator & {
        standalone?: boolean;
      };
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS-specific
        navigator.standalone === true;

      setIsPWA(isStandalone);
    }
  }, []);

  return isPWA;
}
