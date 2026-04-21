import React, { useState, useEffect } from 'react';

const FORMULAS = [
  {
    name: "Faraday's Law of Induction",
    formula: "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}",
    description: "Relates electric field to changing magnetic field"
  },
  {
    name: "Euler-Bernoulli Equation",
    formula: "P + \\frac{1}{2}\\rho v^2 + \\rho g h = \\text{constant}",
    description: "Fluid dynamics fundamental equation"
  },
  {
    name: "Maxwell's Equations",
    formula: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\epsilon_0}",
    description: "Gauss's law for electricity"
  },
  {
    name: "Newton's Second Law",
    formula: "\\mathbf{F} = m\\mathbf{a}",
    description: "Fundamental law of motion"
  },
  {
    name: "Ohm's Law",
    formula: "V = IR",
    description: "Relationship between voltage, current, and resistance"
  },
  {
    name: "Hooke's Law",
    formula: "F = -kx",
    description: "Elastic deformation relationship"
  },
  {
    name: "Ideal Gas Law",
    formula: "PV = nRT",
    description: "Relationship between pressure, volume, and temperature"
  },
  {
    name: "Snell's Law",
    formula: "n_1 \\sin(\\theta_1) = n_2 \\sin(\\theta_2)",
    description: "Refraction of light at interface"
  },
  {
    name: "Kirchhoff's Voltage Law",
    formula: "\\sum V = 0",
    description: "Conservation of energy in circuits"
  },
  {
    name: "Bernoulli's Equation",
    formula: "P + \\frac{1}{2}\\rho v^2 + \\rho g h = \\text{constant}",
    description: "Energy conservation in fluid flow"
  }
];

export const FormulaOfTheDay: React.FC = () => {
  const [formula, setFormula] = useState(FORMULAS[0]);

  useEffect(() => {
    // Calculates a stable index based on the day of year
    const dayOfYear = Math.floor((new Date().setHours(0, 0, 0, 0)) / 8.64e7);
    const index = dayOfYear % FORMULAS.length;
    setFormula(FORMULAS[index]);
  }, []);

  return (
    <div className="bg-[#00d4ff]/2 border border-[#00d4ff]/10 rounded-2xl p-5 shadow-inner">
      <h3 className="text-[10px] font-bold text-[#00d4ff] mb-3 uppercase tracking-widest">
        Formula of the Day
      </h3>
      <div className="math-font text-base text-center py-4 bg-black/20 rounded-xl border border-white/5 mb-2">
        {"$$ " + formula.formula + " $$"}
      </div>
      <p className="text-[11px] text-center text-[#64748b] font-medium">
        {formula.name}
      </p>
      <p className="text-[10px] text-center text-[#64748b] mt-1 italic">
        {formula.description}
      </p>
    </div>
  );
};
