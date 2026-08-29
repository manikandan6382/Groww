import React from "react";
import clsx from "clsx";

export function AppleCard({ children, className, ...props }) {
  return (
    <div
      className={clsx(
        "apple-ceramic-card p-4 transition-all duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
