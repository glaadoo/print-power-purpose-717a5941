import React from "react";

type Props = {
  id?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Section({ id, children, className = "" }: Props) {
  return (
    <section
      id={id}
      className="
        relative h-screen w-full snap-start
        flex items-center justify-center
        px-6
      "
    >
      <div
        className={`
          w-full max-w-5xl
          rounded-3xl border border-white/40
          bg-white/10 backdrop-blur
          shadow-2xl
          p-8 md:p-12
          text-white
          ${className}
        `}
      >
        {children}
      </div>
    </section>
  );
}
