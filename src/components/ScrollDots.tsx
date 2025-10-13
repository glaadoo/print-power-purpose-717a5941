import React, { useEffect, useState } from "react";

/** Left-side vertical dots that track & control the current section. */
export default function ScrollDots({ sections }: { sections: string[] }) {
  const [active, setActive] = useState(sections[0]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => entry.isIntersecting && setActive(id),
        { threshold: 0.5 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [sections]);

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 items-center"
      aria-label="Page navigation dots"
    >
      {sections.map((id) => (
        <button
          key={id}
          onClick={() => scrollTo(id)}
          className={`
            w-3 h-3 rounded-full border border-white/60 transition-all
            ${active === id ? "bg-white scale-125" : "bg-transparent"}
            hover:bg-white/40 hover:scale-110
          `}
          aria-label={`Scroll to ${id}`}
        />
      ))}
    </div>
  );
}
