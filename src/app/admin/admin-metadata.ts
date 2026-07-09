import type { Metadata } from "next";

export const adminNoindexRobots: Metadata["robots"] = {
  index: false,
  follow: false
};

export const adminLoginMetadata: Metadata = {
  title: "Admin Login",
  description: "Protected Trim Proof management center login.",
  alternates: {
    canonical: "/admin/login"
  },
  robots: adminNoindexRobots
};
