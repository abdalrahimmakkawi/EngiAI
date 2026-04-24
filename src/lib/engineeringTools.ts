// Engineering calculation and validation tools

export interface Quantity {
  value: number;
  unit: string;
}

// Unit conversion factors (base units: SI)
const CONVERSIONS: Record<string, Record<string, number | ((n: number) => number)>> = {
  // Length
  'm': { 'mm': 1000, 'cm': 100, 'km': 0.001, 'in': 39.3701, 'ft': 3.28084, 'yd': 1.09361 },
  'mm': { 'm': 0.001, 'cm': 0.1, 'km': 0.000001, 'in': 0.0393701, 'ft': 0.00328084 },
  'cm': { 'm': 0.01, 'mm': 10, 'km': 0.00001, 'in': 0.393701, 'ft': 0.0328084 },
  'km': { 'm': 1000, 'mm': 1000000, 'cm': 100000, 'in': 39370.1, 'ft': 3280.84 },
  'in': { 'm': 0.0254, 'mm': 25.4, 'cm': 2.54, 'km': 0.0000254, 'ft': 0.0833333 },
  'ft': { 'm': 0.3048, 'mm': 304.8, 'cm': 30.48, 'km': 0.0003048, 'in': 12 },
  
  // Force
  'N': { 'kN': 0.001, 'MN': 0.000001, 'lbf': 0.224809, 'kip': 0.000224809 },
  'kN': { 'N': 1000, 'MN': 0.001, 'lbf': 224.809, 'kip': 0.224809 },
  'MN': { 'N': 1000000, 'kN': 1000, 'lbf': 224809, 'kip': 224.809 },
  'lbf': { 'N': 4.44822, 'kN': 0.00444822, 'MN': 0.00000444822, 'kip': 0.001 },
  'kip': { 'N': 4448.22, 'kN': 4.44822, 'MN': 0.00444822, 'lbf': 1000 },
  
  // Pressure/Stress
  'Pa': { 'kPa': 0.001, 'MPa': 0.000001, 'GPa': 0.000000001, 'psi': 0.000145038, 'ksi': 0.000000145038 },
  'kPa': { 'Pa': 1000, 'MPa': 0.001, 'GPa': 0.000001, 'psi': 0.145038, 'ksi': 0.000145038 },
  'MPa': { 'Pa': 1000000, 'kPa': 1000, 'GPa': 0.001, 'psi': 145.038, 'ksi': 0.145038 },
  'GPa': { 'Pa': 1000000000, 'kPa': 1000000, 'MPa': 1000, 'psi': 145038, 'ksi': 145.038 },
  'psi': { 'Pa': 6894.76, 'kPa': 6.89476, 'MPa': 0.00689476, 'GPa': 0.00000689476, 'ksi': 0.001 },
  'ksi': { 'Pa': 6894760, 'kPa': 6894.76, 'MPa': 6.89476, 'GPa': 0.00689476, 'psi': 1000 },
  
  // Mass
  'kg': { 'g': 1000, 'mg': 1000000, 'lb': 2.20462, 'oz': 35.274, 'ton': 0.001 },
  'g': { 'kg': 0.001, 'mg': 1000, 'lb': 0.00220462, 'oz': 0.035274, 'ton': 0.000001 },
  'mg': { 'kg': 0.000001, 'g': 0.001, 'lb': 0.00000220462, 'oz': 0.000035274, 'ton': 0.000000001 },
  'lb': { 'kg': 0.453592, 'g': 453.592, 'mg': 453592, 'oz': 16, 'ton': 0.000453592 },
  'ton': { 'kg': 1000, 'g': 1000000, 'mg': 1000000000, 'lb': 2204.62, 'oz': 35274 },
  
  // Temperature (special case)
  'C': { 'K': (c: number) => c + 273.15, 'F': (c: number) => (c * 9/5) + 32 },
  'K': { 'C': (k: number) => k - 273.15, 'F': (k: number) => (k - 273.15) * 9/5 + 32 },
  'F': { 'C': (f: number) => (f - 32) * 5/9, 'K': (f: number) => (f - 32) * 5/9 + 273.15 },
};

// Parse quantity from string (e.g., "250 MPa", "10 kN")
export const parseQuantity = (s: string): Quantity => {
  const match = s.trim().match(/^(-?\d*\.?\d+)\s*([a-zA-Z°µ%]+)$/);
  if (!match) throw new Error(`Invalid quantity format: ${s}`);
  
  const value = parseFloat(match[1]);
  const unit = match[2];
  
  if (isNaN(value)) throw new Error(`Invalid number: ${match[1]}`);
  
  return { value, unit };
};

// Convert between units
export const convertUnit = (value: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) return value;
  
  // Handle temperature conversions separately
  if (['C', 'K', 'F'].includes(fromUnit) && ['C', 'K', 'F'].includes(toUnit)) {
    const converter = CONVERSIONS[fromUnit]?.[toUnit];
    if (typeof converter === 'function') return converter(value);
    throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
  }
  
  const conversion = CONVERSIONS[fromUnit]?.[toUnit];
  if (typeof conversion === 'number') return value * conversion;
  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
};

// Validate dimensional compatibility
export const validateDimensions = (result: Quantity, expected: Quantity): boolean => {
  try {
    const converted = convertUnit(result.value, result.unit, expected.unit);
    return Math.abs(converted - expected.value) < 0.001; // 0.1% tolerance
  } catch {
    return false;
  }
};

// Engineering sanity checks
export const checkEngineeringSanity = (q: Quantity): string => {
  const { value, unit } = q;
  
  // Temperature checks
  if (unit === 'C') {
    if (value < -273.15) return 'Temperature below absolute zero - impossible';
    if (value > 3000) return 'Temperature extremely high - check units';
  }
  if (unit === 'F') {
    if (value < -459.67) return 'Temperature below absolute zero - impossible';
    if (value > 5432) return 'Temperature extremely high - check units';
  }
  
  // Stress checks
  if (unit === 'MPa' || unit === 'psi' || unit === 'ksi' || unit === 'Pa' || unit === 'kPa' || unit === 'GPa') {
    const stressMPa = unit.includes('MPa') ? value : convertUnit(value, unit, 'MPa');
    if (stressMPa > 10000) return 'Stress extremely high - material would fail';
    if (stressMPa < 0) return 'Negative stress - check sign convention';
  }
  
  // Force checks
  if (unit === 'N' || unit === 'kN' || unit === 'lbf' || unit === 'kip' || unit === 'MN') {
    const forcekN = unit.includes('kN') ? value : convertUnit(value, unit, 'kN');
    if (forcekN > 100000) return 'Force extremely large - check magnitude';
    if (forcekN < 0) return 'Negative force - check direction';
  }
  
  // Length checks
  if (['m', 'mm', 'cm', 'km', 'in', 'ft'].includes(unit)) {
    const lengthm = unit === 'm' ? value : convertUnit(value, unit, 'm');
    if (lengthm > 10000) return 'Length very large - check units';
    if (lengthm < 0) return 'Negative length - impossible';
  }
  
  return 'OK';
};

// Evaluate mathematical formulas
export const evaluateFormula = (formula: string, vars: Record<string, number>): number => {
  try {
    // Simple formula evaluation - replace variables and evaluate
    let expr = formula;
    
    // Replace variables
    for (const [name, value] of Object.entries(vars)) {
      const regex = new RegExp(`\\b${name}\\b`, 'g');
      expr = expr.replace(regex, value.toString());
    }
    
    // Replace common math functions
    expr = expr.replace(/sqrt/g, 'Math.sqrt');
    expr = expr.replace(/pow/g, 'Math.pow');
    expr = expr.replace(/sin/g, 'Math.sin');
    expr = expr.replace(/cos/g, 'Math.cos');
    expr = expr.replace(/tan/g, 'Math.tan');
    expr = expr.replace(/log/g, 'Math.log');
    expr = expr.replace(/exp/g, 'Math.exp');
    expr = expr.replace(/pi/g, 'Math.PI');
    expr = expr.replace(/e/g, 'Math.E');
    
    // Evaluate the expression
    const result = Function('"use strict"; return (' + expr + ')')();
    
    if (typeof result !== 'number' || isNaN(result)) {
      throw new Error('Formula evaluation resulted in non-numeric value');
    }
    
    return result;
  } catch (error) {
    throw new Error(`Formula evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Extract quantities from text
export const extractQuantities = (text: string): Quantity[] => {
  const quantities: Quantity[] = [];
  const regex = /(-?\d*\.?\d+)\s*([a-zA-Z°µ%]+)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    try {
      const value = parseFloat(match[1]);
      const unit = match[2];
      
      if (!isNaN(value)) {
        quantities.push({ value, unit });
      }
    } catch {
      // Skip invalid matches
    }
  }
  
  return quantities;
};

// Safe wrapper functions with error handling
export const tryConvert = (value: number, fromUnit: string, toUnit: string): string => {
  try {
    const result = convertUnit(value, fromUnit, toUnit);
    return `${value} ${fromUnit} = ${result.toFixed(6)} ${toUnit}`;
  } catch (error) {
    return `Conversion error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const tryParse = (s: string): string => {
  try {
    const result = parseQuantity(s);
    return `Parsed: ${result.value} ${result.unit}`;
  } catch (error) {
    return `Parse error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const tryValidate = (result: Quantity, expected: Quantity): string => {
  try {
    const isValid = validateDimensions(result, expected);
    const converted = convertUnit(result.value, result.unit, expected.unit);
    const diff = Math.abs(converted - expected.value);
    const percentError = (diff / Math.abs(expected.value)) * 100;
    
    return isValid ? 
      `✓ Valid: ${result.value} ${result.unit} ≈ ${converted.toFixed(4)} ${expected.unit} (${percentError.toFixed(2)}% error)` :
      `✗ Invalid: ${result.value} ${result.unit} ≠ ${expected.value} ${expected.unit}`;
  } catch (error) {
    return `Validation error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const trySanity = (q: Quantity): string => {
  try {
    const result = checkEngineeringSanity(q);
    return result === 'OK' ? `✓ ${q.value} ${q.unit} appears reasonable` : `⚠ ${result}`;
  } catch (error) {
    return `Sanity check error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const tryEval = (formula: string, vars: Record<string, number>): string => {
  try {
    const result = evaluateFormula(formula, vars);
    return `${formula} = ${result.toFixed(6)}`;
  } catch (error) {
    return `Evaluation error: ${error instanceof Error ? error.message : String(error)}`;
  }
};

export const showAllQuantities = (text: string): string => {
  try {
    const quantities = extractQuantities(text);
    if (quantities.length === 0) return 'No quantities found';
    
    return `Found ${quantities.length} quantities:\n` + 
      quantities.map((q, i) => `${i + 1}. ${q.value} ${q.unit}`).join('\n');
  } catch (error) {
    return `Extraction error: ${error instanceof Error ? error.message : String(error)}`;
  }
};
