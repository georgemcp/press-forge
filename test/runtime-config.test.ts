import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const dockerfile = readFileSync("Dockerfile", "utf8");
const productionCompose = readFileSync("docker-compose.prod.yml", "utf8");
const nginxConfig = readFileSync("deploy/nginx.trimproof.conf", "utf8");
const deploymentGuide = readFileSync("docs/deploy/trimproof-vps.md", "utf8");

describe("production runtime configuration", () => {
  it("pins every application stage to the Node 24 LTS image digest", () => {
    expect(
      dockerfile.match(/^FROM node:24-bookworm-slim@sha256:[a-f0-9]{64}/gm)
    ).toHaveLength(3);
    expect(dockerfile).not.toContain("node:26");
  });

  it("pins the Redis runtime image while retaining its readable tag", () => {
    expect(productionCompose).toMatch(
      /image: redis:7-alpine@sha256:[a-f0-9]{64}/
    );
  });

  it("initializes generated storage with one narrowly privileged service", () => {
    const initService = productionCompose.match(
      /  generated-volume-init:\n[\s\S]*?\n  web:/
    )?.[0];

    expect(initService).toBeDefined();
    expect(initService).toMatch(/image: node:24-bookworm-slim@sha256:[a-f0-9]{64}/);
    expect(initService).toContain("user: \"0:0\"");
    expect(initService).toContain("read_only: true");
    expect(initService).toContain("network_mode: none");
    expect(initService).toContain("no-new-privileges:true");
    expect(initService).toContain("cap_drop:\n      - ALL");
    expect(initService).toContain("cap_add:\n      - CHOWN");
    expect(initService).not.toContain("DAC_OVERRIDE");
    expect(initService).toContain("chmod 0750 /generated");
    expect(initService).toContain("chown 1000:1000 /generated");
    expect(productionCompose.match(/condition: service_completed_successfully/g)).toHaveLength(2);
  });

  it("keeps every documented production command in the stable Compose project", () => {
    const composeCommands = deploymentGuide.match(/docker compose [^\n`]+/g) ?? [];

    expect(composeCommands.length).toBeGreaterThan(0);
    for (const command of composeCommands) {
      expect(command).toContain("docker compose -p trimproof ");
    }
    expect(deploymentGuide).toContain("< .release-commit");
    expect(deploymentGuide).toContain("^[0-9a-f]{40}$");
    expect(deploymentGuide).not.toContain("git rev-parse HEAD");
  });

  it("records source provenance on application images", () => {
    expect(dockerfile).toContain('org.opencontainers.image.revision="${OCI_REVISION}"');
    expect(dockerfile).toContain('org.opencontainers.image.source="${OCI_SOURCE}"');
    expect(productionCompose.match(/OCI_REVISION:/g)).toHaveLength(2);
    expect(productionCompose.match(/OCI_SOURCE:/g)).toHaveLength(2);
  });

  it("defines health checks and gates application startup on Redis readiness", () => {
    const webService = productionCompose.match(
      /  web:\n[\s\S]*?\n  worker:/
    )?.[0];

    expect(webService).toBeDefined();
    expect(webService).toContain("HOSTNAME: 0.0.0.0");
    expect(webService).toContain("http://127.0.0.1:3000/api/health");
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
