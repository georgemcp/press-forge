import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("Dockerfile", "utf8");
const productionCompose = readFileSync("docker-compose.prod.yml", "utf8");
const nginxConfig = readFileSync("deploy/nginx.trimproof.conf", "utf8");

describe("production runtime configuration", () => {
  it("records source provenance on application images", () => {
    expect(dockerfile).toContain('org.opencontainers.image.revision="${OCI_REVISION}"');
    expect(dockerfile).toContain('org.opencontainers.image.source="${OCI_SOURCE}"');
    expect(productionCompose.match(/OCI_REVISION:/g)).toHaveLength(2);
    expect(productionCompose.match(/OCI_SOURCE:/g)).toHaveLength(2);
  });

  it("defines health checks and gates application startup on Redis readiness", () => {
    expect(productionCompose.match(/^    healthcheck:/gm)).toHaveLength(3);
    expect(productionCompose.match(/condition: service_healthy/g)).toHaveLength(2);
    expect(productionCompose).toContain('["CMD", "redis-cli", "ping"]');
  });

  it("disables nginx version tokens on HTTPS and HTTP responses", () => {
    const serverBlocks = nginxConfig.split(/^server \{/m).slice(1);

    expect(serverBlocks).toHaveLength(2);
    for (const serverBlock of serverBlocks) {
      expect(serverBlock).toContain("server_tokens off;");
    }
  });
});
