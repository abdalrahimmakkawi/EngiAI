import React, { useMemo, useEffect, useState } from 'react';
import katex from 'katex';
import { motion } from 'motion/react';

interface Formula {
  latex: string;
  name: string;
  discipline: string;
  description: string;
}

const FORMULAS: Formula[] = [
  {
    latex: "\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}",
    name: "Gauss's Law",
    discipline: "Electromagnetism",
    description: "Describes how electric charges produce electric fields."
  },
  {
    latex: "\\nabla \\cdot \\mathbf{B} = 0",
    name: "Gauss's Law for Magnetism",
    discipline: "Electromagnetism",
    description: "States that there are no magnetic monopoles."
  },
  {
    latex: "\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}",
    name: "Faraday's Law of Induction",
    discipline: "Electromagnetism",
    description: "Relates electric field to changing magnetic field."
  },
  {
    latex: "\\nabla \\times \\mathbf{B} = \\mu_0\\left(\\mathbf{J} + \\varepsilon_0\\frac{\\partial \\mathbf{E}}{\\partial t}\\right)",
    name: "Ampère's Law",
    discipline: "Electromagnetism",
    description: "Relates magnetic fields to electric currents and changing E-fields."
  },
  {
    latex: "G_{\\mu\\nu} + \\Lambda g_{\\mu\\nu} = \\frac{8\\pi G}{c^4} T_{\\mu\\nu}",
    name: "Einstein Field Equations",
    discipline: "General Relativity",
    description: "Relates to geometry of spacetime to distribution of matter."
  },
  {
    latex: "i\\hbar\\frac{\\partial}{\\partial t}\\Psi(\\mathbf{r},t) = \\hat{H}\\Psi(\\mathbf{r},t)",
    name: "Schrödinger Equation",
    discipline: "Quantum Mechanics",
    description: "Governs wave function of a quantum-mechanical system."
  },
  {
    latex: "PV = nRT",
    name: "Ideal Gas Law",
    discipline: "Thermodynamics",
    description: "Equation of state of a hypothetical ideal gas."
  },
  {
    latex: "\\sigma = E\\varepsilon",
    name: "Hooke's Law",
    discipline: "Solid Mechanics",
    description: "Relationship between stress and strain in elastic materials."
  },
  {
    latex: "\\mathbf{F} = m\\mathbf{a}",
    name: "Newton's Second Law",
    discipline: "Classical Mechanics",
    description: "Fundamental law relating force, mass, and acceleration."
  },
  {
    latex: "e^{i\\pi} + 1 = 0",
    name: "Euler's Identity",
    discipline: "Mathematics",
    description: "The most beautiful equation connecting five fundamental constants."
  },
  {
    latex: "Q = mc\\Delta T",
    name: "Specific Heat Formula",
    discipline: "Thermodynamics",
    description: "Calculates the heat required to change temperature."
  },
  {
    latex: "V = IR",
    name: "Ohm's Law",
    discipline: "Electrical Engineering",
    description: "Relationship between voltage, current, and resistance."
  },
  {
    latex: "P + \\frac{1}{2}\\rho v^2 + \\rho g h = \\text{constant}",
    name: "Bernoulli's Equation",
    discipline: "Fluid Mechanics",
    description: "Conservation of energy in steady fluid flow."
  },
  {
    latex: "\\tau = \\mathbf{r} \\times \\mathbf{F}",
    name: "Torque Equation",
    discipline: "Statics & Dynamics",
    description: "The rotational equivalent of linear force."
  },
  {
    latex: "E = mc^2",
    name: "Mass-Energy Equivalence",
    discipline: "Relativity",
    description: "States that mass and energy are interchangeable."
  }
];

export const FormulaOfTheDay: React.FC = () => {
  const [formula, setFormula] = useState<Formula | null>(null);

  useEffect(() => {
    // Determine formula based on current day's timestamp (UTC)
    const dayOfYear = Math.floor((new Date().setHours(0, 0, 0, 0)) / 8.64e7);
    const index = dayOfYear % FORMULAS.length;
    setFormula(FORMULAS[index]);
  }, []);

  const renderedFormula = useMemo(() => {
    if (!formula) return null;
    try {
      // Renders the LaTeX string to HTML using KaTeX
      return katex.renderToString(formula.latex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      return formula.latex;
    }
  }, [formula]);

  if (!formula) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#00d4ff]/2 border border-[#00d4ff]/10 rounded-2xl p-5 shadow-inner"
    >
      <h3 className="text-[10px] font-bold text-[#00d4ff] mb-3 uppercase tracking-widest flex items-center justify-between">
        <span>Formula of the Day</span>
        <span className="text-[8px] opacity-60 font-mono italic">{formula.discipline}</span>
      </h3>
      
      {/* KaTeX Math Viewport */}
      <div 
        className="math-font text-base text-center py-4 bg-black/20 rounded-xl border border-white/5 mb-2 overflow-x-auto"
        dangerouslySetInnerHTML={{ __html: renderedFormula || '' }}
      />
      
      <div className="text-center space-y-1">
        <p className="text-[11px] text-white font-bold tracking-tight">
          {formula.name}
        </p>
        <p className="text-[9px] text-[#64748b] font-medium italic leading-tight">
          {formula.description}
        </p>
      </div>
    </motion.div>
  );
};
