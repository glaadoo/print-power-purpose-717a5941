import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

type Props = {
  srcMp4: string;
  srcWebm?: string;
  poster?: string;
  /** How much vertical parallax to apply (in viewport height). 0 = off */
  parallaxVh?: number;
  overlay?: React.ReactNode;
  className?: string;
};

/** Parallax background video that reacts to scrolling across its section. */
export default function VideoBackground({
  srcMp4,
  srcWebm,
  poster,
  parallaxVh = 12,
  overlay,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 0->1 as this section scrolls past the viewport
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`-${parallaxVh}vh`, `${parallaxVh}vh`]
  );

  return (
    <div ref={ref} className={`absolute inset-0 -z-10 overflow-hidden ${className}`}>
      <motion.video
        style={{ y }}
        className="w-full h-full object-cover"
        poster={poster}
        preload="none"
        autoPlay
        muted
        loop
        playsInline
        loading="lazy"
      >
        {srcWebm && <source src={srcWebm} type="video/webm" />}
        <source src={srcMp4} type="video/mp4" />
      </motion.video>
      {overlay ?? <div className="absolute inset-0 bg-black/30" />}
    </div>
  );
}
