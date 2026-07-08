export interface AudiencePage {
  path: string;
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  shortAnswer: string;
  emailSource: string;
  primaryCta: string;
  proofPoints: Array<[string, string]>;
  useCases: Array<[string, string]>;
  workflow: string[];
  boundaries: string[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
}

export const audiencePages: AudiencePage[] = [
  {
    path: "/for-print-shops",
    slug: "print-shops",
    title: "Trim Proof for Print Shops",
    metaDescription:
      "Use Trim Proof to turn rough customer print briefs into checked starter PDF/X proofs with visible bleed, crop marks, vector text, DPI, color, and preflight status.",
    eyebrow: "For print shops",
    h1: "Give rough customer jobs a cleaner first proof before prepress time disappears.",
    shortAnswer:
      "Trim Proof helps print shops turn a plain-English customer brief into a checked starter proof for supported jobs. It makes trim, bleed, safe area, crop marks, vector text, image DPI, color workflow, and PDF/X status visible before a clean export is used.",
    emailSource: "print_shop_page",
    primaryCta: "Join print-shop pilot",
    proofPoints: [
      ["Best fit", "Small repeat jobs where the customer has copy, a rough direction, or a screen-ready idea."],
      ["Pilot offer", "Manual 10-credit feedback pilot for shops willing to test real supported jobs."],
      ["Output boundary", "A checked PDF/X-oriented proof, not a guarantee that every vendor spec is satisfied."],
      ["Follow-up signal", "Signup source identifies print-shop demand for founder outreach."]
    ],
    useCases: [
      ["Customer intake cleanup", "Use a plain-language brief to create a first proof instead of starting with an incomplete email thread."],
      ["Preflight evidence", "Show the checks that matter before a file is treated as production-ready."],
      ["Supported starter jobs", "Flyers, posters, menus, brochures, business cards, postcards, and letterhead are the initial commercial lanes."]
    ],
    workflow: [
      "Capture the customer goal, product type, copy, size, and any printer-specific requirement you already know.",
      "Generate a watermarked starter proof and inspect the trim, bleed, safe-area, crop-mark, text, color, and DPI checks.",
      "Use the proof report to decide whether the job is ready for a clean export, needs a brief revision, or should go to a production specialist.",
      "Use export credit or Pro when a supported job needs a clean production-oriented PDF/X download.",
      "Send pilot feedback on which shop specs, product profiles, and report fields should come next."
    ],
    boundaries: [
      "Trim Proof does not replace the shop's final production judgment.",
      "Trim Proof does not repair arbitrary existing PDFs or native design files.",
      "Trim Proof should be checked against the printer's current substrate, finishing, and file-submission rules."
    ],
    faq: [
      {
        question: "Can Trim Proof guarantee a file will print correctly?",
        answer:
          "No. Trim Proof checks common structural issues and produces a PDF/X-oriented proof for supported products, but printer specifications and production conditions still control final acceptance."
      },
      {
        question: "Is this meant to replace Acrobat Preflight, PitStop, or a RIP?",
        answer:
          "No. Those tools remain valuable for expert production work. Trim Proof starts earlier by helping non-specialists create a cleaner checked starter proof from a brief."
      },
      {
        question: "What should a print shop test first?",
        answer:
          "Start with repeat small-format jobs such as flyers, cards, menus, postcards, posters, brochures, or letterhead where avoidable file-prep back-and-forth is common."
      }
    ]
  },
  {
    path: "/for-marketers",
    slug: "marketers",
    title: "Trim Proof for Marketing Teams",
    metaDescription:
      "Trim Proof helps in-house marketers create checked print-ready PDF/X proofs for flyers, menus, postcards, brochures, posters, cards, and letterhead without prepress guesswork.",
    eyebrow: "For marketing teams",
    h1: "Make local print collateral without guessing what the printer will ask for next.",
    shortAnswer:
      "Trim Proof gives marketers a guided path from campaign brief to checked print proof. The creative start can be fast, while the final handoff still exposes bleed, crop marks, safe area, vector text, color workflow, DPI, and PDF/X status.",
    emailSource: "marketer_page",
    primaryCta: "Get marketer launch notes",
    proofPoints: [
      ["Best fit", "Recurring local campaigns that need flyers, menus, postcards, posters, brochures, cards, or letterhead."],
      ["First step", "Create a free watermarked demo proof before paying for a clean production export."],
      ["Commercial path", "$12 export credit for one real job or $49/month Pro for repeat work."],
      ["Main risk reduced", "Hidden print-file uncertainty before a deadline or vendor handoff."]
    ],
    useCases: [
      ["Restaurant and retail updates", "Turn menu specials, event handouts, and seasonal promotions into supported proof formats."],
      ["Local campaign collateral", "Create flyers, postcards, posters, and brochures when speed matters but the printer still needs structure."],
      ["Brand-safe repeat work", "Use the same proof path for repeat assets instead of recreating print settings from memory."]
    ],
    workflow: [
      "Write the campaign brief, offer, audience, required copy, size, and preferred product type.",
      "Generate a watermarked proof and check the visible report before choosing a paid export.",
      "Revise copy or layout details while the job is still cheap to change.",
      "Use a clean export when the proof is ready for a printer-facing handoff.",
      "Keep the printer's own requirements nearby and compare them against the final proof."
    ],
    boundaries: [
      "Trim Proof is not a replacement for brand approval or legal review.",
      "Trim Proof does not sell printed materials or choose a printer for the buyer.",
      "Trim Proof does not promise that every print vendor accepts every file without review."
    ],
    faq: [
      {
        question: "Do marketers need prepress experience to use Trim Proof?",
        answer:
          "No. Trim Proof explains the relevant checks in the workflow, but printer-specific requirements should still be reviewed before a final handoff."
      },
      {
        question: "Can I use Trim Proof instead of Canva?",
        answer:
          "You can keep using Canva for ideas if it helps. Trim Proof is positioned around the printer-facing proof, PDF/X-oriented export, vector text, bleed, crop marks, and preflight report."
      },
      {
        question: "When should a marketer pay for export?",
        answer:
          "Use the free demo to inspect the proof first. Pay for a clean export when the supported job is ready for a real printer-facing file."
      }
    ]
  },
  {
    path: "/for-designers",
    slug: "designers",
    title: "Trim Proof for Freelance Designers",
    metaDescription:
      "Trim Proof gives freelance designers a production safety layer for low-margin print jobs, with checked PDF/X-oriented proofs, vector text, bleed, crop marks, and preflight status.",
    eyebrow: "For freelance designers",
    h1: "Protect small print jobs from the quiet production details that eat the margin.",
    shortAnswer:
      "Trim Proof helps freelancers move from client copy to a checked starter proof for supported print products. It is a production safety layer around fast creative work, not a replacement for craft judgment or final printer review.",
    emailSource: "designer_page",
    primaryCta: "Get designer launch notes",
    proofPoints: [
      ["Best fit", "Small client jobs where print setup time can overrun the fee."],
      ["Useful handoff", "A visible proof report that explains what was checked."],
      ["Text handling", "Final deliverable text is built as embedded vector type, not prompt-rendered raster text."],
      ["Pricing fit", "One-off exports for occasional jobs or Pro for repeat client print work."]
    ],
    useCases: [
      ["Client copy to first proof", "Start with the message, product type, and brand direction instead of rebuilding every print frame from scratch."],
      ["Production sanity check", "Review bleed, safe area, crop marks, fonts, color workflow, image DPI, and PDF/X status before handoff."],
      ["Small-job throughput", "Use a repeatable proof path when the job does not justify a heavy custom production workflow."]
    ],
    workflow: [
      "Turn the client's brief into a supported product proof with the right copy and basic production intent.",
      "Review the layout, trim, bleed, safe area, type, image, color, and PDF/X report before presenting the file.",
      "Revise the brief or proof when brand, copy, or printer requirements change.",
      "Export only when the job is ready for a clean production-oriented file.",
      "Keep final responsibility with the designer and the printer's current specifications."
    ],
    boundaries: [
      "Trim Proof does not replace professional design judgment.",
      "Trim Proof does not create complex packaging, dielines, or arbitrary production formats.",
      "Trim Proof should not be presented as guaranteed printer acceptance."
    ],
    faq: [
      {
        question: "Is Trim Proof a design portfolio tool?",
        answer:
          "No. It is focused on generating and checking practical print proofs for supported products, especially where the production handoff matters."
      },
      {
        question: "Can a freelancer still edit the final work?",
        answer:
          "Trim Proof is currently built around generated proofs and exports. Use the report and proof as a safer handoff path, not as a universal source-file editor."
      },
      {
        question: "Why would a designer use this instead of a full Adobe workflow?",
        answer:
          "For some jobs, the full Adobe workflow is the right answer. Trim Proof fits smaller repeat jobs where a quick checked proof and production-oriented PDF/X export are enough."
      }
    ]
  }
];

export function getAudiencePage(slug: string) {
  return audiencePages.find((page) => page.slug === slug);
}
