import sharp from "sharp";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/upload/route";
import { clearRateLimitState } from "@/lib/security/request";

const USER_ID = "6df3f657-766d-4f15-8af8-a3a8ccda0b04";
const LIMIT = 100 * 1024 * 1024;

const mocks = vi.hoisted(() => ({
  storage: undefined as unknown as { from: (bucket: string) => unknown }
}));

vi.mock("@/lib/auth/account-server", () => ({
  getAccountSessionFromCookies: () => ({ userId: "6df3f657-766d-4f15-8af8-a3a8ccda0b04", email: "owner@example.com" })
}));

vi.mock("@/lib/db/supabase", () => ({
  createServiceSupabaseClient: () => ({ storage: mocks.storage })
}));

type FakeOptions = {
  /** Hold every list() until this many uploads have landed (worst-case interleaving for parallel requests). */
  listBarrier?: number;
  uploadError?: boolean;
  listError?: boolean;
  removeFailures?: number;
};

function createFakeStorage(seedBytes: number, options: FakeOptions = {}) {
  const objects = new Map<string, number>();
  if (seedBytes > 0) objects.set(`${USER_ID}/reference/seed.png`, seedBytes);
  let uploads = 0;
  let removeFailures = options.removeFailures ?? 0;
  const waiters: Array<() => void> = [];
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  const bucket = {
    async upload(path: string, body: Buffer) {
      await tick();
      if (options.uploadError) return { error: { message: "upload exploded" } };
      objects.set(path, body.length);
      uploads += 1;
      if (options.listBarrier && uploads >= options.listBarrier) waiters.splice(0).forEach((resolve) => resolve());
      return { error: null };
    },
    async list() {
      if (options.listBarrier && uploads < options.listBarrier) {
        await new Promise<void>((resolve) => waiters.push(resolve));
      }
      await tick();
      if (options.listError) return { data: null, error: { message: "list exploded" } };
      return {
        data: [...objects].map(([path, size]) => ({ name: path.split("/").pop(), metadata: { size }, created_at: "2026-11-01T00:00:00Z" })),
        error: null
      };
    },
    async remove(paths: string[]) {
      await tick();
      if (removeFailures > 0) {
        removeFailures -= 1;
        return { error: { message: "remove failed" } };
      }
      paths.forEach((path) => objects.delete(path));
      return { error: null };
    }
  };
  mocks.storage = { from: () => bucket };
  const used = () => [...objects.values()].reduce((total, size) => total + size, 0);
  return { objects, used };
}

let png: Buffer;
let normalizedSize: number;

function uploadRequest() {
  const formData = new FormData();
  formData.set("file", new File([new Uint8Array(png)], "pic.png", { type: "image/png" }));
  return new Request("https://trimproof.com/api/upload", { method: "POST", body: formData });
}

describe("upload storage quota is reserved atomically", () => {
  beforeAll(async () => {
    png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#336699" } }).png().toBuffer();
    normalizedSize = (await sharp(png).rotate().png({ compressionLevel: 9 }).toBuffer()).length;
  });

  beforeEach(() => {
    clearRateLimitState();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    delete process.env.TRIMPROOF_MAX_UPLOAD_STORAGE_BYTES;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("a normal upload under quota is unchanged", async () => {
    const fake = createFakeStorage(1000);

    const response = await POST(uploadRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, contentType: "image/png", size: normalizedSize, originalName: "pic.png" });
    expect(body.url).toBe(`/api/upload?file_id=${encodeURIComponent(body.fileId)}`);
    expect(fake.objects.has(`${USER_ID}/reference/${body.fileId}.png`)).toBe(true);
    expect(fake.used()).toBe(1000 + normalizedSize);
  });

  it("refuses an upload that would exceed the quota, with the same response, and leaves nothing behind", async () => {
    const fake = createFakeStorage(LIMIT - normalizedSize + 1);

    const response = await POST(uploadRequest());

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "Account upload storage limit reached. Delete an image before uploading another." });
    expect(fake.objects.size).toBe(1);
  });

  it("accepts an upload that exactly fills the quota", async () => {
    const fake = createFakeStorage(LIMIT - normalizedSize);

    const response = await POST(uploadRequest());

    expect(response.status).toBe(200);
    expect(fake.used()).toBe(LIMIT);
  });

  it("parallel uploads that all raced past the usage read never leave the account over quota", async () => {
    const parallel = 6;
    // Room for two more images; every request has uploaded before any of them counts usage.
    const fake = createFakeStorage(LIMIT - Math.floor(2.5 * normalizedSize), { listBarrier: parallel });

    const responses = await Promise.all(Array.from({ length: parallel }, () => POST(uploadRequest())));
    const statuses = responses.map((response) => response.status);

    expect(statuses.every((status) => status === 200 || status === 413)).toBe(true);
    expect(statuses.filter((status) => status === 200).length).toBeLessThanOrEqual(2);
    expect(fake.used()).toBeLessThanOrEqual(LIMIT);
    for (const response of responses.filter((r) => r.status === 413)) {
      expect(await response.json()).toEqual({ error: "Account upload storage limit reached. Delete an image before uploading another." });
    }
  });

  it("parallel uploads with natural interleaving never exceed the quota and some succeed", async () => {
    const parallel = 6;
    const fake = createFakeStorage(LIMIT - Math.floor(2.5 * normalizedSize));

    const responses = await Promise.all(Array.from({ length: parallel }, () => POST(uploadRequest())));
    const accepted = responses.filter((response) => response.status === 200).length;

    expect(accepted).toBeLessThanOrEqual(2);
    expect(accepted).toBeGreaterThanOrEqual(1);
    expect(fake.used()).toBeLessThanOrEqual(LIMIT);
    expect(fake.objects.size).toBe(1 + accepted);
  });

  it("releases the reservation when the usage check fails", async () => {
    const fake = createFakeStorage(1000, { listError: true });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Upload failed. Provide a valid PNG, JPEG, or WebP image." });
    expect(fake.objects.size).toBe(1);
  });

  it("a failed upload reserves nothing and keeps the failure response", async () => {
    const fake = createFakeStorage(1000, { uploadError: true });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Upload failed. Provide a valid PNG, JPEG, or WebP image." });
    expect(fake.used()).toBe(1000);
  });

  it("retries releasing an over-quota reservation when the first remove fails", async () => {
    const fake = createFakeStorage(LIMIT - normalizedSize + 1, { removeFailures: 1 });

    const response = await POST(uploadRequest());

    expect(response.status).toBe(413);
    expect(fake.objects.size).toBe(1);
  });
});
