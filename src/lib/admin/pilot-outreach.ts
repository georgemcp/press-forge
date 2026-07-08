import type { PilotPipelineLead } from "@/lib/admin/pilot-pipeline";

export interface PilotFirstTouchMessage {
  subject: string;
  body: string;
}

export interface PilotFirstTouchBatchItem {
  lead: PilotPipelineLead;
  message: PilotFirstTouchMessage;
}

function productLabel(value?: string) {
  return (value ?? "print job").replaceAll("_", " ");
}

function greeting(lead: PilotPipelineLead) {
  if (lead.contactName) {
    return lead.contactName.split(/\s+/)[0];
  }
  if (lead.companyName) {
    return `${lead.companyName} team`;
  }
  return "there";
}

function segmentSubject(lead: PilotPipelineLead, product: string) {
  if (lead.segment === "print_shop") {
    return `Pilot: checked PDF/X proofs for ${product} jobs`;
  }
  if (lead.segment === "designer") {
    return `Pilot for small ${product} handoffs`;
  }
  if (lead.segment === "marketing_team") {
    return `Quick pilot for recurring ${product} collateral`;
  }
  return `Want to test one real Trim Proof ${product} job?`;
}

function segmentOpening(lead: PilotPipelineLead, product: string) {
  if (lead.segment === "print_shop") {
    return `I am building Trim Proof for common local print jobs where the file looks done on screen but still needs bleed, crop marks, safe area, image DPI, color workflow, or PDF/X checks before handoff. Your public work around ${product} looked like a practical fit for the first pilot batch.`;
  }
  if (lead.segment === "designer") {
    return `I am inviting a small group of designers to test Trim Proof on low-margin print jobs where the design is mostly decided but the handoff still needs trim, bleed, crop marks, safe area, image, and PDF/X checks. Your public work around ${product} looked like a practical fit for the first pilot batch.`;
  }
  if (lead.segment === "marketing_team") {
    return `I am opening a Trim Proof pilot for teams that create repeat local print assets like flyers, menus, cards, postcards, posters, brochures, or letterhead. Your public work around ${product} looked like a practical fit for the first pilot batch.`;
  }
  return `I am recruiting the first Trim Proof pilot participants now. The useful next step is one real supported job like a flyer, menu, card, postcard, poster, brochure, or letterhead.`;
}

export function buildPilotFirstTouchMessage(lead: PilotPipelineLead): PilotFirstTouchMessage {
  const product = productLabel(lead.firstSupportedJob);
  const pain = lead.likelyPain?.trim() || lead.useCase.trim();
  return {
    subject: segmentSubject(lead, product),
    body: [
      `Hi ${greeting(lead)},`,
      "",
      segmentOpening(lead, product),
      "",
      `The likely test case I have in mind is a ${product}: ${pain}`,
      "",
      "The pilot is simple: ten export credits, founder onboarding, and one feedback call around a real supported job. It does not guarantee printer acceptance or replace production judgment. The goal is to learn whether a checked starter proof and report make the next action clearer before expert review.",
      "",
      "Reply with the first supported job you would want to test and the printer spec or handoff requirement you normally check against.",
      "",
      "George"
    ].join("\n")
  };
}

export function buildPilotFirstTouchBatch(leads: PilotPipelineLead[], limit = 10): PilotFirstTouchBatchItem[] {
  return [...leads]
    .filter((lead) => lead.followUpStatus === "needs_follow_up")
    .sort((left, right) => {
      if (right.priorityScore !== left.priorityScore) {
        return right.priorityScore - left.priorityScore;
      }
      return right.lastSignalAt.localeCompare(left.lastSignalAt);
    })
    .slice(0, limit)
    .map((lead) => ({
      lead,
      message: buildPilotFirstTouchMessage(lead)
    }));
}
