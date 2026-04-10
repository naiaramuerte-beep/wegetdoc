import { describe, it, expect } from "vitest";
import { storagePut, storageGet } from "./storage";

describe("Cloudflare R2 Storage", () => {
  const testKey = `test/${Date.now()}-test.txt`;
  const testContent = "Hello from EditorPDF storage test!";

  it("should upload a file to R2 and return a public URL", async () => {
    const result = await storagePut(testKey, testContent, "text/plain");
    expect(result).toBeDefined();
    expect(result.key).toBe(testKey);
    expect(result.url).toBeTruthy();
    expect(result.url).toContain("r2.dev");
  }, 15000);

  it("should get a public URL for an existing file", async () => {
    // First upload
    await storagePut(testKey, testContent, "text/plain");
    // Then get
    const result = await storageGet(testKey);
    expect(result).toBeDefined();
    expect(result.key).toBe(testKey);
    expect(result.url).toBeTruthy();
  }, 15000);
});
