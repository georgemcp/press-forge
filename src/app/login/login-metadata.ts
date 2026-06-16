import type { Metadata } from "next";

export const loginNoindexRobots: Metadata["robots"] = {
  index: false,
  follow: false
};

export const loginPageMetadata: Metadata = {
  title: "Sign In",
  description: "Sign in to Trim Proof before running demo proofs or paid PDF/X exports.",
  alternates: {
    canonical: "/login"
  },
  robots: loginNoindexRobots
};
