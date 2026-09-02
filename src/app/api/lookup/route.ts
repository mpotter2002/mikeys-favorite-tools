import { NextRequest } from "next/server";
import { guessFromUrl, type ToolDraft } from "@/lib/guess";
import { parseGithubRepo } from "@/lib/search";

export type LookupResponse = ToolDraft;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim();
  if (!url) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  const draft = guessFromUrl(url);
  try {
    const extra = draft.repo ? await lookupGithub(draft.repo) : await lookupPageWithGithub(draft.url);
    return Response.json(mergeDraft(draft, extra));
  } catch {
    return Response.json(draft);
  }
}

async function lookupPageWithGithub(url: string): Promise<Partial<ToolDraft> & { image?: string }> {
  const page = await lookupPage(url);
  if (!page.repo) return page;

  const github = await lookupGithub(page.repo);
  return {
    ...github,
    ...page,
    tags: Array.from(new Set([...(github.tags ?? []), ...(page.tags ?? [])])),
  };
}

function mergeDraft(draft: ToolDraft, extra: Partial<ToolDraft> & { image?: string }): LookupResponse & { image?: string } {
  const tags = Array.from(new Set([...(draft.tags ?? []), ...(extra.tags ?? [])]));
  const guessed = Array.from(new Set([...(draft.guessed ?? []), ...(extra.guessed ?? [])]));
  return {
    ...draft,
    name: extra.name || draft.name,
    description: extra.description || draft.description,
    category: extra.category || draft.category,
    kind: extra.kind || draft.kind,
    tags,
    repo: extra.repo || draft.repo,
    guessed,
    image: extra.image,
  };
}

async function lookupGithub(repo: string): Promise<Partial<ToolDraft> & { image?: string }> {
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "mikeys-favorite-tools",
    },
    next: { revalidate: 3600 },
  });
  if (!response.ok) return {};
  const data = (await response.json()) as {
    name?: string;
    full_name?: string;
    description?: string;
    topics?: string[];
    language?: string;
  };
  const tags = ["github", ...(data.topics ?? []), data.language?.toLowerCase() ?? ""].filter(Boolean);
  const full = data.full_name || repo;
  return {
    name: data.name || data.full_name || repo,
    description: data.description || "",
    tags,
    repo: full,
    guessed: ["name", "description", "tags", "repo"],
    image: `https://opengraph.githubassets.com/1/${full}`,
  };
}

async function lookupPage(url: string): Promise<Partial<ToolDraft> & { image?: string }> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; MikeysFavoriteTools/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(4000),
  });
  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("html")) return {};
  const html = (await response.text()).slice(0, 80_000);
  return parseHtml(html, url);
}

function meta(html: string, keys: string[]) {
  for (const key of keys) {
    const property = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`,
      "i",
    );
    const contentFirst = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      "i",
    );
    const match = html.match(property) ?? html.match(contentFirst);
    if (match?.[1]) return decode(match[1]);
  }
  return "";
}

function parseHtml(html: string, pageUrl: string): Partial<ToolDraft> & { image?: string } {
  const title =
    meta(html, ["og:title", "twitter:title"]) ||
    decode(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] ?? "");
  const description = meta(html, ["og:description", "description", "twitter:description"]);
  const image = absoluteUrl(meta(html, ["og:image", "twitter:image", "og:image:url"]), pageUrl);
  const repo = githubRepoFromHtml(html, pageUrl);
  const guessed = [];
  if (title) guessed.push("name");
  if (description) guessed.push("description");
  return {
    name: cleanTitle(title),
    description,
    repo,
    guessed,
    image,
  };
}

function githubRepoFromHtml(html: string, pageUrl: string) {
  const candidates = new Map<string, { repo: string; score: number }>();
  const anchorPattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(anchorPattern)) {
    const repo = parseGithubRepo(absoluteUrl(match[1], pageUrl));
    if (!repo) continue;
    const label = decode(match[2].replace(/<[^>]*>/g, " ")).toLowerCase();
    const score = /\b(source|github|repo|repository|open source)\b/.test(label) ? 2 : 1;
    const current = candidates.get(repo.full);
    if (!current || score > current.score) candidates.set(repo.full, { repo: repo.full, score });
  }

  if (!candidates.size) return undefined;
  return [...candidates.values()].sort((a, b) => b.score - a.score)[0]?.repo;
}

function absoluteUrl(value: string, pageUrl: string) {
  if (!value) return "";
  try {
    return new URL(value, pageUrl).toString();
  } catch {
    return value;
  }
}

function cleanTitle(title: string) {
  return title
    .replace(/\s+[|\-–—].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
