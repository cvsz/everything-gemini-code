/**
 * Upstream drift engine: pure functions used by the upstream-drift Action.
 *
 * `scripts/upstream/check-upstream-drift.js` calls these helpers and drives
 * the `gh` CLI. Functions here have no I/O so they can be unit-tested in
 * isolation against `tests/lib/upstream-drift.test.js`.
 *
 * State of record:
 *   - Human:    upstream/README.md (Upstream baseline section)
 *   - Machine:  upstream/.upstream-sync.json
 *
 * Schema for the JSON state file:
 *   {
 *     "upstream":      "owner/repo",
 *     "lastSyncedSha": "<40-char SHA>",
 *     "lastSyncedAt":  "<YYYY-MM-DD or ISO 8601>",
 *     "notes":         "optional free text"
 *   }
 */

const SHA_RE = /^[0-9a-f]{40}$/;
const REPO_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const COMMIT_BODY_LIMIT = 50;

/**
 * Parse and validate the contents of `upstream/.upstream-sync.json`.
 *
 * Throws on any structural problem — the workflow should fail fast rather
 * than silently treat a malformed state file as "no drift".
 *
 * @param {string} jsonString
 * @returns {{ upstream: string, lastSyncedSha: string, lastSyncedAt: string, notes?: string }}
 */
function parseUpstreamState(jsonString) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    throw new Error(`upstream-sync state is not valid JSON: ${err.message}`, { cause: err });
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('upstream-sync state must be a JSON object');
  }

  const { upstream, lastSyncedSha, lastSyncedAt, notes } = parsed;

  if (typeof upstream !== 'string' || !REPO_RE.test(upstream)) {
    throw new Error(`upstream must be a "owner/repo" string (got: ${JSON.stringify(upstream)})`);
  }

  if (typeof lastSyncedSha !== 'string' || !SHA_RE.test(lastSyncedSha)) {
    throw new Error(`lastSyncedSha must be a 40-char hex string (got: ${JSON.stringify(lastSyncedSha)})`);
  }

  if (typeof lastSyncedAt !== 'string' || lastSyncedAt.length === 0) {
    throw new Error(`lastSyncedAt must be a non-empty string (got: ${JSON.stringify(lastSyncedAt)})`);
  }

  if (notes !== undefined && typeof notes !== 'string') {
    throw new Error(`notes, when present, must be a string (got: ${typeof notes})`);
  }

  return { upstream, lastSyncedSha, lastSyncedAt, notes };
}

/**
 * Short SHA (first 7 chars) for display in titles and URLs.
 *
 * @param {string} sha
 * @returns {string}
 */
function shortSha(sha) {
  if (typeof sha !== 'string') return '';
  return sha.slice(0, 7);
}

/**
 * Title shown on the rolling tracking issue. Recomputed every run so the
 * title itself encodes the current delta count.
 *
 * @param {{ count: number, lastSyncedShaShort: string }} args
 * @returns {string}
 */
function formatIssueTitle({ count, lastSyncedShaShort }) {
  if (typeof count !== 'number' || count < 0 || !Number.isInteger(count)) {
    throw new Error(`formatIssueTitle: count must be a non-negative integer (got: ${count})`);
  }
  if (typeof lastSyncedShaShort !== 'string' || lastSyncedShaShort.length === 0) {
    throw new Error('formatIssueTitle: lastSyncedShaShort must be a non-empty string');
  }
  const noun = count === 1 ? 'commit' : 'commits';
  return `Upstream sync: ${count} new ${noun} in ECC since ${lastSyncedShaShort}`;
}

/**
 * Body for the rolling tracking issue. Truncates the commit list at
 * COMMIT_BODY_LIMIT entries and links to the compare URL for the full diff.
 *
 * `totalCount` is the true number of commits upstream is ahead by
 * (i.e. `compare.ahead_by` from the GitHub API). `commits.length`
 * can be smaller because the compare endpoint caps responses at 250
 * commits regardless of the true delta. Using `commits.length` in
 * the intro would silently understate the drift when the API caps
 * (e.g. show "250 commits ahead" when the truth is 1521).
 *
 * @param {{
 *   commits: Array<{ sha: string, author: string, message: string }>,
 *   lastSyncedSha: string,
 *   upstreamHeadSha: string,
 *   upstreamRepo: string,
 *   totalCount: number,
 * }} args
 * @returns {string}
 */
function formatIssueBody({ commits, lastSyncedSha, upstreamHeadSha, upstreamRepo, totalCount }) {
  if (!Array.isArray(commits)) {
    throw new Error('formatIssueBody: commits must be an array');
  }
  if (!REPO_RE.test(upstreamRepo)) {
    throw new Error(`formatIssueBody: upstreamRepo must be "owner/repo" (got: ${upstreamRepo})`);
  }
  if (typeof totalCount !== 'number' || totalCount < 0 || !Number.isInteger(totalCount)) {
    throw new Error(`formatIssueBody: totalCount must be a non-negative integer (got: ${totalCount})`);
  }

  const compareUrl = `https://github.com/${upstreamRepo}/compare/${lastSyncedSha}...${upstreamHeadSha}`;
  const lines = [];

  lines.push(`Upstream \`${upstreamRepo}\` has **${totalCount}** commit(s) ahead of the recorded baseline.`);
  lines.push('');
  lines.push(`- **Baseline**: \`${shortSha(lastSyncedSha)}\` (recorded in [\`upstream/.upstream-sync.json\`](../blob/main/upstream/.upstream-sync.json))`);
  lines.push(`- **Upstream HEAD**: \`${shortSha(upstreamHeadSha)}\``);
  lines.push(`- **Full diff**: ${compareUrl}`);
  lines.push('');

  if (totalCount === 0) {
    lines.push('_No commits to show._');
    lines.push('');
  } else {
    const visible = commits.slice(0, COMMIT_BODY_LIMIT);
    const omitted = totalCount - visible.length;

    lines.push('<details>');
    if (omitted === 0) {
      lines.push(`<summary>Commits (${totalCount})</summary>`);
    } else {
      lines.push(`<summary>Commits (showing first ${visible.length} of ${totalCount})</summary>`);
    }
    lines.push('');
    for (const c of visible) {
      const firstLine = (c.message || '').split('\n')[0].trim();
      lines.push(`- \`${shortSha(c.sha)}\` ${c.author ? `(@${c.author}) ` : ''}${firstLine}`);
    }
    if (omitted > 0) {
      lines.push(`- _… and ${omitted} more. See the [full diff](${compareUrl})._`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('To close this issue, advance the baseline by following the procedure in [`upstream/README.md`](../blob/main/upstream/README.md#recording-a-sync). This issue is maintained automatically by `.github/workflows/upstream-drift.yml`.');

  return lines.join('\n');
}

/**
 * Compare URL for the GitHub UI. Convenience export — also used by the
 * entry script for the Phase 1 log output.
 *
 * @param {string} upstreamRepo
 * @param {string} baseSha
 * @param {string} headSha
 * @returns {string}
 */
function compareUrl(upstreamRepo, baseSha, headSha) {
  if (!REPO_RE.test(upstreamRepo)) {
    throw new Error(`compareUrl: upstreamRepo must be "owner/repo" (got: ${upstreamRepo})`);
  }
  return `https://github.com/${upstreamRepo}/compare/${baseSha}...${headSha}`;
}

/**
 * Translate the compare-API `commits` array into the simplified shape
 * `formatIssueBody` expects: `{ sha, author, message }`.
 *
 * Author is ONLY populated from `c.author.login` (a real GitHub
 * handle). Raw `commit.author.name` is intentionally not used as a
 * fallback — the issue body prefixes `@`, so a raw name like
 * "Jane Doe" would render as a misleading pseudo-mention `(@Jane Doe)`.
 * When there is no login, `author` stays empty and `formatIssueBody`
 * skips the `(@...)` prefix entirely.
 *
 * @param {object} compareResponse - the parsed `gh api .../compare/...` body
 * @returns {Array<{ sha: string, author: string, message: string }>}
 */
function extractCommitsForBody(compareResponse) {
  if (!compareResponse || !Array.isArray(compareResponse.commits)) return [];
  return compareResponse.commits.map((c) => ({
    sha: typeof c.sha === 'string' ? c.sha : '',
    author: (c.author && typeof c.author.login === 'string') ? c.author.login : '',
    message: (c.commit && typeof c.commit.message === 'string') ? c.commit.message : '',
  }));
}

/**
 * Given the result of `gh issue list --label <upstream-sync> --state open
 * --json number,title,createdAt`, pick the issue we should treat as the
 * rolling tracker.
 *
 * - 0 open → null (caller will create)
 * - 1 open → that one
 * - 2+ open → defensive: pick the most recently created so we update a
 *   live discussion rather than an abandoned one. This branch should
 *   not occur in normal operation but the script handles it instead of
 *   crashing.
 *
 * @param {Array<{ number: number, title: string, createdAt: string }>} issues
 * @returns {{ number: number, title: string, createdAt: string }|null}
 */
function pickActiveIssue(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  if (issues.length === 1) return issues[0];
  return issues
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

/**
 * Decide what to do this run based on the current delta and whether a
 * rolling tracking issue is already open.
 *
 *   delta=0, no issue   → 'noop'   (already in sync, nothing to manage)
 *   delta=0, open issue → 'close'  (sync happened, close the tracker)
 *   delta>0, no issue   → 'create' (new drift, open the tracker)
 *   delta>0, open issue → 'update' (drift continues, update the tracker)
 *
 * @param {{ deltaCount: number, openIssue: object|null }} args
 * @returns {'noop'|'close'|'create'|'update'}
 */
function decideAction({ deltaCount, openIssue }) {
  if (typeof deltaCount !== 'number' || deltaCount < 0 || !Number.isInteger(deltaCount)) {
    throw new Error(`decideAction: deltaCount must be a non-negative integer (got: ${deltaCount})`);
  }
  if (deltaCount === 0) {
    return openIssue ? 'close' : 'noop';
  }
  return openIssue ? 'update' : 'create';
}

module.exports = {
  COMMIT_BODY_LIMIT,
  parseUpstreamState,
  shortSha,
  formatIssueTitle,
  formatIssueBody,
  compareUrl,
  extractCommitsForBody,
  pickActiveIssue,
  decideAction,
};
