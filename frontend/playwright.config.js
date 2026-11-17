import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://localhost:5174",
    headless: true,
    launchOptions: existsSync(edge) ? { executablePath: edge } : {},
  },
});
