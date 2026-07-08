import type { ProductType } from "@/lib/print/constants";

export interface SampleBrief {
  id: string;
  name: string;
  productType: ProductType;
  audience: string;
  goal: string;
  brief: string;
}

export const sampleBriefs: SampleBrief[] = [
  {
    id: "restaurant-menu",
    name: "Seasonal bistro menu",
    productType: "menu",
    audience: "Restaurant",
    goal: "Dinner menu with clear specials and print-safe type.",
    brief:
      "Brand: Sunset Bistro. Create an 11 x 8.5 inch dinner menu for seasonal coastal dishes with warm hospitality, clear section hierarchy, subtle botanical texture, ordering details, and contact hello@sunsetbistro.com."
  },
  {
    id: "print-shop-flyer",
    name: "Customer promo flyer",
    productType: "flyer",
    audience: "Print shop",
    goal: "Fast first proof from rough customer notes.",
    brief:
      "Brand: Northside Print Co. Create an 8.5 x 11 inch flyer for a customer spring sale with bold headline, friendly retail energy, coupon callout, store address, phone (555) 014-2200, and PDF/X-1a handoff."
  },
  {
    id: "real-estate-postcard",
    name: "Real estate postcard",
    productType: "postcard",
    audience: "Local marketer",
    goal: "Neighborhood mailer with a clean contact block.",
    brief:
      "Brand: Harbor Home Group. Create a 6 x 4 inch real estate postcard for a just-listed waterfront home, premium but approachable style, short benefit copy, call Rachel at (555) 013-8901, and strong image area."
  },
  {
    id: "designer-business-card",
    name: "Freelancer card",
    productType: "business_card",
    audience: "Designer",
    goal: "Small client identity handoff with bleed and vector text.",
    brief:
      "Brand: Avery Cole Studio. Create a premium business card for a freelance brand designer with calm editorial style, sharp typography, subtle abstract background art, and contact avery@averycole.studio."
  },
  {
    id: "event-poster",
    name: "Community event poster",
    productType: "poster",
    audience: "Event team",
    goal: "Large-format announcement with readable hierarchy.",
    brief:
      "Brand: Lakeside Arts Weekend. Create an 11 x 17 inch poster for a community art market, energetic but refined, headline Saturday June 28, vendor booths, live music, and lakesidearts.example.com."
  },
  {
    id: "service-brochure",
    name: "Service tri-fold",
    productType: "brochure",
    audience: "Service business",
    goal: "Tri-fold overview for a recurring sales handout.",
    brief:
      "Brand: ClearFlow HVAC. Create an 11 x 8.5 inch tri-fold brochure for maintenance plans, clean technical style, three service tiers, emergency repair note, phone (555) 018-4400, and clear panel hierarchy."
  },
  {
    id: "letterhead",
    name: "Company letterhead",
    productType: "letterhead",
    audience: "Operations",
    goal: "Formal stationery with safe margins and contact details.",
    brief:
      "Brand: Meridian Advisory. Create an 8.5 x 11 inch letterhead for client correspondence with restrained professional style, address line, meridianadvisory.example.com, and generous writing area."
  }
];

export function getSampleBrief(id: string) {
  return sampleBriefs.find((sample) => sample.id === id);
}
