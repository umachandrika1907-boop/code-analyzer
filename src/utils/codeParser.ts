import JSZip from 'jszip';
import { CodeChunkItem } from '../types';

export const SUPPORTED_EXTENSIONS = [
  '.py', '.js', '.jsx', '.ts', '.tsx',
  '.java', '.c', '.cpp', '.h', '.hpp',
  '.cs', '.go', '.php', '.rb', '.sql',
  '.md', '.json', '.yaml', '.yml'
];

export const IGNORED_PATHS = [
  '.git/', 'node_modules/', 'venv/', '.venv/',
  '__pycache__/', 'dist/', 'build/', '.next/',
  'target/', 'vendor/', '.idea/', '.vscode/'
];

export async function extractRepositoryZip(file: File): Promise<Record<string, string>> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(file);
  const files: Record<string, string> = {};

  for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
    if (zipEntry.dir) continue;
    if (IGNORED_PATHS.some(ignored => relativePath.includes(ignored))) continue;

    const lower = relativePath.toLowerCase();
    const isSupported = SUPPORTED_EXTENSIONS.some(ext => lower.endsWith(ext));
    if (!isSupported) continue;

    try {
      const content = await zipEntry.async('string');
      files[relativePath] = content;
    } catch {
      // Skip unreadable files
    }
  }

  return files;
}

export function parseGitDiff(diffText: string): {
  changedFiles: string[];
  modifiedSymbols: string[];
  addedLinesCount: number;
  deletedLinesCount: number;
  summary: string;
} {
  const lines = diffText.split('\n');
  const changedFiles: string[] = [];
  const modifiedSymbols: string[] = [];
  let added = 0;
  let deleted = 0;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*?) b\/(.*?)$/);
      if (match && match[2] && !changedFiles.includes(match[2])) {
        changedFiles.push(match[2]);
      }
    } else if (line.startsWith('@@')) {
      // Check hunk header for function definition
      const funcMatch = line.match(/(?:def|function|class|fn|func)\s+([a-zA-Z0-9_]+)/);
      if (funcMatch && !modifiedSymbols.includes(funcMatch[1])) {
        modifiedSymbols.push(funcMatch[1]);
      }
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
      const m = line.match(/(?:def|function|class|fn|func)\s+([a-zA-Z0-9_]+)/);
      if (m && !modifiedSymbols.includes(m[1])) {
        modifiedSymbols.push(m[1]);
      }
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deleted++;
      const m = line.match(/(?:def|function|class|fn|func)\s+([a-zA-Z0-9_]+)/);
      if (m && !modifiedSymbols.includes(m[1])) {
        modifiedSymbols.push(m[1]);
      }
    }
  }

  const summary = `Found ${changedFiles.length} changed files (+${added}/-${deleted} lines). Modified symbols: ${
    modifiedSymbols.length ? modifiedSymbols.join(', ') : 'none detected'
  }`;

  return {
    changedFiles,
    modifiedSymbols,
    addedLinesCount: added,
    deletedLinesCount: deleted,
    summary
  };
}

export function chunkRepositoryFiles(files: Record<string, string>): CodeChunkItem[] {
  const chunks: CodeChunkItem[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    const lines = content.split('\n');
    const funcRegex = /(?:def|class|function|export function|async function)\s+([a-zA-Z0-9_]+)/g;

    let match;
    const foundIndices: { name: string; line: number; type: string }[] = [];

    lines.forEach((line, idx) => {
      const m = line.match(/(?:def|class|function|export function|async function)\s+([a-zA-Z0-9_]+)/);
      if (m) {
        foundIndices.push({
          name: m[1],
          line: idx + 1,
          type: line.includes('class') ? 'class' : 'function'
        });
      }
      if (line.includes('@router.') || line.includes('app.get(') || line.includes('app.post(')) {
        foundIndices.push({
          name: `route_L${idx + 1}`,
          line: idx + 1,
          type: 'api_route'
        });
      }
    });

    if (foundIndices.length > 0) {
      for (let i = 0; i < foundIndices.length; i++) {
        const cur = foundIndices[i];
        const next = foundIndices[i + 1];
        const start = cur.line;
        const end = next ? Math.max(start + 1, next.line - 1) : Math.min(lines.length, start + 40);
        const snippet = lines.slice(start - 1, end).join('\n');

        // Extract call names
        const calls: string[] = [];
        const words = snippet.match(/[a-zA-Z0-9_]+(?=\()/g) || [];
        for (const w of words) {
          if (w !== cur.name && !['sum', 'print', 'len', 'range', 'min', 'max'].includes(w)) {
            if (!calls.includes(w)) calls.push(w);
          }
        }

        chunks.push({
          file: filePath,
          symbol: cur.name,
          type: cur.type,
          startLine: start,
          endLine: end,
          content: snippet,
          calls
        });
      }
    } else {
      // Chunk by 50 lines
      for (let i = 0; i < lines.length; i += 45) {
        const end = Math.min(lines.length, i + 50);
        const snippet = lines.slice(i, end).join('\n');
        chunks.push({
          file: filePath,
          symbol: `L${i + 1}-L${end}`,
          type: filePath.endsWith('.md') ? 'documentation' : 'module',
          startLine: i + 1,
          endLine: end,
          content: snippet,
          calls: []
        });
      }
    }
  }

  return chunks;
}

export function retrieveRelevantChunks(
  chunks: CodeChunkItem[],
  modifiedSymbols: string[],
  changedFiles: string[],
  diffText: string,
  topK: number = 15
): CodeChunkItem[] {
  const scored = chunks.map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();

    // Direct symbol caller boost
    for (const sym of modifiedSymbols) {
      const symLower = sym.toLowerCase();
      if (chunk.calls.includes(sym)) {
        score += 10.0;
      } else if (contentLower.includes(symLower)) {
        score += 7.0;
      }
    }

    // Changed file boost
    if (changedFiles.includes(chunk.file)) {
      score += 4.0;
    }

    // Test file matching changed symbols
    if (chunk.file.toLowerCase().includes('test') || chunk.type === 'test') {
      for (const sym of modifiedSymbols) {
        if (contentLower.includes(sym.toLowerCase())) {
          score += 8.5;
        }
      }
    }

    // API route calling changed symbol
    if (chunk.type === 'api_route') {
      for (const sym of modifiedSymbols) {
        if (contentLower.includes(sym.toLowerCase())) {
          score += 8.0;
        }
      }
    }

    // Diff word token overlap
    const diffTokens = (diffText.toLowerCase().match(/[a-zA-Z0-9_]{3,}/g) || []).slice(0, 100);
    let tokenMatches = 0;
    for (const tok of diffTokens) {
      if (contentLower.includes(tok)) tokenMatches++;
    }
    score += Math.min(5.0, tokenMatches * 0.1);

    return { ...chunk, score };
  });

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scored.slice(0, topK);
}
