/**
 * Liquid "marble stripes" backdrop — recreates the blue wavy-lines wallpaper.
 *
 * Technique: a sky-blue/navy stripe <pattern> is warped by an SVG turbulence
 * displacement map (straight stripes -> organic waves), then softened with a
 * small blur so the edges are smooth. The stage is pinned to one viewport
 * (sticky, 100vh) so the expensive filter only ever paints a constant area —
 * keeping it identical across panels and cheap on long, scrolling pages.
 */
export function WavyBackground() {
  return (
    <div className="wavy-bg" aria-hidden="true">
      <div className="wavy-stage">
        <svg
          className="wavy-svg"
          width="100%"
          height="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              id="wavy-stripes"
              width="74"
              height="74"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(10)"
            >
              <rect width="74" height="74" fill="#16a6ee" />
              <rect width="33" height="74" fill="#0a0f3c" />
            </pattern>

            <filter
              id="wavy-liquid"
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.0019 0.0030"
                numOctaves="2"
                seed="14"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="360"
                xChannelSelector="R"
                yChannelSelector="G"
                result="disp"
              />
              {/* Soften the displaced stripe edges into smooth waves. */}
              <feGaussianBlur in="disp" stdDeviation="0.7" />
            </filter>
          </defs>

          {/* Oversized well beyond the viewport so the displacement always has
             stripe content to pull into the edges (no bare/dark corners). */}
          <rect
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
            fill="url(#wavy-stripes)"
            filter="url(#wavy-liquid)"
          />
        </svg>

        <div className="wavy-overlay" />
      </div>
    </div>
  );
}
