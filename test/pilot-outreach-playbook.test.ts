import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const playbook = readFileSync("docs/sales/trim-proof-pilot-outreach-playbook.md", "utf8");

describe("pilot outreach playbook", () => {
  it("turns Week 2 recruiting into a concrete founder-led operating system", () => {
    expect(playbook).toContain("Recruit ten qualified pilot participants from a twenty-five-account target list.");
    expect(playbook).toContain("Target List Design");
    expect(playbook).toContain("Daily Operating Cadence");
    expect(playbook).toContain("Message Matrix");
    expect(playbook).toContain("Community Posts");
    expect(playbook).toContain("Follow-Up Schedule");
    expect(playbook).toContain("Success Criteria");
  });

  it("keeps the target list tied to real segments and supported print jobs", () => {
    expect(playbook).toContain("Local print shops");
    expect(playbook).toContain("Freelance designers");
    expect(playbook).toContain("In-house/local marketers");
    expect(playbook).toContain("Existing launch-list leads");
    expect(playbook).toContain("flyer, poster, menu, brochure, business card, postcard, or letterhead");
  });

  it("maps outreach work back to the admin pilot pipeline fields", () => {
    for (const field of [
      "`email`",
      "`source`",
      "`segment`",
      "`useCase`",
      "`companyName`",
      "`role`",
      "`monthlyPrintJobs`",
      "`planInterest`",
      "`followUpStatus`",
      "`lastSignalAt`",
      "`lastContactAt`"
    ]) {
      expect(playbook).toContain(field);
    }
  });

  it("requires evidence before public proof claims", () => {
    expect(playbook).toContain("docs/business/claim-evidence-register.md");
    expect(playbook).toContain("Never publish:");
    expect(playbook).toContain("Customer names, logos, or quotes without permission.");
    expect(playbook).toContain("Time-saved metrics without measured before/after data.");
    expect(playbook).toContain("Guarantees of printer acceptance.");
  });

  it("does not invent public proof or overclaim pilot outcomes", () => {
    expect(playbook).not.toMatch(/trusted by/i);
    expect(playbook).not.toMatch(/accepted by printers/i);
    expect(playbook).not.toMatch(/guaranteed printer acceptance/i);
    expect(playbook).not.toMatch(/save[sd]? \d+%/i);
    expect(playbook).not.toMatch(/customer logos/i);
    expect(playbook).not.toMatch(/Acme|Globex|Initech/i);
  });
});
