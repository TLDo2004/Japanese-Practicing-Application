import { describe, expect, it } from "vitest";
import { shouldRegisterBrowserPwa } from "./runtime";

describe("shouldRegisterBrowserPwa", () => {
  it("registers only for production http(s) browser contexts", () => {
    expect(shouldRegisterBrowserPwa({
      isProd: true,
      protocol: "https:",
      hasServiceWorker: true,
    })).toBe(true);
    expect(shouldRegisterBrowserPwa({
      isProd: true,
      protocol: "http:",
      hasServiceWorker: true,
    })).toBe(true);
  });

  it("skips Vite dev, non-http protocols, and browsers without service workers", () => {
    expect(shouldRegisterBrowserPwa({
      isProd: false,
      protocol: "https:",
      hasServiceWorker: true,
    })).toBe(false);
    expect(shouldRegisterBrowserPwa({
      isProd: true,
      protocol: "file:",
      hasServiceWorker: true,
    })).toBe(false);
    expect(shouldRegisterBrowserPwa({
      isProd: true,
      protocol: "https:",
      hasServiceWorker: false,
    })).toBe(false);
  });
});
