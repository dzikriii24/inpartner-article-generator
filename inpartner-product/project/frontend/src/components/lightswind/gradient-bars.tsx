"use client";

import React, { useRef, useEffect, useId, useState } from "react";
import clsx from "clsx";

export type GradientBarsShape =
  | "v-shape"
  | "inverted-v"
  | "wave"
  | "pyramid"
  | "arch"
  | "equalizer"
  | "flat";

export type GradientBarsAnimation =
  | "pulse"
  | "wave"
  | "equalizer"
  | "breathe"
  | "static";

export type GradientBarsOrigin = "bottom" | "top" | "center";
export type GradientBarsTheme = "auto" | "dark" | "light";

export interface GradientBarsProps {
  /** Total number of vertical bars across the container (default: 17) */
  numBars?: number;
  /** Primary gradient color in hex, rgb, or rgba (default: "rgb(59, 130, 246)") */
  gradientColor?: string;
  /** Secondary gradient color for rich multi-tone bars (e.g. "#06b6d4" or "#6366f1") */
  secondaryGradientColor?: string;
  /** Array of custom gradient colors for multi-stop gradients */
  gradientColors?: string[];
  /** Background base color. If undefined, adapts to light/dark theme automatically */
  bgColor?: string;
  /** Theme mode for adaptive styling: "auto" (adapts to system/html.dark), "dark", or "light" */
  themeMode?: GradientBarsTheme;
  /** Height distribution curve across bars (default: "v-shape") */
  shape?: GradientBarsShape;
  /** Animation rhythm type (default: "pulse") */
  animationMode?: GradientBarsAnimation;
  /** Duration of full animation cycle in seconds (default: 4) */
  animationDuration?: number;
  /** Animation speed multiplier (default: 1) */
  speed?: number;
  /** Stagger delay in seconds between adjacent bars (default: 0.12) */
  staggerDelay?: number;
  /** Minimum base bar height percentage (default: 32) */
  minHeightPercent?: number;
  /** Maximum peak bar height percentage (default: 95) */
  maxHeightPercent?: number;
  /** Gap between vertical bars in pixels or CSS string (default: 0) */
  barGap?: number | string;
  /** Top corner rounding of bars (e.g. "rounded-t-none", "rounded-t-md", "rounded-t-full") */
  barRadius?: string;
  /** Vertical origin where bars anchor and expand from (default: "bottom") */
  origin?: GradientBarsOrigin;
  /** Enable mouse proximity reactivity that elevates bars near cursor (default: true) */
  interactive?: boolean;
  /** Multiplier for mouse hover elevation (default: 0.25) */
  interactiveStrength?: number;
  /** Radius in pixels for cursor proximity influence (default: 260) */
  interactiveRadius?: number;
  /** Display bottom/ambient radial glow (default: true) */
  showAmbientGlow?: boolean;
  /** Height of ambient bottom glow in pixels or CSS value (default: "180px") */
  ambientGlowHeight?: string | number;
  /** Opacity of ambient glow from 0 to 1 (default: 0.4) */
  ambientGlowIntensity?: number;
  /** Show subtle edge vignette overlay focusing light inward (default: true) */
  showVignette?: boolean;
  /** Show high-tech cybernetic grid lines overlay (default: false) */
  showGridLines?: boolean;
  /** Show subtle filmic grain noise overlay (default: false) */
  showNoiseTexture?: boolean;
  /** Foreground content overlay (headings, badges, CTAs) */
  children?: React.ReactNode;
  /** Additional container classes */
  className?: string;
}

export const GradientBars: React.FC<GradientBarsProps> = ({
  numBars = 17,
  gradientColor = "rgb(59, 130, 246)",
  secondaryGradientColor,
  gradientColors,
  bgColor,
  themeMode = "auto",
  shape = "v-shape",
  animationMode = "pulse",
  animationDuration = 4,
  speed = 1,
  staggerDelay = 0.12,
  minHeightPercent = 32,
  maxHeightPercent = 95,
  barGap = 0,
  barRadius = "rounded-t-none",
  origin = "bottom",
  interactive = true,
  interactiveStrength = 0.25,
  interactiveRadius = 260,
  showAmbientGlow = true,
  ambientGlowHeight = "180px",
  ambientGlowIntensity = 0.4,
  showVignette = true,
  showGridLines = false,
  showNoiseTexture = false,
  children,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);
  const uniqueId = useId().replace(/:/g, "");

  // Auto theme detection
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  useEffect(() => {
    if (themeMode === "dark") {
      setIsDarkTheme(true);
      return;
    }
    if (themeMode === "light") {
      setIsDarkTheme(false);
      return;
    }

    // Auto mode: check document.documentElement class
    if (typeof document !== "undefined") {
      const checkDark = () => document.documentElement.classList.contains("dark");
      setIsDarkTheme(checkDark());

      const observer = new MutationObserver(() => {
        setIsDarkTheme(checkDark());
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });
      return () => observer.disconnect();
    }
  }, [themeMode]);

  const actualDuration = Math.max(0.5, animationDuration / Math.max(0.1, speed));
  const midIndex = (numBars - 1) / 2;

  // Calculate base height percentage for each bar based on the chosen shape
  const calculateBaseHeight = (index: number): number => {
    const distFromCenter = Math.abs(index - midIndex);
    const normalizedDist = distFromCenter / (midIndex || 1);
    const normalizedIndex = index / (numBars - 1 || 1);
    const range = maxHeightPercent - minHeightPercent;

    switch (shape) {
      case "v-shape":
        return minHeightPercent + normalizedDist * range;

      case "inverted-v":
      case "pyramid":
        return maxHeightPercent - normalizedDist * range;

      case "wave":
        return (
          minHeightPercent +
          range * (0.5 + 0.5 * Math.sin(normalizedIndex * Math.PI * 2))
        );

      case "arch":
        return minHeightPercent + range * (1 - Math.pow(normalizedDist, 1.8));

      case "equalizer": {
        const patterns = [0.85, 0.45, 0.95, 0.6, 0.75, 0.4, 0.9, 0.5, 1.0];
        const patternVal = patterns[index % patterns.length];
        return minHeightPercent + range * patternVal;
      }

      case "flat":
      default:
        return (minHeightPercent + maxHeightPercent) / 2;
    }
  };

  // Build the bar gradient string adapted to Dark or Light theme
  const getBarGradient = () => {
    if (gradientColors && gradientColors.length > 0) {
      return `linear-gradient(to top, ${gradientColors.join(", ")})`;
    }

    const fadeMid = isDarkTheme ? "rgba(0, 0, 0, 0.35)" : "rgba(255, 255, 255, 0.45)";

    if (secondaryGradientColor) {
      return `linear-gradient(to top, ${gradientColor} 0%, ${secondaryGradientColor} 50%, ${fadeMid} 80%, transparent 100%)`;
    }
    return `linear-gradient(to top, ${gradientColor} 0%, ${fadeMid} 65%, transparent 100%)`;
  };

  // Interactive mouse tracking with requestAnimationFrame for 60+ FPS
  useEffect(() => {
    if (!interactive) return;

    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(updateBarInteractivity);
      }
    };

    const handleMouseLeave = () => {
      mousePosRef.current = null;
      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(resetBarInteractivity);
      }
    };

    const updateBarInteractivity = () => {
      animationFrameRef.current = null;
      if (!mousePosRef.current) return;

      const mouseX = mousePosRef.current.x;

      barsRef.current.forEach((bar) => {
        if (!bar) return;
        const rect = bar.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const barCenterX = rect.left - containerRect.left + rect.width / 2;
        const dist = Math.abs(mouseX - barCenterX);

        if (dist < interactiveRadius) {
          const proximity = 1 - dist / interactiveRadius;
          const boost = proximity * interactiveStrength;
          bar.style.setProperty("--mouse-boost", `${1 + boost}`);
          bar.style.setProperty("--mouse-brightness", `${1 + proximity * 0.4}`);
        } else {
          bar.style.setProperty("--mouse-boost", "1");
          bar.style.setProperty("--mouse-brightness", "1");
        }
      });
    };

    const resetBarInteractivity = () => {
      animationFrameRef.current = null;
      barsRef.current.forEach((bar) => {
        if (!bar) return;
        bar.style.setProperty("--mouse-boost", "1");
        bar.style.setProperty("--mouse-brightness", "1");
      });
    };

    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [interactive, interactiveRadius, interactiveStrength]);

  const originClasses = {
    bottom: "items-end",
    top: "items-start",
    center: "items-center",
  }[origin];

  const transformOrigin = {
    bottom: "bottom center",
    top: "top center",
    center: "center center",
  }[origin];

  // Effective background color
  const effectiveBgColor = bgColor ?? (isDarkTheme ? "#000000" : "#ffffff");

  return (
    <div
      ref={containerRef}
      className={clsx(
        "relative w-full h-full min-h-[500px] overflow-hidden flex flex-col justify-end select-none transition-colors duration-300",
        className
      )}
      style={{
        backgroundColor: effectiveBgColor,
      }}
    >
      {/* ── BACKGROUND BARS CONTAINER ── */}
      <div
        className={clsx(
          "absolute inset-0 flex w-full h-full pointer-events-none z-0",
          originClasses
        )}
        style={{
          gap: typeof barGap === "number" ? `${barGap}px` : barGap,
        }}
      >
        {Array.from({ length: numBars }).map((_, index) => {
          const distFromCenter = Math.abs(index - midIndex);
          const baseHeight = calculateBaseHeight(index);

          let delay = 0;
          if (animationMode === "pulse" || animationMode === "breathe") {
            delay = distFromCenter * staggerDelay;
          } else if (animationMode === "wave") {
            delay = index * staggerDelay;
          } else if (animationMode === "equalizer") {
            delay = (index % 4) * 0.18;
          }

          return (
            <div
              key={index}
              className={clsx("flex-1 h-full flex justify-center", originClasses)}
            >
              <div
                ref={(el) => {
                  barsRef.current[index] = el;
                }}
                className={clsx(
                  "w-full transition-[filter] duration-300 ease-out",
                  barRadius
                )}
                style={{
                  height: `${baseHeight}%`,
                  background: getBarGradient(),
                  transformOrigin,
                  willChange: "transform",
                  transform: "scaleY(var(--mouse-boost, 1)) translateZ(0)",
                  filter: "brightness(var(--mouse-brightness, 1))",
                  animation:
                    animationMode !== "static"
                      ? `gb-anim-${uniqueId}-${animationMode} ${actualDuration}s ease-in-out infinite alternate`
                      : "none",
                  animationDelay: `${delay.toFixed(3)}s`,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ── AMBIENT BOTTOM RADIAL GLOW ── */}
      {showAmbientGlow && (
        <div
          className="absolute bottom-0 inset-x-0 pointer-events-none blur-3xl transition-opacity duration-700"
          style={{
            height:
              typeof ambientGlowHeight === "number"
                ? `${ambientGlowHeight}px`
                : ambientGlowHeight,
            opacity: ambientGlowIntensity,
            background: `radial-gradient(ellipse at bottom, ${gradientColor} 0%, ${
              secondaryGradientColor || gradientColor
            } 40%, transparent 75%)`,
          }}
        />
      )}

      {/* ── CINEMATIC VIGNETTE (THEME-ADAPTIVE) ── */}
      {showVignette && (
        <div
          className="absolute inset-0 pointer-events-none z-1 transition-opacity duration-300"
          style={{
            background: isDarkTheme
              ? "radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, 0.45) 85%, rgba(0, 0, 0, 0.85) 100%)"
              : "radial-gradient(ellipse at center, transparent 45%, rgba(255, 255, 255, 0.4) 85%, rgba(255, 255, 255, 0.85) 100%)",
          }}
        />
      )}

      {/* ── OPTIONAL CYBERNETIC GRID OVERLAY ── */}
      {showGridLines && (
        <div
          className={clsx(
            "absolute inset-0 pointer-events-none z-1",
            isDarkTheme ? "opacity-15" : "opacity-10"
          )}
          style={{
            backgroundImage: isDarkTheme
              ? "linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px)"
              : "linear-gradient(to right, rgba(0, 0, 0, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      )}

      {/* ── OPTIONAL NOISE TEXTURE ── */}
      {showNoiseTexture && (
        <div
          className="absolute inset-0 pointer-events-none z-1 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          }}
        />
      )}

      {/* ── FOREGROUND CONTENT OVERLAY ── */}
      {children && (
        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 sm:p-10 pointer-events-auto">
          {children}
        </div>
      )}

      {/* ── HARDWARE-ACCELERATED SCOPED CSS KEYFRAMES ── */}
      <style>{`
        @keyframes gb-anim-${uniqueId}-pulse {
          0% {
            transform: scaleY(0.92) translateZ(0);
            opacity: 0.85;
          }
          100% {
            transform: scaleY(1.08) translateZ(0);
            opacity: 1;
          }
        }
        @keyframes gb-anim-${uniqueId}-wave {
          0% {
            transform: scaleY(0.85) translateZ(0);
            opacity: 0.8;
          }
          50% {
            transform: scaleY(1.12) translateZ(0);
            opacity: 1;
          }
          100% {
            transform: scaleY(0.9) translateZ(0);
            opacity: 0.85;
          }
        }
        @keyframes gb-anim-${uniqueId}-equalizer {
          0% {
            transform: scaleY(0.7) translateZ(0);
            opacity: 0.75;
          }
          35% {
            transform: scaleY(1.18) translateZ(0);
            opacity: 1;
          }
          70% {
            transform: scaleY(0.88) translateZ(0);
            opacity: 0.9;
          }
          100% {
            transform: scaleY(1.05) translateZ(0);
            opacity: 0.95;
          }
        }
        @keyframes gb-anim-${uniqueId}-breathe {
          0% {
            transform: scaleY(0.95) translateZ(0);
            opacity: 0.88;
          }
          100% {
            transform: scaleY(1.04) translateZ(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default GradientBars;
