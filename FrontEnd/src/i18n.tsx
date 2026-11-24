"use client";

import React from "react";

export type Language = "pt" | "en" | "es";

export function LocalizedContent({
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
