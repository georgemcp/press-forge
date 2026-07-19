export const POINTS_PER_INCH = 72;

export const PRODUCT_PROFILES = {
  business_card: {
    id: "business_card",
    label: "Business card",
    trimWidthIn: 3.5,
    trimHeightIn: 2,
    bleedIn: 0.125,
    safeMarginIn: 0.125,
    slugIn: 0.125
  },
  postcard: {
    id: "postcard",
    label: "Postcard",
    trimWidthIn: 6,
    trimHeightIn: 4,
    bleedIn: 0.125,
    safeMarginIn: 0.125,
    slugIn: 0.125
  },
  flyer: {
    id: "flyer",
    label: "Flyer",
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  },
  poster: {
    id: "poster",
    label: "Poster",
    trimWidthIn: 11,
    trimHeightIn: 17,
    bleedIn: 0.125,
    safeMarginIn: 0.5,
    slugIn: 0.125
  },
  brochure: {
    id: "brochure",
    label: "Tri-fold brochure",
    trimWidthIn: 11,
    trimHeightIn: 8.5,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  },
  letterhead: {
    id: "letterhead",
    label: "Letterhead",
    trimWidthIn: 8.5,
    trimHeightIn: 11,
    bleedIn: 0.125,
    safeMarginIn: 0.25,
    slugIn: 0.125
  }
} as const;

export type ProductType = keyof typeof PRODUCT_PROFILES;

export const PRINT_PROFILES = {
  USWebCoatedSWOP: {
    id: "USWebCoatedSWOP",
    label: "US Web Coated SWOP v2",
    market: "US general commercial print"
  },
  GRACoL2013: {
    id: "GRACoL2013",
    label: "GRACoL2013",
    market: "US sheetfed/coated workflows"
  },
  FOGRA39: {
    id: "FOGRA39",
    label: "FOGRA39",
    market: "European coated workflows"
  }
} as const;

export type PrintProfileId = keyof typeof PRINT_PROFILES;

export function inchesToPoints(inches: number) {
  return inches * POINTS_PER_INCH;
}

export function getPageGeometry(productType: ProductType) {
  const profile = PRODUCT_PROFILES[productType];
  const trimWidth = inchesToPoints(profile.trimWidthIn);
  const trimHeight = inchesToPoints(profile.trimHeightIn);
  const bleed = inchesToPoints(profile.bleedIn);
  const safe = inchesToPoints(profile.safeMarginIn);
  const slug = inchesToPoints(profile.slugIn);
  const mediaWidth = trimWidth + 2 * (bleed + slug);
  const mediaHeight = trimHeight + 2 * (bleed + slug);
  const bleedX = slug;
  const bleedY = slug;
  const trimX = slug + bleed;
  const trimY = slug + bleed;

  return {
    profile,
    bleed,
    safe,
    slug,
    trim: {
      x: trimX,
      y: trimY,
      width: trimWidth,
      height: trimHeight
    },
    bleedBox: {
      x: bleedX,
      y: bleedY,
      width: trimWidth + 2 * bleed,
      height: trimHeight + 2 * bleed
    },
    safeBox: {
      x: trimX + safe,
      y: trimY + safe,
      width: trimWidth - 2 * safe,
      height: trimHeight - 2 * safe
    },
    mediaBox: {
      x: 0,
      y: 0,
      width: mediaWidth,
      height: mediaHeight
    }
  };
}
