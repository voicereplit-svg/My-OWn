import React, { useState } from "react";

interface InteractiveDiagramProps {
  diagramKey: string;
  theme: "light" | "dark";
}

export default function InteractiveDiagram({ diagramKey, theme }: InteractiveDiagramProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const isDark = theme === "dark";

  // Common colors
  const strokeColor = isDark ? "#94A3B8" : "#475569";
  const axisColor = isDark ? "#334155" : "#CBD5E1";
  const activeStroke = "#6366F1"; // indigo-500
  const fillColor = isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(99, 102, 241, 0.08)";

  const renderDiagram = () => {
    switch (diagramKey) {
      case "plant-cell":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Cell Wall */}
            <polygon
              points="40,20 360,10 380,260 120,290 20,240"
              fill={isDark ? "#064E3B" : "#D1FAE5"}
              stroke="#059669"
              strokeWidth="4"
              className="transition-all duration-200"
            />
            {/* Cell Membrane */}
            <polygon
              points="48,28 350,18 368,252 118,280 28,232"
              fill={isDark ? "#022C22" : "#ECFDF5"}
              stroke="#10B981"
              strokeWidth="2"
            />
            {/* Central Vacuole */}
            <path
              d="M 120 100 Q 140 70, 240 80 T 320 180 Q 240 250, 180 230 Z"
              fill={hoveredPart === "vacuole" ? "rgba(14, 165, 233, 0.3)" : isDark ? "#0369A1" : "#E0F2FE"}
              stroke="#0284C7"
              strokeWidth="2"
              onMouseEnter={() => setHoveredPart("vacuole")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer transition-all duration-200"
            />
            {/* Nucleus */}
            <circle
              cx="100"
              cy="180"
              r="35"
              fill={hoveredPart === "nucleus" ? "rgba(99, 102, 241, 0.4)" : isDark ? "#312E81" : "#EEF2FF"}
              stroke="#4F46E5"
              strokeWidth="2.5"
              onMouseEnter={() => setHoveredPart("nucleus")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer transition-all duration-200"
            />
            {/* Nucleolus */}
            <circle
              cx="95"
              cy="175"
              r="12"
              fill={isDark ? "#4F46E5" : "#818CF8"}
            />
            {/* Chloroplasts */}
            <g
              onMouseEnter={() => setHoveredPart("chloroplast")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer"
            >
              <ellipse
                cx="310"
                cy="70"
                rx="18"
                ry="10"
                fill="#047857"
                stroke="#34D399"
                strokeWidth="1.5"
                transform="rotate(15, 310, 70)"
              />
              <ellipse
                cx="80"
                cy="60"
                rx="16"
                ry="9"
                fill="#047857"
                stroke="#34D399"
                strokeWidth="1.5"
                transform="rotate(-20, 80, 60)"
              />
            </g>
            {/* Mitochondria */}
            <g
              onMouseEnter={() => setHoveredPart("mitochondria")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer"
            >
              <ellipse
                cx="280"
                cy="230"
                rx="15"
                ry="8"
                fill="#EF4444"
                stroke="#F87171"
                strokeWidth="1.5"
                transform="rotate(45, 280, 230)"
              />
              <ellipse
                cx="210"
                cy="110"
                rx="16"
                ry="8"
                fill="#EF4444"
                stroke="#F87171"
                strokeWidth="1.5"
                transform="rotate(-30, 210, 110)"
              />
            </g>
            {/* Labels overlay */}
            <text x="175" y="160" fill={strokeColor} className="text-xs font-mono select-none" pointerEvents="none">
              {hoveredPart === "vacuole"
                ? "Central Vacuole (Water Storage)"
                : hoveredPart === "nucleus"
                ? "Nucleus (Genetic DNA Storage)"
                : hoveredPart === "chloroplast"
                ? "Chloroplast (Photosynthesis Sites)"
                : hoveredPart === "mitochondria"
                ? "Mitochondrion (ATP Synth Energy)"
                : "Hover parts to identify organelles"}
            </text>
          </svg>
        );

      case "inclined-plane":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Incline Wedge */}
            <polygon
              points="60,250 340,250 340,110"
              fill="none"
              stroke={strokeColor}
              strokeWidth="3"
            />
            {/* Angle Indicator theta */}
            <path
              d="M 120 250 A 60 60 0 0 0 112 225"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
            />
            <text x="130" y="242" fill="#F59E0B" className="text-xs font-serif font-bold">θ = 30°</text>

            {/* Block on incline */}
            <g transform="translate(190, 150) rotate(-26.5)">
              <rect
                x="-30"
                y="-25"
                width="60"
                height="40"
                fill={hoveredPart === "block" ? "rgba(99, 102, 241, 0.25)" : isDark ? "#4F46E5" : "#EEF2FF"}
                stroke={activeStroke}
                strokeWidth="2.5"
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredPart("block")}
                onMouseLeave={() => setHoveredPart(null)}
              />
              {/* Gravity Vector F_g straight down (needs correction for rotation) */}
              <line
                x1="0"
                y1="-5"
                x2="-15"
                y2="55"
                stroke="#EF4444"
                strokeWidth="2"
                markerEnd="url(#arrow-red)"
              />
              <text x="-35" y="45" fill="#EF4444" className="text-[10px] font-mono">Fg = mg</text>

              {/* Normal Force F_N perpendicular straight up */}
              <line
                x1="0"
                y1="-5"
                x2="0"
                y2="-55"
                stroke="#10B981"
                strokeWidth="2"
                markerEnd="url(#arrow-green)"
              />
              <text x="5" y="-45" fill="#10B981" className="text-[10px] font-mono">FN</text>

              {/* Friction Force F_f parallel back */}
              <line
                x1="-3"
                y1="-5"
                x2="-53"
                y2="-5"
                stroke="#EF4444"
                strokeWidth="1.5"
                markerEnd="url(#arrow-red)"
              />
              <text x="-55" y="-12" fill="#EF4444" className="text-[10px] font-mono">Ff</text>
            </g>

            {/* SVG Markers */}
            <defs>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
              </marker>
              <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
              </marker>
            </defs>
            <text x="50" y="50" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "block" ? "Resting Block: mg sinθ drags plane down" : "Classical incline vector resolutions"}
            </text>
          </svg>
        );

      case "benzene-ring":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Benzene Ring Hexagon */}
            <g transform="translate(200, 140)">
              {/* Outer Carbons */}
              <polygon
                points="0,-80 69,-40 69,40 0,80 -69,40 -69,-40"
                fill="none"
                stroke={hoveredPart === "ring" ? activeStroke : strokeColor}
                strokeWidth="3.5"
                className="transition-colors duration-200"
              />
              {/* Inner double bonds */}
              <line x1="0" y1="-80" x2="69" y2="-40" stroke={strokeColor} strokeWidth="3.5" />
              <line x1="59" y1="-35" x2="59" y2="35" stroke={strokeColor} strokeWidth="2" />
              <line x1="69" y1="40" x2="0" y2="80" stroke={strokeColor} strokeWidth="3.5" />
              <line x1="-5" y1="68" x2="-59" y2="37" stroke={strokeColor} strokeWidth="2" />
              <line x1="-69" y1="40" x2="-69" y2="-40" stroke={strokeColor} strokeWidth="3.5" />
              <line x1="-59" y1="-35" x2="-5" y2="-66" stroke={strokeColor} strokeWidth="2" />

              {/* Pi-electron circle inside */}
              <circle
                cx="0"
                cy="0"
                r="45"
                fill={hoveredPart === "ring" ? "rgba(99, 102, 241, 0.15)" : "none"}
                stroke="#6366F1"
                strokeWidth="2.5"
                strokeDasharray="6,4"
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredPart("ring")}
                onMouseLeave={() => setHoveredPart(null)}
              />

              {/* Carbon node representations */}
              {[[0,-80], [69,-40], [69,40], [0,80], [-69,40], [-69,-40]].map(([x,y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="6"
                  fill={isDark ? "#1E293B" : "#F1F5F9"}
                  stroke={activeStroke}
                  strokeWidth="1.5"
                />
              ))}
            </g>
            <text x="140" y="245" fill={strokeColor} className="text-xs font-mono font-bold">C6H6 (Benzene Ring)</text>
            <text x="40" y="40" fill={strokeColor} className="text-[11px] font-mono">
              {hoveredPart === "ring" ? "Delocalized Pi-Molecular Orbital Cloud (Aromaticity)" : "Sp2 hybrid state alternating bonds"}
            </text>
          </svg>
        );

      case "geometry-tangent":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Circle */}
            <circle
              cx="200"
              cy="150"
              r="70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
            />
            {/* Center Node */}
            <circle cx="200" cy="150" r="4" fill={activeStroke} />
            <text x="205" y="145" fill={strokeColor} className="text-xs font-serif italic">O</text>

            {/* Tangent point line */}
            <line
              x1="200"
              y1="150"
              x2="255"
              y2="192"
              stroke="#10B981"
              strokeWidth="2"
            />
            {/* Tangent line */}
            <line
              x1="180"
              y1="290"
              x2="310"
              y2="120"
              stroke="#EF4444"
              strokeWidth="2.5"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPart("tangent")}
              onMouseLeave={() => setHoveredPart(null)}
            />
            {/* Right-angle square */}
            <rect
              x="250"
              y="180"
              width="10"
              height="10"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="1.5"
              transform="rotate(37, 255, 192)"
            />

            {/* Chords to construct cyclic ratios */}
            <polygon
              points="200,150 130,150 255,192"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray="4,3"
            />

            <text x="260" y="190" fill={strokeColor} className="text-xs font-serif font-bold">P</text>
            <text x="110" y="145" fill={strokeColor} className="text-xs font-serif">A</text>

            <text x="50" y="45" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "tangent" ? "Tangent Theorem: OP is perpendicular to Tangent at P" : "Circle theorems: Tangents & Radii intersections"}
            </text>
          </svg>
        );

      case "calculus-integral":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* X and Y Axes */}
            <line x1="50" y1="240" x2="350" y2="240" stroke={axisColor} strokeWidth="2" />
            <line x1="60" y1="50" x2="60" y2="250" stroke={axisColor} strokeWidth="2" />
            <text x="340" y="255" fill={strokeColor} className="text-[10px] font-mono">x</text>
            <text x="45" y="60" fill={strokeColor} className="text-[10px] font-mono">y</text>

            {/* Shaded Area Under Curve */}
            <path
              d="M 120 240 Q 180 80, 280 120 L 280 240 Z"
              fill={hoveredPart === "area" ? "rgba(99, 102, 241, 0.35)" : fillColor}
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredPart("area")}
              onMouseLeave={() => setHoveredPart(null)}
            />

            {/* Boundary bars a & b */}
            <line x1="120" y1="50" x2="120" y2="240" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />
            <line x1="280" y1="50" x2="280" y2="240" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />

            {/* Curve Polynomial representation */}
            <path
              d="M 80 220 Q 180 60, 320 130"
              fill="none"
              stroke={activeStroke}
              strokeWidth="3.5"
            />

            <text x="115" y="255" fill={strokeColor} className="text-xs font-mono">a</text>
            <text x="275" y="255" fill={strokeColor} className="text-xs font-mono">b</text>

            <text x="160" y="170" fill={activeStroke} className="text-xs font-mono font-bold select-none pointer-events-none">
              {hoveredPart === "area" ? "∫[a, b] f(x) dx" : "Area block"}
            </text>

            <text x="50" y="35" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "area" ? "Calculus: Riemann integral representation" : "Riemann Area Approximation integrals"}
            </text>
          </svg>
        );

      case "optics-retraction":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Axis */}
            <line x1="20" y1="150" x2="380" y2="150" stroke={axisColor} strokeWidth="1.5" strokeDasharray="5,3" />

            {/* Focal points */}
            <circle cx="100" cy="150" r="3" fill="#F59E0B" />
            <text x="95" y="140" fill="#F59E0B" className="text-[10px] font-mono">F1</text>
            <circle cx="300" cy="150" r="3" fill="#F59E0B" />
            <text x="295" y="140" fill="#F59E0B" className="text-[10px] font-mono">F2</text>

            {/* Convex Lens vector shape */}
            <path
              d="M 200 50 C 225 100, 225 200, 200 250 C 175 200, 175 100, 200 50 Z"
              fill={hoveredPart === "lens" ? "rgba(99, 102, 241, 0.4)" : "rgba(14, 165, 233, 0.15)"}
              stroke="#0EA5E9"
              strokeWidth="2.5"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredPart("lens")}
              onMouseLeave={() => setHoveredPart(null)}
            />
            <text x="185" y="40" fill="#0EA5E9" className="text-[10px] font-mono">CONVEX LENS</text>

            {/* Parallel Ray incoming */}
            <line x1="50" y1="80" x2="200" y2="80" stroke="#EF4444" strokeWidth="2" />
            <line x1="200" y1="80" x2="300" y2="150" stroke="#EF4444" strokeWidth="2" />
            <line x1="300" y1="150" x2="370" y2="199" stroke="#EF4444" strokeWidth="2" />

            {/* Centre Ray incoming straight */}
            <line x1="50" y1="80" x2="200" y2="150" stroke="#10B981" strokeWidth="1.5" />
            <line x1="200" y1="150" x2="350" y2="220" stroke="#10B981" strokeWidth="1.5" />

            {/* Intersection focal image point */}
            <circle cx="330" cy="171" r="4.5" fill="#EF4444" />
            <text x="325" y="190" fill={strokeColor} className="text-[10px] font-mono font-bold">Real Image</text>

            <text x="40" y="30" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "lens" ? "Double-sided convergence lens forces focus" : "Geometrical Ray Optics focal point tracings"}
            </text>
          </svg>
        );

      case "circuit-resistors":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Battery Source */}
            <line x1="80" y1="150" x2="80" y2="135" stroke={strokeColor} strokeWidth="3" />
            <line x1="80" y1="145" x2="80" y2="140" stroke={strokeColor} strokeWidth="1" />
            <text x="60" y="145" fill={strokeColor} className="text-xs font-mono">V = 12V</text>

            {/* Core Lines wires */}
            <polygon points="80,110 80,50 320,50 320,250 80,250 80,165" fill="none" stroke={strokeColor} strokeWidth="2" />

            {/* Resistor R1 series (sawtooth shape) */}
            <path
              d="M 150 50 L 155 40 L 165 60 L 175 40 L 185 60 L 195 40 L 205 60 L 210 50"
              fill="none"
              stroke="#EF4444"
              strokeWidth="2.5"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPart("r1")}
              onMouseLeave={() => setHoveredPart(null)}
            />
            <text x="165" y="30" fill="#EF4444" className="text-xs font-mono font-semibold">R1 = 4 Ω</text>

            {/* Resistor R2 on bottom wire */}
            <path
              d="M 150 250 L 155 240 L 165 260 L 175 240 L 185 260 L 195 240 L 205 260 L 210 250"
              fill="none"
              stroke="#6366F1"
              strokeWidth="2.5"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPart("r2")}
              onMouseLeave={() => setHoveredPart(null)}
            />
            <text x="165" y="235" fill="#6366F1" className="text-xs font-mono font-semibold">R2 = 8 Ω</text>

            <text x="40" y="20" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "r1"
                ? "First resistance load divider"
                : hoveredPart === "r2"
                ? "Second resistance load divider"
                : "Series DC voltage resistor loops"}
            </text>
          </svg>
        );

      case "heart-anatomy":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Heart chambers stylized block shapes */}
            <path
              d="M 200 260 C 130 200, 100 130, 150 80 C 180 50, 200 90, 200 90 C 200 90, 220 50, 250 80 C 300 130, 270 200, 200 260 Z"
              fill={isDark ? "#2A0E13" : "#FFE4E6"}
              stroke="#EF4444"
              strokeWidth="3.5"
            />

            {/* Left Atrium label */}
            <rect
              x="220"
              y="110"
              width="45"
              height="20"
              rx="5"
              fill={hoveredPart === "la" ? "#EF4444" : isDark ? "#1E293B" : "#FFFFFF"}
              stroke="#FDA4AF"
              strokeWidth="1.5"
              onMouseEnter={() => setHoveredPart("la")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer transition-all duration-200"
            />
            <text x="227" y="124" fill={hoveredPart === "la" ? "#FFFFFF" : strokeColor} className="text-[9px] font-mono font-bold">L. Atrium</text>

            {/* Right Ventricle */}
            <rect
              x="135"
              y="160"
              width="50"
              height="20"
              rx="5"
              fill={hoveredPart === "rv" ? "#63CFFA" : isDark ? "#1E293B" : "#FFFFFF"}
              stroke="#38BDF8"
              strokeWidth="1.5"
              onMouseEnter={() => setHoveredPart("rv")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer transition-all duration-200"
            />
            <text x="142" y="174" fill={hoveredPart === "rv" ? "#0369A1" : strokeColor} className="text-[9px] font-mono font-bold">R. Ventr</text>

            {/* Standard flow arrow oxygenated */}
            <path
              d="M 155 100 Q 180 120, 210 150"
              fill="none"
              stroke="#38BDF8"
              strokeWidth="2"
              markerEnd="url(#arrow-blue-flow)"
            />
            <defs>
              <marker id="arrow-blue-flow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#38BDF8" />
              </marker>
            </defs>

            <text x="50" y="35" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "la"
                ? "Left Atrium: Collects fresh oxygenated oxygen flow"
                : hoveredPart === "rv"
                ? "Right Ventricle: Pumps low-oxygen flow to pulmonary lungs"
                : "Heart flow: blood chamber oxygen transport"}
            </text>
          </svg>
        );

      case "orbit-gravitation":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Ellipictical path */}
            <ellipse
              cx="200"
              cy="150"
              rx="120"
              ry="70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeDasharray="4,2"
            />

            {/* Sun focus at RHS */}
            <circle
              cx="260"
              cy="150"
              r="22"
              fill="#F59E0B"
              stroke="#D97706"
              strokeWidth="1.5"
              className="animate-pulse"
            />
            <text x="252" y="154" fill="#FFFFFF" className="text-[10px] font-mono font-black">SOL</text>

            {/* Small Planet orbiting */}
            <g transform="translate(110, 110)">
              <circle
                cx="0"
                cy="0"
                r="8"
                fill={hoveredPart === "planet" ? "#EF4444" : "#10B981"}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPart("planet")}
                onMouseLeave={() => setHoveredPart(null)}
              />
              {/* Force arrow towards Sun (260,150) -> relative coordinates */}
              <line x1="0" y1="0" x2="70" y2="18" stroke="#EF4444" strokeWidth="2.5" markerEnd="url(#arrow-orbit)" />
              <text x="-15" y="-14" fill={strokeColor} className="text-[10px] font-mono">Planet</text>
            </g>

            <defs>
              <marker id="arrow-orbit" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
              </marker>
            </defs>

            <text x="40" y="30" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "planet" ? "Kepler's Second Law: Orbit speed is fastest at perihelion" : "Orbital Newtonian gravity vector forces"}
            </text>
          </svg>
        );

      case "dna-helix":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* DNA Ribbons sugar-phosphate */}
            {Array.from({ length: 14 }).map((_, i) => {
              const x = 50 + i * 23;
              const y1 = 150 + Math.sin(i * 0.8) * 45;
              const y2 = 150 - Math.sin(i * 0.8) * 45;

              // Alternating Base pairs bond colors
              const bondColor = i % 4 === 0
                ? "#EF4444" // A-T
                : i % 4 === 1
                ? "#10B981" // G-C
                : i % 4 === 2
                ? "#38BDF8" // T-A
                : "#F59E0B"; // C-G

              return (
                <g key={i}>
                  {/* Pair connector rungs */}
                  <line
                    x1={x}
                    y1={y1}
                    x2={x}
                    y2={y2}
                    stroke={bondColor}
                    strokeWidth="3.5"
                    className="cursor-pointer hover:stroke-indigo-500 transition-colors"
                    onMouseEnter={() => setHoveredPart(`base-${i}`)}
                    onMouseLeave={() => setHoveredPart(null)}
                  />
                  {/* Strand nodes */}
                  <circle cx={x} cy={y1} r="4.5" fill={activeStroke} />
                  <circle cx={x} cy={y2} r="4.5" fill={activeStroke} />
                </g>
              );
            })}
            <text x="120" y="240" fill={strokeColor} className="text-xs font-mono font-bold">Hydrogen-Bond Base Pairs</text>
            <text x="40" y="30" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart?.startsWith("base") ? "Base Bonding: Adenine-Thymine & Guanine-Cytosine" : "Double-Helix sugar phosphate hydrogen bonds"}
            </text>
          </svg>
        );

      case "periodic-element":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Box frame representing periodic table element */}
            <rect
              x="120"
              y="40"
              width="160"
              height="200"
              rx="15"
              fill={isDark ? "#1E293B" : "#F8FAFC"}
              stroke={hoveredPart === "cl" ? activeStroke : strokeColor}
              strokeWidth="3.5"
              onMouseEnter={() => setHoveredPart("cl")}
              onMouseLeave={() => setHoveredPart(null)}
              className="cursor-pointer transition-all duration-200"
            />

            {/* Mass state detail displays */}
            <text x="135" y="75" fill="#EF4444" className="text-2xl font-mono font-black">17</text>
            <text x="135" y="93" fill={strokeColor} className="text-[10px] font-mono uppercase tracking-wide">Atomic number</text>

            <text x="200" y="150" fill={activeStroke} className="text-5xl font-sans font-bold text-center" textAnchor="middle">Cl</text>

            <text x="200" y="190" fill={strokeColor} className="text-sm font-sans font-semibold text-center" textAnchor="middle">Chlorine</text>
            <text x="200" y="215" fill="#10B981" className="text-md font-mono font-bold text-center" textAnchor="middle">35.45</text>
            <text x="200" y="228" fill={strokeColor} className="text-[9px] font-mono text-center" textAnchor="middle">Atomic Weight</text>

            <text x="40" y="20" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "cl" ? "Chlorine: Halogen gas with 17 protons & electrons" : "Periodic element catalog metrics"}
            </text>
          </svg>
        );

      case "normal-bell":
        return (
          <svg viewBox="0 0 400 300" className="w-full h-full max-h-[220px]">
            {/* Axes */}
            <line x1="40" y1="240" x2="360" y2="240" stroke={axisColor} strokeWidth="1.5" />

            {/* Mean center line */}
            <line x1="200" y1="50" x2="200" y2="240" stroke="#F59E0B" strokeWidth="2" strokeDasharray="3,3" />
            <text x="190" y="255" fill="#F59E0B" className="text-xs font-serif italic">μ</text>

            {/* Curves */}
            <path
              d="M 60 238 Q 130 235, 170 120 T 200 65 T 230 120 T 340 238"
              fill={hoveredPart === "bell" ? "rgba(99, 102, 241, 0.3)" : fillColor}
              stroke={activeStroke}
              strokeWidth="3"
              className="cursor-pointer transition-colors duration-200"
              onMouseEnter={() => setHoveredPart("bell")}
              onMouseLeave={() => setHoveredPart(null)}
            />

            {/* SD deviations limits */}
            <line x1="140" y1="170" x2="140" y2="240" stroke={strokeColor} strokeWidth="1" strokeDasharray="2,2" />
            <line x1="260" y1="170" x2="260" y2="240" stroke={strokeColor} strokeWidth="1" strokeDasharray="2,2" />

            <text x="135" y="255" fill={strokeColor} className="text-[10px] font-serif">-1σ</text>
            <text x="255" y="255" fill={strokeColor} className="text-[10px] font-serif">+1σ</text>

            {/* Shaded percentage labeling */}
            <text x="200" y="160" fill={activeStroke} className="text-[10px] font-mono font-bold text-center" textAnchor="middle">68.2%</text>

            <text x="40" y="30" fill={strokeColor} className="text-xs font-mono">
              {hoveredPart === "bell" ? "Gaussian curve symmetry represents normal entropy distribution" : "Statistical standard deviation distributions"}
            </text>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={`p-4 rounded-3xl border flex items-center justify-center overflow-hidden transition-all duration-300 ${
        isDark ? "bg-[#111827]/40 border-slate-800" : "bg-white border-slate-200 shadow-xs"
      }`}
    >
      {renderDiagram()}
    </div>
  );
}
