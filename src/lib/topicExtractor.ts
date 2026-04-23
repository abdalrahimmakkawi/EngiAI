export const extractTopics = (message: string): string[] => {
  const topicKeywords: Record<string, string[]> = {
    circuits: [
      "circuit", "resistor", "capacitor", "inductor", "voltage", "current", "ohm",
      "kirchhoff", "nodal", "mesh", "thevenin", "norton", "superposition",
      "ac analysis", "transient", "op-amp", "operational amplifier",
      "breadboard", "pcb", "netlist", "short circuit", "open circuit",
    ],
    thermodynamics: [
      "heat", "entropy", "thermodynamic", "temperature", "pressure", "volume",
      "first law", "second law", "carnot", "rankine", "refrigeration",
      "heat engine", "cycle", "efficiency", "adiabatic", "isothermal",
    ],
    mechanics: [
      "force", "torque", "stress", "strain", "beam", "deflection", "bending",
      "shear", "moment", "moment of inertia", "centroid", "axis",
      "Hooke's law", "yield strength", "ultimate strength", "buckling",
      "brittle", "ductile", "poisson's ratio", "elasticity", "plasticity",
    ],
    "control systems": [
      "pid", "controller", "feedback", "transfer function", "bode", "nyquist",
      "root locus", "stability", "gain", "phase margin", "unity feedback",
      "closed loop", "open loop", "step response", "ramp", "pole", "zero",
      "laplace", "z-transform", "state space", "controllability", "observability",
    ],
    signals: [
      "fourier", "signal", "frequency", "filter", "laplace", "z-transform",
      "convolution", "sampling", "aliasing", "dft", "fft", "spectrogram",
      "low pass", "high pass", "band pass", "notch", "amplitude modulation",
    ],
    "fluid mechanics": [
      "bernoulli", "flow", "fluid", "viscosity", "pressure drop", "reynolds",
      "venturi", "orifice", "pipe flow", "head loss", "major loss", "minor loss",
      "boundary layer", "drag", "lift", "navier-stokes", "continuity equation",
    ],
    avionics: [
      "navigation", "pbn", "gnss", "ils", "autopilot", "flight", "avionics",
      "flight plan", "rnav", "rnp", "waypoint", "holding pattern", "approach",
      "instrument landing", "glide slope", "localizer", "vor", "dme", "adh",
    ],
    "power systems": [
      "power", "three-phase", "y-connected", "delta-connected", "balanced load",
      "transformer", "per-unit", "fault analysis", "symmetrical components",
      "grid", "transmission", "distribution", "power factor",
      "real power", "reactive power", "apparent power", "neutral", "ground",
    ],
    "electromagnetics": [
      "magnetic", "electric field", "maxwell", "induction", "faraday",
      "gauss", "ampere", "electromagnetic wave", "antenna",
      "radiation", "propagation", "waveguide", "coaxial", "impedance",
    ],
    "materials science": [
      "material", "alloy", "steel", "aluminum", "composite", "ceramic",
      "polymer", "crystal", "microstructure", "phase diagram", "heat treatment",
      "annealing", "quenching", "tempering", "hardness", "tensile",
    ],
    "chemical engineering": [
      "reaction", "catalyst", "reactor", "mass transfer", "heat transfer",
      "distillation", "absorption", "extraction", "crystallization", "filtration",
      "fluidized bed", "packed bed", "kinetics", "equilibrium", "stoichiometry",
    ],
    "software engineering": [
      "algorithm", "complexity", "data structure", "recursion", "sorting",
      "searching", "tree", "graph", "hash", "dynamic programming",
      "greedy", "divide and conquer", "backtracking", "big o", "space complexity",
    ],
    mathematics: [
      "integral", "derivative", "matrix", "differential equation", "calculus",
      "linear algebra", "probability", "statistics", "vector", "tensor",
      "eigenvalue", "eigenvector", "laplace transform", "fourier series", "taylor",
    ],
    "computer engineering": [
      "binary", "hexadecimal", "logic gate", "flip-flop", "register", "counter",
      "multiplexer", "demultiplexer", "encoder", "decoder", "adder", "subtractor",
      "microprocessor", "memory", "cache", "bus", "interrupt",
    ],
  };

  const lower = message.toLowerCase();
  const found: string[] = [];

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(k => lower.includes(k))) {
      found.push(topic);
    }
  }

  return found.length > 0 ? found : ["general engineering"];
};
