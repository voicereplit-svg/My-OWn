import { TestConfig } from "./types";

export const ILLUSTRATED_STEM_CHALLENGE: TestConfig = {
  id: "test_visual_stem_olympiad_12",
  name: "National Olympiad: Illustrated STEM Challenge",
  class: "College Prep / Olympiad",
  subject: "General STEM",
  topics: "Cell Biology, Inclined Vectors, Organic Chemistry, Tangent Euclidean Geometry, Riemann Integrals, Ray Optics, Series Circuits, Cardio Anatomy, Keplerian Gravitation, Helix genetics, Periodic Atoms, Gaussian Statistics",
  rollNumber: "99000",
  difficulty: "Hard",
  duration: 30, // 30 minutes
  numMcqs: 12,
  pin: "43214321", // special supervisor pin
  sourceType: "topic",
  createdAt: "2026-05-24T00:00:00.000Z",
  questions: [
    {
      question: "Based on the cell biology diagram, identify the organelle responsible for storing genetic DNA blueprints and regulating cellular metabolism.",
      options: ["Chloroplast", "Nucleus", "Vacuole", "Mitochondrion"],
      correctIndex: 1,
      explanation: "The nucleus coordinates primary cell functions and houses the chromosomes. In our diagram, it's represented as the circular organelle containing the nucleolus.",
      diagramKey: "plant-cell"
    } as any,
    {
      question: "An object rests on a 30° inclined plane. If the weight of the block is Fg = mg, which gravitational force vector drags the block parallel to the slope down the inclined surface?",
      options: ["mg cos(θ)", "mg sin(θ)", "μ mg cos(θ)", "mg tan(θ)"],
      correctIndex: 1,
      explanation: "The gravitational force parallel to the incline is mg sin(θ), causing downhill acceleration. The normal force is balanced by mg cos(θ).",
      diagramKey: "inclined-plane"
    } as any,
    {
      question: "The structure shown depicts a Benzene ring. What type of molecular hybridization do the carbon atoms occupy inside this planar ring to sustain Aromaticity?",
      options: ["sp", "sp2", "sp3", "dsp3"],
      correctIndex: 1,
      explanation: "Each carbon in the Benzene hexamer ring is sp2 hybridized, producing 120° bond angles and allowing overlapping unhybridized p-orbitals to form the delocalized pi electron ring.",
      diagramKey: "benzene-ring"
    } as any,
    {
      question: "In Euclidean geometry, a radial line is drawn from the circle center O to the contact point P of a tangent line. What is the exact angle formed between the radius OP and the tangent line?",
      options: ["45 degrees", "60 degrees", "90 degrees (Perpendicular)", "180 degrees"],
      correctIndex: 2,
      explanation: "The Tangent Theorem establishes that a tangent line is perpendicular (90 degrees) to the circle's radius drawn to the exact point of tangency (P).",
      diagramKey: "geometry-tangent"
    } as any,
    {
      question: "The shaded region under the continuous curve between vertical boundaries a and b is algebraically computed using which mathematical concept?",
      options: ["The Derivative: f'(x)", "The Definite Riemann Integral", "The Divergence Limit", "The Taylor Series Expansion"],
      correctIndex: 1,
      explanation: "The Definite Riemann Integral measures the exact accumulated area bounded under a continuous curve, the x-axis, and vertical boundary lines [a, b].",
      diagramKey: "calculus-integral"
    } as any,
    {
      question: "When incoming light rays parallel to the optical axis pass through a bi-convex lens, where do the refracted rays converge to focus?",
      options: ["At the optical center", "At the primary Focal Point (F)", "At infinity", "Inside the lens material"],
      correctIndex: 1,
      explanation: "A bi-convex lens refracts parallel incoming rays to a common focal point (F) on the opposite side of the lens, forming real focal points.",
      diagramKey: "optics-retraction"
    } as any,
    {
      question: "In the series DC circuit diagram shown with a 12V supply, if Resistor R1 = 4 Ω and R2 = 8 Ω, what is the total equivalent resistance of this electrical path?",
      options: ["2.67 Ω", "4 Ω", "8 Ω", "12 Ω"],
      correctIndex: 3,
      explanation: "According to Kirchhoff's laws for series circuit elements, total equivalent resistance is the simple sum: Req = R1 + R2 = 4 + 8 = 12 Ω.",
      diagramKey: "circuit-resistors"
    } as any,
    {
      question: "In the cardiovascular circulation blueprint, which muscular chamber receives freshly oxygenated blood returned from the lungs via the pulmonary veins?",
      options: ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle"],
      correctIndex: 2,
      explanation: "Oxygen-rich blood returning from the lungs enters the Left Atrium first, which then contracts to pass blood to the Left Ventricle for aortic dispersal.",
      diagramKey: "heart-anatomy"
    } as any,
    {
      question: "Kepler's Second Law describes equal orbital areas swept out in equal times. At which position does the planet orbit its star with gravitational velocity and kinetic energy at its maximum?",
      options: ["At aphelion (farthest from Sun)", "At perihelion (closest to Sun)", "The planet's velocity remains constant", "Only during planetary eclipse overlaps"],
      correctIndex: 1,
      explanation: "Since gravitational acceleration is strongest at the closest approach (the perihelion), positional potential energy is minimum and kinetic velocity is maximum.",
      diagramKey: "orbit-gravitation"
    } as any,
    {
      question: "The double helix structural rungs of DNA coordinate genetic information. Which specific nucleobase molecule is the complimentary binding partner to Adenine (A)?",
      options: ["Guanine (G)", "Thymine (T)", "Cytosine (C)", "Uracil (U)"],
      correctIndex: 1,
      explanation: "DNA base-pairing rules dictate that Adenine (A) always bonds with Thymine (T) via 2 hydrogen bonds, while Guanine (G) pairs with Cytosine (C).",
      diagramKey: "dna-helix"
    } as any,
    {
      question: "Based on the Periodic Table segment for Chlorine (Cl), how many valence electrons reside in the outermost active shell of a neutral Chlorine atom?",
      options: ["2 valence electrons", "7 valence electrons", "8 valence electrons", "17 valence electrons"],
      correctIndex: 1,
      explanation: "Chlorine's atomic number is 17 (holding 17 protons & electrons). Its electron shell layout is 2, 8, and 7. Thus, it holds 7 valence electrons in its Group 17 outer shell.",
      diagramKey: "periodic-element"
    } as any,
    {
      question: "In a standard symmetric Gaussian normal distribution bell curve, approximately what percentage of all values lie accumulated within ±1 standard deviation (σ) from the central mean (μ)?",
      options: ["50.0%", "68.2%", "95.4%", "99.7%"],
      correctIndex: 1,
      explanation: "The Empirical Rule dictates that approximately 68.27% of all data points under a normal bell curve fall within ±1 standard deviation (σ) of the mean (μ).",
      diagramKey: "normal-bell"
    } as any
  ]
};
