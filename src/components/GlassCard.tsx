import { ReactNode } from "react";

export default function GlassCard({
  children,
  className = "",
  padding = "p-8",
}: {
  children: ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <section
      className={`
        ${padding}
        max-w-3xl mx-auto
        rounded-2xl shadow-xl
        ${className}
      `}
      style={{
        backgroundColor: "transparent",      // see-through
        border: "2px solid rgba(255,255,255,0.5)", // subtle outline
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)", // floating shadow
      }}
    >
      {children}
    </section>
  );
}