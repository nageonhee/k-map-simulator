
export type CellValue = 0 | 1 | 'X';

export interface KMapGroup {
  cells: number[]; // Indices of cells in the group
  expression: string;
  color: string;
}

export const GRAY_CODE_2 = [0, 1, 3, 2];
export const GRAY_CODE_1 = [0, 1];
export const GRAY_CODE_3 = [0, 1, 3, 2, 6, 7, 5, 4];

export function getGrayCode(bits: number): number[] {
  if (bits === 1) return GRAY_CODE_1;
  if (bits === 2) return GRAY_CODE_2;
  if (bits === 3) return GRAY_CODE_3;
  return [];
}

/**
 * Converts a flat index to binary representation based on variable count.
 */
export function indexToBinary(index: number, varCount: number): string {
  return index.toString(2).padStart(varCount, '0');
}

/**
 * Simplified Quine-McCluskey to find Prime Implicants with Don't Care support
 */
export function findPrimeImplicants(data: CellValue[], varCount: number, targetValue: CellValue): KMapGroup[] {
  const terms: Set<string>[] = Array.from({ length: varCount + 1 }, () => new Set());
  
  // Step 1: Initialize with minterms/maxterms AND don't cares
  for (let i = 0; i < data.length; i++) {
    // For SOP, target is 1. We include 1s and Xs.
    // For POS, target is 0. We include 0s and Xs.
    if (data[i] === targetValue || data[i] === 'X') {
      const binary = indexToBinary(i, varCount);
      terms[0].add(binary);
    }
  }

  const allPrimeImplicants = new Set<string>();
  let currentTerms = terms[0];
  
  for (let i = 0; i < varCount; i++) {
    const nextTerms = new Set<string>();
    const usedInThisStep = new Set<string>();

    const termList = Array.from(currentTerms);
    for (let j = 0; j < termList.length; j++) {
      for (let k = j + 1; k < termList.length; k++) {
        const t1 = termList[j];
        const t2 = termList[k];
        
        let diffCount = 0;
        let diffIdx = -1;
        for (let m = 0; m < varCount; m++) {
          if (t1[m] !== t2[m]) {
            diffCount++;
            diffIdx = m;
          }
        }

        if (diffCount === 1) {
          const combined = t1.substring(0, diffIdx) + '-' + t1.substring(diffIdx + 1);
          nextTerms.add(combined);
          usedInThisStep.add(t1);
          usedInThisStep.add(t2);
        }
      }
    }

    // Terms that couldn't be combined are prime implicants
    for (const term of termList) {
      if (!usedInThisStep.has(term)) {
        allPrimeImplicants.add(term);
      }
    }

    if (nextTerms.size === 0) break;
    currentTerms = nextTerms;
  }

  // Add final level terms
  for (const term of currentTerms) {
    allPrimeImplicants.add(term);
  }

  // Step 2: Minimal Cover Selection (Simplified Petrick's Method/Greedy)
  const piList = Array.from(allPrimeImplicants).map(pi => {
    const coveredCells: number[] = [];
    const coveredTargetCells: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const binary = indexToBinary(i, varCount);
      let match = true;
      for (let m = 0; m < varCount; m++) {
        if (pi[m] !== '-' && pi[m] !== binary[m]) {
          match = false;
          break;
        }
      }
      if (match) {
        coveredCells.push(i);
        if (data[i] === targetValue) coveredTargetCells.push(i);
      }
    }
    return { pi, coveredCells, coveredTargetCells };
  }).filter(p => p.coveredTargetCells.length > 0);

  // Find all target cells that need to be covered
  const targetCells = data.map((v, i) => v === targetValue ? i : -1).filter(i => i !== -1);
  const selectedPIs: string[] = [];
  let remainingTargetCells = new Set(targetCells);

  // 1. Identify Essential Prime Implicants
  const cellCoverage = new Map<number, string[]>();
  targetCells.forEach(cell => {
    const coveringPIs = piList.filter(p => p.coveredTargetCells.includes(cell)).map(p => p.pi);
    cellCoverage.set(cell, coveringPIs);
  });

  const epis = new Set<string>();
  cellCoverage.forEach((pis, cell) => {
    if (pis.length === 1) {
      epis.add(pis[0]);
    }
  });

  epis.forEach(pi => {
    selectedPIs.push(pi);
    const pInfo = piList.find(p => p.pi === pi)!;
    pInfo.coveredTargetCells.forEach(c => remainingTargetCells.delete(c));
  });

  // 2. Greedy selection for the rest
  while (remainingTargetCells.size > 0) {
    let bestPI = "";
    let maxCovered = -1;

    piList.forEach(p => {
      const coverCount = p.coveredTargetCells.filter(c => remainingTargetCells.has(c)).length;
      if (coverCount > maxCovered) {
        maxCovered = coverCount;
        bestPI = p.pi;
      }
    });

    if (bestPI) {
      selectedPIs.push(bestPI);
      const pInfo = piList.find(p => p.pi === bestPI)!;
      pInfo.coveredTargetCells.forEach(c => remainingTargetCells.delete(c));
    } else {
      break;
    }
  }

  // Convert selected prime implicants to KMapGroup
  const groups: KMapGroup[] = selectedPIs.map((pi, idx) => {
    const pInfo = piList.find(p => p.pi === pi)!;
    return {
      cells: pInfo.coveredCells,
      expression: piToExpression(pi, varCount, targetValue === 1),
      color: GROUP_COLORS[idx % GROUP_COLORS.length]
    };
  });

  return groups;
}

function piToExpression(pi: string, varCount: number, isSOP: boolean): string {
  const vars = ['A', 'B', 'C', 'D', 'E'].slice(0, varCount);
  let terms: string[] = [];

  // Iterate in A, B, C, D, E order strictly
  for (let i = 0; i < varCount; i++) {
    if (pi[i] === '-') continue;
    
    const bit = pi[i] === '1';
    if (isSOP) {
      terms.push(bit ? vars[i] : vars[i] + "'");
    } else {
      terms.push(bit ? vars[i] + "'" : vars[i]);
    }
  }

  if (terms.length === 0) return isSOP ? "1" : "0";
  
  if (isSOP) {
    return terms.join("");
  } else {
    return `(${terms.join(" + ")})`;
  }
}

export function simplifyExpression(groups: KMapGroup[], isSOP: boolean): string {
  if (groups.length === 0) return isSOP ? "0" : "1";
  
  const expressions = groups.map(g => g.expression);
  // Remove duplicates and sort for consistent ABCD/Lexicographical output
  const uniqueExpr = Array.from(new Set(expressions)).sort();
  
  if (isSOP) {
    if (uniqueExpr.includes("1")) return "1";
    return uniqueExpr.join(" + ");
  } else {
    if (uniqueExpr.includes("0")) return "0";
    return uniqueExpr.join("");
  }
}

// Colors for groups
export const GROUP_COLORS = [
  "rgba(239, 68, 68, 0.4)",   // Red
  "rgba(59, 130, 246, 0.4)",  // Blue
  "rgba(16, 185, 129, 0.4)",  // Green
  "rgba(245, 158, 11, 0.4)",  // Amber
  "rgba(139, 92, 246, 0.4)",  // Purple
  "rgba(236, 72, 153, 0.4)",  // Pink
  "rgba(20, 184, 166, 0.4)",  // Teal
  "rgba(249, 115, 22, 0.4)",  // Orange
];
