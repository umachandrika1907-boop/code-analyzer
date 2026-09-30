import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
    time: new Date().toISOString(),
  });
});

// Run Python unit tests endpoint
app.get('/api/run-python-tests', (req: Request, res: Response) => {
  const testsPath = path.resolve(process.cwd(), 'code_change_impact_analyzer', 'tests');
  if (!fs.existsSync(testsPath)) {
    return res.status(404).json({
      error: 'Python tests directory not found yet.',
      passed: 0,
      total: 0,
      output: '',
    });
  }

  exec(
    'python3 -m unittest discover -s code_change_impact_analyzer/tests -v',
    { cwd: process.cwd(), timeout: 30000 },
    (error, stdout, stderr) => {
      const output = (stdout || '') + '\n' + (stderr || '');
      const isSuccess = !error || error.code === 0;
      res.json({
        success: isSuccess,
        output: output.trim(),
        exitCode: error ? error.code : 0,
      });
    }
  );
});

// Impact Analysis Endpoint using Gemini 3.8 Flash
app.post('/api/analyze', async (req: Request, res: Response) => {
  try {
    const { diffSummary, rawDiff, retrievedChunks, changedFiles, repoContext } = req.body;

    if (!rawDiff || !rawDiff.trim()) {
      return res.status(400).json({ error: 'Git diff cannot be empty.' });
    }

    if (!retrievedChunks || !Array.isArray(retrievedChunks) || retrievedChunks.length === 0) {
      return res.status(400).json({
        error: 'No repository context or retrieved chunks provided for RAG analysis.',
      });
    }

    const formattedChunks = retrievedChunks
      .map(
        (chunk: any, i: number) =>
          `[EVIDENCE CHUNK #${i + 1}]
File: ${chunk.file}
Component/Symbol: ${chunk.symbol || chunk.name || 'Module-level'}
Type: ${chunk.type || 'code'}
Lines: ${chunk.startLine}-${chunk.endLine}
Score/Relevance: ${chunk.score ? chunk.score.toFixed(3) : 'N/A'}
Code:
\`\`\`
${chunk.content}
\`\`\``
      )
      .join('\n\n');

    const systemInstruction = `You are a Senior Software Principal Engineer and Code Impact Analysis Expert.
Your task is to analyze a Git code change (diff) against the retrieved relevant repository code chunks.

CRITICAL RAG GROUNDING RULES:
1. NEVER invent files, functions, classes, dependencies, or APIs that do not exist in the supplied evidence.
2. NEVER claim a component is affected without pointing to verifiable evidence in the provided chunks or the diff itself.
3. Clearly distinguish:
   - "Confirmed dependency": Direct function call, class inheritance, import, route handler, or explicit unit test of changed code.
   - "Potential dependency": Indirect usage, shared state, or interface contract similarity with clear evidence.
4. If evidence is insufficient to confirm impact for a component, state: "Insufficient evidence to confirm impact."
5. Classify impact severity:
   - "HIGH": Direct breaking signature changes, modified core logic called by downstream services, payment/auth critical paths, tests failing without update.
   - "MEDIUM": Secondary callers, internal behavior changes that maintain interface contract, non-critical tests.
   - "LOW": Documentation updates, comments, optional parameter addition with default values, minor non-breaking dependencies.

Schema Requirement: Output valid JSON adhering strictly to the response schema.`;

    const prompt = `Analyze this code change and identify all affected parts of the software repository based ONLY on the supplied Git Diff and Retrieved Repository Chunks.

GIT DIFF:
\`\`\`diff
${rawDiff.slice(0, 15000)}
\`\`\`

CHANGED FILES & SUMMARY:
${diffSummary || JSON.stringify(changedFiles)}

RETRIEVED REPOSITORY CODE CHUNKS (RAG CONTEXT):
${formattedChunks.slice(0, 35000)}

REPOSITORY SUMMARY:
${repoContext ? JSON.stringify(repoContext) : 'Standard multi-file repository'}

Produce a thorough, evidence-grounded impact analysis. Cite exact file paths, component names, and code evidence.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Executive summary of the change and overall blast radius',
            },
            changed_files: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'List of files modified in the diff',
            },
            affected_components: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  file: { type: Type.STRING },
                  component: { type: Type.STRING },
                  component_type: { type: Type.STRING, description: 'function, class, module, route, middleware, test' },
                  impact_level: { type: Type.STRING, description: 'HIGH, MEDIUM, or LOW' },
                  reason: { type: Type.STRING },
                  evidence: { type: Type.STRING, description: 'Specific code snippet or call reference from retrieved chunks' },
                  line_range: { type: Type.STRING, description: 'e.g. 45-68' },
                  dependency_type: { type: Type.STRING, description: 'Caller, Callee, Inherits, Imports, Tests, or Route' },
                },
                required: ['file', 'component', 'component_type', 'impact_level', 'reason', 'evidence'],
              },
            },
            api_impact: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  endpoint: { type: Type.STRING },
                  method: { type: Type.STRING },
                  impact_level: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['endpoint', 'reason'],
              },
            },
            test_impact: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  test_file: { type: Type.STRING },
                  test_name: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  action_required: { type: Type.STRING },
                },
                required: ['test_file', 'reason'],
              },
            },
            documentation_impact: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  doc_file: { type: Type.STRING },
                  section: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ['doc_file', 'reason'],
              },
            },
            risks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  risk: { type: Type.STRING },
                  severity: { type: Type.STRING },
                  mitigation: { type: Type.STRING },
                },
                required: ['risk', 'severity', 'mitigation'],
              },
            },
            recommended_validation: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Actionable testing, verification, and deployment validation checklist',
            },
          },
          required: [
            'summary',
            'changed_files',
            'affected_components',
            'api_impact',
            'test_impact',
            'documentation_impact',
            'risks',
            'recommended_validation',
          ],
        },
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);

    return res.json({
      success: true,
      data: parsed,
      modelUsed: 'gemini-3.8-flash',
      analyzedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Impact analysis error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error during impact analysis',
    });
  }
});

// Setup Vite middleware in dev or serve dist in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Server] Code Change Impact Analyzer running on http://${HOST}:${PORT}`);
  });
}

startServer();
