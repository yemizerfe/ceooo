"use client";

import * as React from "react";

interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: "auto" | "hover" | "scroll";
  offsetScrollbar?: boolean;
}

export function ScrollArea({
  type = "auto",
  offsetScrollbar = false,
  className,
  style,
  children,
  ...props
}: ScrollAreaProps) {
  return (
    <div
      style={{
        ...style,
        overflowY: type === "auto" ? (style?.height ? "auto" : "scroll") : "hidden",
        height: style?.height ?? undefined,
      }}
      className={className}
      {...props}
    >
      {children}
    </div>
  );
}
