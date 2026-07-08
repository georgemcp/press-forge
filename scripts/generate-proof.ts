import { generateProof } from "@/lib/print/proof";

const proof = await generateProof();

console.log(JSON.stringify(
  {
    status: proof.report.status,
    sourcePdfPath: proof.sourcePdfPath,
    pdfPath: proof.report.pdfPath,
    svgMasterPath: proof.svgMasterPath,
    reportPath: proof.reportPath,
    checks: proof.report.checks.map((check) => ({
      id: check.id,
      status: check.status,
      evidence: check.evidence
    }))
  },
  null,
  2
));

if (proof.report.status === "failed") {
  process.exitCode = 1;
}
