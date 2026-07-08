import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const targetList = readFileSync("docs/sales/trim-proof-pilot-target-list-2026-06-15.md", "utf8");
const playbook = readFileSync("docs/sales/trim-proof-pilot-outreach-playbook.md", "utf8");

describe("pilot target list artifact", () => {
  it("records a sourced starter batch without implying outreach or pilot wins", () => {
    expect(targetList).toContain("# Trim Proof Pilot Target List - 2026-06-15");
    expect(targetList).toContain("No outreach sent yet");
    expect(targetList).toContain("Do not count any row below as a recruited pilot");
    expect(targetList).toContain("https://www.quickprintflorida.com/");
    expect(targetList).toContain("https://www.e-arc.com/location/tampa/");
    expect(targetList).toContain("https://zipmailingflorida.com/");
    expect(targetList).toContain("https://datztampa.com/stpete/contact/");
    expect(targetList).toContain("needs_follow_up");
    expect(targetList).not.toContain("accepted the pilot terms");
    expect(targetList).not.toContain("agreed to test a real supported job");
  });

  it("keeps the batch mix aligned with the Week 2 sourcing playbook", () => {
    const targetRows = targetList.split("\n").filter((line) => line.endsWith("| needs_follow_up |"));
    const printShopRows = targetRows.filter((line) => line.includes("| print_shop |"));
    const designerRows = targetRows.filter((line) => line.includes("| designer |"));
    const marketingRows = targetRows.filter((line) => line.includes("| marketing_team |"));

    expect(printShopRows).toHaveLength(10);
    expect(designerRows).toHaveLength(6);
    expect(marketingRows).toHaveLength(9);
    expect(targetRows).toHaveLength(25);
    expect(targetList).toContain("Twenty-five-account target-list gap: 0 accounts.");
    expect(targetList).toContain("Live Supabase signups currently look like smoke, test, or internal records");
    expect(playbook).toContain("Recruit ten qualified pilot participants from a twenty-five-account target list.");
    expect(playbook).toContain("do not count them; backfill with public-source targets");
  });
});
