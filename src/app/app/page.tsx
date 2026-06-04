import { TrimProofWorkspace } from "@/components/trim-proof-workspace";
import { sampleBusinessCardLayout } from "@/lib/print/sample-layout";

export const metadata = {
  title: "Trim Proof App | Dummy Proof and Advanced PDF/X Export",
  description: "Create a dummy proof or run an advanced deterministic prepress export with PDF/X, CMYK, bleed, crop marks, and embedded vector fonts."
};

interface AppPageProps {
  searchParams: Promise<{
    checkout?: string;
    mode?: string;
    session_id?: string;
  }>;
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  return (
    <TrimProofWorkspace
      checkoutSessionId={params.checkout === "success" ? params.session_id : undefined}
      checkoutState={params.checkout}
      initialMode={params.mode === "advanced" ? "advanced" : "dummy"}
      initialSpec={sampleBusinessCardLayout}
    />
  );
}
