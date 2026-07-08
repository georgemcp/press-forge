import { Worker } from "bullmq";
import { layoutSpecSchema } from "@/lib/print/layout-spec";
import { generateProof } from "@/lib/print/proof";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.error("REDIS_URL is required to start the Trim Proof worker.");
  process.exit(1);
}

const parsedRedisUrl = new URL(redisUrl);
const connection = {
  host: parsedRedisUrl.hostname,
  port: Number(parsedRedisUrl.port || 6379),
  username: parsedRedisUrl.username || undefined,
  password: parsedRedisUrl.password || undefined,
  db: parsedRedisUrl.pathname ? Number(parsedRedisUrl.pathname.slice(1) || 0) : 0,
  maxRetriesPerRequest: null
};

const worker = new Worker(
  "trimproof-exports",
  async (job) => {
    const spec = layoutSpecSchema.parse(job.data.spec);
    const proof = await generateProof(spec);
    if (proof.report.status === "failed") {
      throw new Error(`Preflight failed for job ${job.id}`);
    }
    return {
      report: proof.report,
      pdfPath: proof.report.pdfPath
    };
  },
  { connection }
);

worker.on("completed", (job) => {
  console.info(`Trim Proof export job ${job.id} completed.`);
});

worker.on("failed", (job, error) => {
  console.error(`Trim Proof export job ${job?.id ?? "unknown"} failed: ${error.message}`);
});
