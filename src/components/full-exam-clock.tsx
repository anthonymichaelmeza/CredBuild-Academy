"use client";

import { useEffect, useRef, useState } from "react";
import { Timer } from "lucide-react";

export function formatExamTime(seconds: number) {
  const bounded = Math.max(0, Math.floor(seconds));
  return `${Math.floor(bounded / 3600)
    .toString()
    .padStart(2, "0")}:${Math.floor((bounded % 3600) / 60)
    .toString()
    .padStart(2, "0")}:${(bounded % 60).toString().padStart(2, "0")}`;
}

/** The server supplies both timestamps; the visitor's wall-clock offset is irrelevant. */
export function FullExamClock({
  deadline,
  serverNow,
  onExpire,
}: {
  deadline: string;
  serverNow: string;
  onExpire: () => void;
}) {
  const [seconds, setSeconds] = useState(() =>
    Math.max(
      0,
      Math.ceil((Date.parse(deadline) - Date.parse(serverNow)) / 1000),
    ),
  );
  const expired = useRef(false);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  }, [onExpire]);
  useEffect(() => {
    const receivedAt = performance.now();
    const remainingAtReceipt = Math.max(
      0,
      Date.parse(deadline) - Date.parse(serverNow),
    );
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil(
          (remainingAtReceipt - (performance.now() - receivedAt)) / 1000,
        ),
      );
      setSeconds(remaining);
      if (!remaining && !expired.current) {
        expired.current = true;
        expire.current();
      }
      if (remaining > 0) expired.current = false;
    }, 250);
    return () => window.clearInterval(timer);
  }, [deadline, serverNow]);
  return (
    <div
      className={`full-exam-clock ${seconds < 300 ? "is-urgent" : ""}`}
      role="timer"
      aria-label="Exam time remaining"
      aria-live="off"
    >
      <Timer size={20} />
      <span>
        <strong>{formatExamTime(seconds)}</strong>
        <small>Time remaining</small>
      </span>
    </div>
  );
}
