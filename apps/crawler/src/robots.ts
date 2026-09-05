import { fetchSafe } from "./fetch-safe";

const OUR_USER_AGENT = "LocalSeoPlatformBot";

interface RobotsRule {
  path: string;
  allow: boolean;
}

interface RobotsGroup {
  userAgents: string[];
  rules: RobotsRule[];
}

/** A tiny robots.txt parser — just enough to answer "can we fetch this path?". */
function parseRobotsTxt(content: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;

    const [directiveRaw, ...rest] = line.split(":");
    const directive = directiveRaw?.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (!directive || !value) continue;

    if (directive === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { userAgents: [], rules: [] };
        groups.push(current);
      }
      current.userAgents.push(value.toLowerCase());
    } else if (directive === "disallow" && current) {
      current.rules.push({ path: value, allow: value === "" });
    } else if (directive === "allow" && current) {
      current.rules.push({ path: value, allow: true });
    }
  }

  return groups;
}

function matchesGroup(group: RobotsGroup, userAgent: string): boolean {
  return group.userAgents.some((ua) => ua === "*" || userAgent.toLowerCase().includes(ua));
}

function isPathAllowed(groups: RobotsGroup[], path: string, userAgent: string): boolean {
  const specific = groups.filter((g) => matchesGroup(g, userAgent) && !g.userAgents.includes("*"));
  const wildcard = groups.filter((g) => g.userAgents.includes("*"));
  const applicable = specific.length > 0 ? specific : wildcard;

  // Longest matching rule wins, per the de facto robots.txt convention.
  let best: RobotsRule | null = null;
  for (const group of applicable) {
    for (const rule of group.rules) {
      if (rule.path && path.startsWith(rule.path)) {
        if (!best || rule.path.length > best.path.length) {
          best = rule;
        }
      }
    }
  }
  return best?.allow ?? true;
}

/**
 * Checks whether our crawler is allowed to fetch `url`, per
 * docs/security.md: "Respect robots.txt where applicable." If
 * robots.txt can't be fetched at all (missing, network error), the
 * conventional interpretation is that crawling is allowed.
 */
export async function isCrawlAllowed(url: string): Promise<boolean> {
  const target = new URL(url);
  const robotsUrl = new URL("/robots.txt", target.origin).toString();

  let robotsTxt: string;
  try {
    const result = await fetchSafe(robotsUrl);
    if (result.status >= 400) return true;
    robotsTxt = result.html;
  } catch {
    return true;
  }

  const groups = parseRobotsTxt(robotsTxt);
  return isPathAllowed(groups, target.pathname, OUR_USER_AGENT);
}
