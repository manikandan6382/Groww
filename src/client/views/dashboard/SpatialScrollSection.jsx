import React, { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import clsx from "clsx";

/**
 * 🍏 PortfolioX Spatial Scroll Section
 * 
 * Replaces disjointed card-by-card staggered popups with Apple/Linear continuous panel flow.
 * - Cohesive unit entrance: Entire semantic section glides in smoothly as one intelligent instrument.
 * - Restrained spatial receding: Outgoing section subtly scales (1.0 -> 0.988) and softens (1.0 -> 0.94)
 *   as next section scrolls into focus, providing physical depth without blurring or layout shifts.
 * - Hardware-accelerated: Driven directly by GPU compositor MotionValues without React re-renders.
 * - Accessibility: Fully respects `prefers-reduced-motion` with zero translation/scaling.
 */
export function SpatialScrollSection({
  children,
  className = "",
  enableRecede = true,
  id,
  as: Component = "section",
}) {
  const containerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();

  // Scroll progress for the receding spatial depth when scrolling past the section top
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  // Precision-restrained values: 1.0 -> 0.988 scale, 1.0 -> 0.94 opacity, 0 -> -8px subtle parallax
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.988]);
  const opacity = useTransform(scrollYProgress, [0, 0.85, 1], [1, 0.98, 0.94]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -8]);

  // When reduced motion is preferred, render clean static container without transform
  if (shouldReduceMotion) {
    return (
      <Component
        id={id}
        ref={containerRef}
        className={clsx("w-full transition-opacity duration-200", className)}
      >
        {children}
      </Component>
    );
  }

  const MotionComponent = motion[Component] || motion.section;

  return (
    <MotionComponent
      id={id}
      ref={containerRef}
      // 1. Primary Continuous Panel Flow entrance
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px 0px -40px 0px" }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1], // Apple standard decelerate curve
      }}
      // 2. Restrained Spatial Overlap (scroll-linked receding depth)
      style={{
        position: "relative",
        scale: enableRecede ? scale : 1,
        opacity: enableRecede ? opacity : 1,
        y: enableRecede ? y : 0,
        transformOrigin: "center top",
        willChange: enableRecede ? "transform, opacity" : "auto",
      }}
      className={clsx("w-full relative transform-gpu", className)}
    >
      {children}
    </MotionComponent>
  );
}

export default SpatialScrollSection;
