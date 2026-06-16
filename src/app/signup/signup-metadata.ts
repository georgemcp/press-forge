import type { Metadata } from "next";

export const signupNoindexRobots: Metadata["robots"] = {
  index: false,
  follow: false
};

export const signupPageMetadata: Metadata = {
  title: "Create Account",
  description: "Create a Trim Proof account before running a watermarked demo proof or paid clean PDF/X export.",
  alternates: {
    canonical: "/signup"
  },
  robots: signupNoindexRobots
};
