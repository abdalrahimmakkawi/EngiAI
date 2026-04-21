export const extractTopics = (message: string): string[] => {
  const topicKeywords: Record<string, string[]> = {
    "circuits": ["circuit", "resistor", "capacitor", "voltage", "current", "ohm"],
    "thermodynamics": ["heat", "entropy", "thermodynamic", "temperature", "pressure"],
    "mechanics": ["force", "torque", "stress", "strain", "beam", "deflection"],
    "control systems": ["pid", "controller", "feedback", "transfer function", "bode"],
    "signals": ["fourier", "signal", "frequency", "filter", "laplace"],
    "fluid mechanics": ["bernoulli", "flow", "fluid", "viscosity", "pressure drop"],
    "avionics": ["navigation", "pbn", "gnss", "ils", "autopilot", "flight"],
    "software engineering": ["algorithm", "complexity", "data structure", "recursion"],
    "mathematics": ["integral", "derivative", "matrix", "differential equation"],
    "electromagnetics": ["magnetic", "electric field", "maxwell", "induction"],
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
