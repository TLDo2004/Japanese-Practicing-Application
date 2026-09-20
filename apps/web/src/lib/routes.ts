export type AppRoute =
  | { name: "learn" }
  | { name: "chart"; script: "hira" | "kata" }
  | { name: "character"; script: "hira" | "kata"; ro: string }
  | { name: "practice" }
  | { name: "sets"; kind: "write" | "quiz"; mode: string }
  | { name: "writing" }
  | { name: "quiz" }
  | { name: "summary" }
  | { name: "dict" };

const SECONDARY = new Set(["chart", "character", "sets", "writing", "quiz", "summary"]);

/** Routes that benefit from more horizontal room on desktop. */
const WIDE = new Set(["chart", "writing"]);

export function parseHash(hash: string): AppRoute {
  const raw = String(hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) return { name: "learn" };
  if (parts[0] === "learn" && parts[1] === "chart") {
    const script = parts[2] === "kata" ? "kata" : "hira";
    if (parts[3]) return { name: "character", script, ro: parts[3] };
    return { name: "chart", script };
  }
  if (parts[0] === "practice" && parts[1] === "sets") {
    return {
      name: "sets",
      kind: parts[2] === "quiz" ? "quiz" : "write",
      mode: parts[3] || "hira",
    };
  }
  if (parts[0] === "practice" && parts[1] === "write") return { name: "writing" };
  if (parts[0] === "practice" && parts[1] === "quiz") return { name: "quiz" };
  if (parts[0] === "practice" && parts[1] === "summary") return { name: "summary" };
  if (parts[0] === "practice") return { name: "practice" };
  if (parts[0] === "dictionary" || parts[0] === "dict") return { name: "dict" };
  if (parts[0] === "learn") return { name: "learn" };
  return { name: "learn" };
}

export function parsePath(pathname: string): AppRoute {
  return parseHash(pathname.startsWith("/") ? pathname : `/${pathname}`);
}

export function pathFor(route: AppRoute | string): string {
  if (typeof route === "string") {
    if (route.startsWith("/")) return route;
    if (route.startsWith("#")) return route.replace(/^#/, "") || "/learn";
    return `/${route}`;
  }
  if (route.name === "chart") return `/learn/chart/${route.script || "hira"}`;
  if (route.name === "character") return `/learn/chart/${route.script || "hira"}/${route.ro}`;
  if (route.name === "sets") return `/practice/sets/${route.kind || "write"}/${route.mode || "hira"}`;
  if (route.name === "writing") return "/practice/write";
  if (route.name === "quiz") return "/practice/quiz";
  if (route.name === "summary") return "/practice/summary";
  if (route.name === "practice") return "/practice";
  if (route.name === "dict") return "/dictionary";
  return "/learn";
}

export function isSecondaryRoute(route: AppRoute): boolean {
  return SECONDARY.has(route.name);
}

export function isWideRoute(route: AppRoute): boolean {
  return WIDE.has(route.name);
}

export function persistableTab(
  route: AppRoute,
  origin?: string,
): "learn" | "practice" | "dict" {
  if (route.name === "dict") return "dict";
  if (route.name === "learn" || route.name === "chart" || route.name === "character") return "learn";
  if ((route.name === "writing" || route.name === "summary") && origin === "learn") return "learn";
  if (
    route.name === "practice"
    || route.name === "sets"
    || route.name === "writing"
    || route.name === "quiz"
    || route.name === "summary"
  ) {
    return "practice";
  }
  return "learn";
}

export function activeTab(route: AppRoute): "learn" | "practice" | "dict" {
  if (route.name === "dict") return "dict";
  if (
    route.name === "practice"
    || route.name === "sets"
    || route.name === "writing"
    || route.name === "quiz"
    || route.name === "summary"
  ) {
    return "practice";
  }
  return "learn";
}
