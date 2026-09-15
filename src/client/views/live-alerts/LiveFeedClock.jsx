import React, { useState, useEffect } from 'react';

export function LiveFeedClock() {
  const [timeStr, setTimeStr] = useState(() => new Date().toLocaleTimeString("en-IN"));
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(new Date().toLocaleTimeString("en-IN"));
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  return <span className="font-semibold text-slate-200">{timeStr}</span>;
}
