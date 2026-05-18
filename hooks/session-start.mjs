#!/usr/bin/env node
/**
 * grāmatr SessionStart hook — command type
 *
 * Reads cwd, session_id, and source from env (Claude Code passes hook
 * template vars as environment variables to command-type hooks), then
 * calls session_bootstrap with the git remote so the server can resolve
 * the project unambiguously instead of falling back to a dir-hash alias
 * that differs across machines and directories.
 *
 * Requirements: Node 22+ (native fetch). No external dependencies.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const cwd = process.env.cwd ?? process.cwd();
const clientSessionId = process.env.session_id ?? '';
const source = process.env.source ?? '';

// Read ~/.gramatr.json for token + MCP URL
let token = '';
let mcpUrl = 'https://api.gramatr.com/mcp';

try {
  const gramatrJson = join(homedir(), '.gramatr.json');
  if (existsSync(gramatrJson)) {
    const cfg = JSON.parse(readFileSync(gramatrJson, 'utf8'));
    token = cfg.token ?? '';
    if (cfg.mcpUrl) mcpUrl = cfg.mcpUrl;
  }
} catch {
  // proceed without token — server will reject if auth is required
}

// Check for .gramatr/project.json in the current repo
let projectId = undefined;
try {
  const projectJsonPath = join(cwd, '.gramatr', 'project.json');
  if (existsSync(projectJsonPath)) {
    const proj = JSON.parse(readFileSync(projectJsonPath, 'utf8'));
    if (proj.project_id) projectId = proj.project_id;
  }
} catch {
  // no project.json — server will resolve from git_remote or cwd
}

// Get git remote (fallback: empty string)
let gitRemote = '';
try {
  gitRemote = execFileSync('git', ['-C', cwd, 'remote', 'get-url', 'origin'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 3000,
  }).trim();
} catch {
  // not a git repo or no origin — that's fine
}

// Build session_bootstrap arguments
const args = {
  cwd,
  git_remote: gitRemote,
  client_session_id: clientSessionId,
  client_type: 'claude-code',
  source,
  hook_response: true,
};
if (projectId) args.project_id = projectId;

// POST to MCP endpoint
const body = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'session_bootstrap',
    arguments: args,
  },
});

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};
if (token) headers['Authorization'] = `Bearer ${token}`;

try {
  const res = await fetch(mcpUrl, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(10_000),
  });

  if (res.ok) {
    const data = await res.json();
    const text = data?.result?.content?.[0]?.text ?? '';
    if (text) process.stdout.write(text);
  }
  // non-2xx: silently exit — hook failure must not block the session
} catch {
  // network error or timeout — exit cleanly
}
