import { useEffect, useReducer, useRef } from "react";
import { SimEngine } from "@/lib/sim/engine";

/** Runs the client-side railway simulation and re-renders twice per second. */
export function useSimulation(): SimEngine {
  const ref = useRef<SimEngine | null>(null);
  if (!ref.current) ref.current = new SimEngine();
  const [, force] = useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    const iv = setInterval(() => {
      ref.current!.tick(0.5);
      force();
    }, 500);
    return () => clearInterval(iv);
  }, []);

  return ref.current;
}
