import { useState, useEffect, useRef } from "react";

export function useAnimatedCounter(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const frameRef = useRef<number>();

  useEffect(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    if (end === 0) {
      setCount(0);
      countRef.current = 0;
      return;
    }

    const startValue = countRef.current;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // easeOutExpo for smooth deceleration
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentValue = Math.floor(startValue + (end - startValue) * easeOutExpo);

      setCount(currentValue);
      countRef.current = currentValue;

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
        countRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration]);

  return count;
}
