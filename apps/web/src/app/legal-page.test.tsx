import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Privacy from "./privacy/page";
import Terms from "./terms/page";

const pages = [
  { name: "privacy", Page: Privacy, title: "Privacy policy" },
  { name: "terms", Page: Terms, title: "Terms of use" },
];

describe.each(pages)("/$name", ({ Page, title }) => {
  const html = renderToStaticMarkup(<Page />);

  it("has its title and a last-updated date", () => {
    expect(html).toContain(`<h1 class="text-3xl font-semibold">${title}</h1>`);
    expect(html).toMatch(/Last updated <time datetime="\d{4}-\d{2}-\d{2}">[A-Z][a-z]+ \d{1,2}, \d{4}<\/time>/i);
  });

  it("has no open \"To decide\" markers left", () => {
    expect(html).not.toContain("data-to-decide");
  });

  it("gives every section a heading the page can link to", () => {
    const labelled = [...html.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
    expect(labelled.length).toBeGreaterThan(3);
    for (const id of labelled) expect(html).toContain(`<h2 id="${id}"`);
  });
});

describe("/privacy", () => {
  const html = renderToStaticMarkup(<Privacy />);

  it("names every provider that sees Newton's data", () => {
    for (const name of ["Supabase", "Vercel", "Resend", "Cloudflare", "Anthropic", "Voyage AI"]) {
      expect(html).toContain(name);
    }
  });

  it("says how to export and delete data", () => {
    expect(html).toContain("Get a copy");
    expect(html).toContain("Delete");
  });
});

describe("/terms", () => {
  const html = renderToStaticMarkup(<Terms />);

  it("carries the safety framing and the licence", () => {
    expect(html).toContain("supports the skipper");
    expect(html).toContain("GNU Affero General Public License v3.0");
  });
});
