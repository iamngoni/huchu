/**
 * @-mentions in comments.
 *
 * Mentions are parsed from the comment body at write time and stored as rows,
 * so "what was I mentioned in?" is a query rather than a scan of every comment
 * ever written.
 */
export type MentionCandidate = { id: string; name: string | null; email: string };

/**
 * Mentions are written as `@[Name](userId)` — the editor inserts that form
 * when someone picks from the list, so a bare "@john" in prose is not a
 * mention and won't notify anyone by accident.
 */
const MENTION_PATTERN = /@\[([^\]]+)\]\(([0-9a-fA-F-]{36})\)/g;

export function extractMentionedUserIds(body: string): string[] {
  const ids = new Set<string>();
  for (const match of body.matchAll(MENTION_PATTERN)) {
    ids.add(match[2]);
  }
  return Array.from(ids);
}

/** Render a stored body for display, replacing the markup with plain names. */
export function renderMentionText(body: string): string {
  return body.replace(MENTION_PATTERN, (_match, name: string) => `@${name}`);
}

/** Split a body into text and mention segments so a renderer can style them. */
export type MentionSegment =
  | { kind: "text"; text: string }
  | { kind: "mention"; text: string; userId: string };

export function segmentMentions(body: string): MentionSegment[] {
  const segments: MentionSegment[] = [];
  let lastIndex = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) {
      segments.push({ kind: "text", text: body.slice(lastIndex, index) });
    }
    segments.push({ kind: "mention", text: match[1], userId: match[2] });
    lastIndex = index + match[0].length;
  }

  if (lastIndex < body.length) {
    segments.push({ kind: "text", text: body.slice(lastIndex) });
  }
  return segments;
}

/** Insert a mention into a body at the caret, replacing the `@query` typed so far. */
export function insertMention(
  body: string,
  caret: number,
  query: string,
  user: MentionCandidate,
): { body: string; caret: number } {
  const start = caret - query.length - 1; // include the "@"
  const token = `@[${user.name ?? user.email}](${user.id}) `;
  const next = body.slice(0, Math.max(0, start)) + token + body.slice(caret);
  return { body: next, caret: Math.max(0, start) + token.length };
}

/**
 * The partial `@query` immediately before the caret, or null when the caret
 * isn't in a mention. Stops at whitespace so an email address in the middle of
 * a sentence doesn't open the picker.
 */
export function activeMentionQuery(body: string, caret: number): string | null {
  const before = body.slice(0, caret);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;

  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;
  // Already a completed mention.
  if (query.startsWith("[")) return null;
  return query;
}
