import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SiteFooter } from "./site-footer";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SiteFooter version", () => {
  it("links the production release tag to its GitHub Release", () => {
    vi.stubEnv("NEXT_PUBLIC_NEWTON_RELEASE_TAG", "2026.10.21");
    vi.stubEnv("NEXT_PUBLIC_NEWTON_BUILD_SHA", "abc1234");

    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('href="https://github.com/heynewton/newton/releases/tag/2026.10.21">2026.10.21</a>');
    expect(html).not.toContain("/commit/abc1234");
  });

  it("links a preview's short commit and pull request to GitHub", () => {
    vi.stubEnv("NEXT_PUBLIC_NEWTON_BUILD_SHA", "abcdef0123456789");
    vi.stubEnv("NEXT_PUBLIC_NEWTON_PR_NUMBER", "165");

    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).toContain('href="https://github.com/heynewton/newton/commit/abcdef0123456789">abcdef0</a>');
    expect(html).toContain('href="https://github.com/heynewton/newton/pull/165">(#165)</a>');
  });

  it("omits the version when no build metadata is available", () => {
    const html = renderToStaticMarkup(<SiteFooter />);

    expect(html).not.toContain("Version:");
  });
});
