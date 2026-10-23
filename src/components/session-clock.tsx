"use client";
import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
export function SessionClock({
  deadline,
  onExpire,
  instructional = false,
}: {
  deadline: string;
  onExpire: () => void;
  instructional?: boolean;
}) {
  const [seconds, setSeconds] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((Date.parse(deadline) - Date.now()) / 1000),
      );
      setSeconds(remaining);
      if (!remaining) onExpire();
    }, 500);
    return () => window.clearInterval(timer);
  }, [deadline, onExpire]);
  return (
    <div
      className={`session-clock ${seconds !== null && seconds < 60 ? "clock-urgent" : ""}`}
      role="timer"
      aria-label={
        instructional
          ? "Practice time remaining"
          : "Demonstration time remaining"
      }
      aria-live="off"
    >
      <Timer size={17} />
      <strong>
        {seconds === null
          ? "Loading timer…"
          : `${Math.floor(seconds / 60)
              .toString()
              .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`}
      </strong>
      <small>{instructional ? "Practice timer" : "Demo timer"}</small>
    </div>
  );
}
