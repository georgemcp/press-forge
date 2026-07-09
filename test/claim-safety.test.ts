import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const textExtensions = new Set([".md", ".ts", ".tsx"]);

const scanTargets = [
  "src/app",
  "src/components",
  "src/lib/seo",
  "docs/sales",
  ".agents/product-marketing-context.md",
  "docs/business/trim-proof-business-blueprint.md"
];

const unsupportedClaimRules: Array<{ label: string; pattern: RegExp }> = [
  { label: "printer-approved claim", pattern: /\bprinter[-\s]?approved\b/i },
  { label: "printer acceptance claim", pattern: /\baccepted by printers\b/i },
  { label: "universal printer acceptance claim", pattern: /\baccepted by every printer\b/i },
  { label: "guaranteed printer acceptance claim", pattern: /\bguaranteed printer acceptance\b/i },
  { label: "percentage time-saved claim", pattern: /\b(?:cut|cuts|save|saves|saved)\s+(?:prep|prepress|file[-\s]?prep|production)?\s*time\s+by\s+\d+%/i },
  { label: "generic percentage savings claim", pattern: /\bsave[sd]?\s+\d+%/i },
  { label: "speed multiplier claim", pattern: /\b\d+x\s+faster\b/i },
  { label: "customer count claim", pattern: /\b(?:trusted|used|loved)\s+by\s+\d/i },
  { label: "logo count claim", pattern: /\b\d+\+?\s+(?:customers|shops|printers|designers|teams)\b/i },
  { label: "replacement claim", pattern: /\breplaces?\s+(?:Canva|Adobe|Acrobat|PitStop|RIP)\b/i },
  { label: "universal PDF repair claim", pattern: /\bfix(?:es)?\s+any\s+pdf\b/i },
  { label: "Canva repair claim", pattern: /\brepairs?\s+(?:every|any)\s+canva\s+export\b/i },
  { label: "universal product support claim", pattern: /\bworks\s+for\s+every\s+print\s+product\b/i },
  { label: "certification claim", pattern: /\bcertified\s+pdf\/x\b/i }
];

const boundaryContextPattern =
  /\b(?:anti-icp|anti-persona|boundar(?:y|ies)|bounded claims?|does not|do not|not |no\.|without|avoid|words to avoid|should not|neither|cannot|is not|question|objection)\b/i;

function collectFiles(target: string): string[] {
  const stat = statSync(target);
  if (stat.isFile()) {
    return textExtensions.has(path.extname(target)) ? [target] : [];
  }

  return readdirSync(target).flatMap((entry) => {
    const next = path.join(target, entry);
    const nextStat = statSync(next);
    if (nextStat.isDirectory()) {
      return collectFiles(next);
    }
    return textExtensions.has(path.extname(next)) ? [next] : [];
  });
}

describe("launch claim safety", () => {
  const scannedFiles = scanTargets.flatMap(collectFiles).sort();

  it("keeps unsupported outcome claims out of public and sales copy", () => {
    const violations = scannedFiles.flatMap((file) => {
      const source = readFileSync(file, "utf8");
      return unsupportedClaimRules.flatMap((rule) => {
        const flags = rule.pattern.flags.includes("g") ? rule.pattern.flags : `${rule.pattern.flags}g`;
        const globalPattern = new RegExp(rule.pattern.source, flags);
        const matches = [...source.matchAll(globalPattern)];

        return matches.flatMap((match) => {
          const index = match.index ?? 0;
          const context = source.slice(Math.max(0, index - 140), index + match[0].length + 140);
          return boundaryContextPattern.test(context) ? [] : [`${file}: ${rule.label}`];
        });
      });
    });

    expect(violations).toEqual([]);
  });

  it("keeps the evidence register actionable before launch copy ships", () => {
    const register = readFileSync("docs/business/claim-evidence-register.md", "utf8");

    expect(register).toContain("Status key:");
    expect(register).toContain("Source of truth");
    expect(register).toContain("Validation step");
    expect(register).toContain("Safe replacement");
    expect(register).toContain("Pilot Evidence Intake Template");
    expect(register).toContain("npm run test -- test/claim-safety.test.ts");
  });
});
