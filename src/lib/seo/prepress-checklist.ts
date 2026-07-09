export const prepressChecklistSections = [
  {
    heading: "1. Document geometry",
    items: [
      "Confirm the final trim size matches the product and printer order.",
      "Add bleed when artwork reaches the edge; 0.125 inch is a common starter value, but the printer spec wins.",
      "Keep important text and logos inside the safe area.",
      "Make crop marks visible when the printer requests them.",
      "Check that trim, bleed, crop, and media boxes do not contradict each other."
    ]
  },
  {
    heading: "2. Type and layout",
    items: [
      "Use vector text for final deliverables instead of rasterized prompt text.",
      "Embed fonts or outline type when the production workflow requires it.",
      "Read every line at final print size, including phone numbers, prices, dates, addresses, and URLs.",
      "Keep legal, pricing, allergy, and offer details visible and approved before export.",
      "Avoid placing critical copy too close to folds, trim edges, or drill/cut zones."
    ]
  },
  {
    heading: "3. Color and images",
    items: [
      "Use a CMYK-oriented workflow when the printer expects process color.",
      "Check image resolution at final placed size; 300 DPI is a common target for many products.",
      "Avoid relying on screen brightness to judge print contrast.",
      "Flag brand colors that require spot-color or vendor-specific handling.",
      "Review dark backgrounds, reversed type, and low-contrast color pairs carefully."
    ]
  },
  {
    heading: "4. PDF/X and handoff",
    items: [
      "Export a printer-facing PDF, not only a screen preview or social asset.",
      "Check PDF/X status if the printer asks for PDF/X-1a, PDF/X-4, or a specific preset.",
      "Include a preflight report or visible checklist when handing off the file.",
      "Name files clearly with product, size, date, and version.",
      "Keep the printer's own upload requirements beside the final proof."
    ]
  }
];

export const prepressChecklistFaq = [
  {
    question: "Does this checklist guarantee printer acceptance?",
    answer:
      "No. It covers common print-ready checks, but every printer can set its own file, substrate, finishing, and upload requirements."
  },
  {
    question: "What is the fastest way to use this checklist?",
    answer:
      "Start with document size, bleed, safe area, crop marks, image DPI, font handling, color workflow, and the printer's requested PDF preset."
  },
  {
    question: "Where does Trim Proof fit?",
    answer:
      "Trim Proof turns a supported print brief into a checked PDF/X-oriented proof and makes the same handoff issues visible before a clean export."
  }
];

export const prepressChecklistFacts = [
  ["Good first pass", "Trim size, bleed, safe area, crop marks, vector text, images, color, and PDF/X status are checked."],
  ["Common bleed", "0.125 inch is common for many starter jobs, but the printer's exact spec controls."],
  ["Common image target", "300 DPI at final size is a frequent target, but large-format and specialty products can differ."],
  ["Best next action", "Compare the final proof to the printer's latest upload instructions before sending."]
];
