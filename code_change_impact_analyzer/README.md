# 🔍 Code Change Impact Analyzer
> **AI-Powered Software Change Impact Analysis using Code Embeddings, RAG, and Gemini LLM**

[![Tests](https://img.shields.io/badge/tests-20%20passed-success)](./tests/test_cases.md)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue)](https://www.python.org/)
[![Model](https://img.shields.io/badge/gemini-3.8--flash-orange)](https://ai.google.dev/)
[![Embeddings](https://img.shields.io/badge/embeddings-SentenceTransformers%2FFAISS-purple)](https://github.com/facebookresearch/faiss)
[![UI](https://img.shields.io/badge/frontend-Streamlit%20%7C%20React%20SPA-red)](https://streamlit.io/)

---

## 1. Problem Statement
When developers modify code, push pull requests, or merge changes into shared repositories, identifying the full blast radius of downstream impacts is error-prone. A seemingly minor change to a function signature, parameter default, or data model can break downstream callers, invalidate integration tests, cause silent database anomalies, or desynchronize API documentation. Traditional grep and linting miss indirect dependencies and lack semantic comprehension of changes.

---

## 2. Objective
**Code Change Impact Analyzer** is an enterprise-grade AI system that takes a **Git diff + repository codebase** and autonomously maps the entire downstream impact surface:
- **Affected Modules & Files**
- **Affected Functions, Classes, & Methods**
- **Public & Internal API Endpoints**
- **Impacted Unit & Integration Tests**
- **Desynchronized Documentation**
- **Severity Classification (`HIGH`, `MEDIUM`, `LOW`)**
- **Verifiable Code Evidence with Exact Line Numbers**
- **Zero Hallucination Guarantee:** Grounding validation rejects any component or file not physically present in the repository.

---

## 3. Architecture & Data Flow

```text
User / Developer
       │
       ▼
Firebase Authentication (Google / Apple OAuth)
       │
       ▼
Upload Complete Repository (ZIP) + Git Diff (.patch / .diff)
       │
       ├─────────────────────────────────┐
       ▼                                 ▼
Repository Processing              Git Diff Parsing
 ├── .git/node_modules/venv filter  ├── Modified files
 ├── Multi-language AST/Regex       ├── Added/Deleted lines
 └── Semantic Code Chunker          └── Modified function symbols
       │                                 │
       ▼                                 │
Code Embeddings (Sentence-Transformers)  │
       │                                 │
       ▼                                 │
FAISS Vector Store                       │
       │                                 │
       └────────────────┬────────────────┘
                        ▼
           Targeted Code Retrieval (RAG)
           ├── Vector similarity search
           ├── Caller/Callee call graph boost
           └── Test suite reference ranking
                        │
                        ▼
         Gemini 3.8 Flash Impact Analysis
         ├── Structured JSON Schema enforcement
         ├── Strict Grounding Rules
         └── Severity assignment
                        │
                        ▼
         Evidence Grounding Validation
         ├── Rejects ungrounded/hallucinated files
         └── Verifies exact snippet line ranges
                        │
                        ▼
        Interactive Blast-Radius Report
        ├── High, Medium, Low Impact Breakdown
        ├── Expandable Code Evidence
        ├── API & Test Suite Matrix
        └── Export Markdown & JSON
```

---

## 4. Technologies Used
- **Frontend:** Streamlit 1.35+ (Python) and React SPA (TypeScript, Tailwind CSS, Lucide icons, Motion)
- **Backend:** Python 3.10+ and Express / Node.js
- **GenAI Model:** Google Gemini (`gemini-3.8-flash`) via official `@google/genai` and `google-genai` Python SDK
- **Embeddings & Vector Search:** Sentence-Transformers (`all-MiniLM-L6-v2`), FAISS Vector Database (`faiss-cpu`), and pure Python fallback vectorizer
- **Parsing:** Python AST, regex symbol extractors for JS, TS, Go, Java, C#, PHP, Ruby, SQL
- **Authentication:** Firebase Authentication with Google Login and Apple Login
- **Deployment:** AWS EC2, Nginx HTTP/2 SSL reverse proxy, systemd, Docker & Docker Compose

---

## 5. Installation & Setup

### Prerequisites
- Python 3.10 or higher
- Git
- Google Gemini API key

### 1. Clone Repository & Setup Virtual Environment
```bash
git clone https://github.com/your-org/code_change_impact_analyzer.git
cd code_change_impact_analyzer

python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials:
```ini
GEMINI_API_KEY=AIzaSy...
FIREBASE_API_KEY=...
FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
```

---

## 6. Running Locally

### Streamlit Application
```bash
streamlit run app.py --server.port 8501
```
Open [http://localhost:8501](http://localhost:8501) in your browser.

### Full-Stack Web Application (Node + React)
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 7. Running the Automated Test Suite

Run the full suite of **20 unit and integration tests**:
```bash
python3 -m unittest discover -s tests -v
```
All 20 test cases pass within ~0.02s:
```text
test_chunk_python_file (test_chunker.TestCodeChunker) ... ok
test_chunk_repository_dict (test_chunker.TestCodeChunker) ... ok
test_embedding_dimension_and_norm (test_embeddings.TestCodeEmbeddingEngine) ... ok
test_query_embedding (test_embeddings.TestCodeEmbeddingEngine) ... ok
test_empty_diff (test_git_analyzer.TestGitDiffAnalyzer) ... ok
test_multiple_file_change (test_git_analyzer.TestGitDiffAnalyzer) ... ok
test_single_function_change (test_git_analyzer.TestGitDiffAnalyzer) ... ok
test_api_route_impact_flagged (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_class_dependency_impact (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_empty_diff (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_function_dependency_high_impact (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_hallucination_filtering (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_single_function_change (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_test_dependency_detected (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_unrelated_code_not_flagged (test_impact_analyzer.TestImpactAnalyzer) ... ok
test_javascript_and_typescript_routes (test_parser.TestCodeParser) ... ok
test_python_class_and_methods (test_parser.TestCodeParser) ... ok
test_python_function_and_calls (test_parser.TestCodeParser) ... ok
test_unsupported_or_empty_file (test_parser.TestCodeParser) ... ok
test_caller_and_test_retrieval (test_retriever.TestCodeRetriever) ... ok
----------------------------------------------------------------------
Ran 20 tests in 0.016s
OK
```
Detailed test scenarios are documented in [`tests/test_cases.md`](./tests/test_cases.md).

---

## 8. AWS EC2 & HTTPS Production Deployment

### 1. Launch EC2 Instance
- **Instance Type:** `t3.large` or `c6i.large` (recommended for embeddings in memory)
- **OS:** Ubuntu 22.04 LTS or 24.04 LTS
- **Security Groups:** Open port 80 (HTTP), 443 (HTTPS), 22 (SSH)

### 2. Automated Provisioning Script
Run the automated installation script:
```bash
chmod +x deploy/aws_ec2_setup.sh
sudo ./deploy/aws_ec2_setup.sh
```

### 3. Setup SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d impact-analyzer.yourdomain.com
```

### 4. Manage Systemd Service
```bash
sudo systemctl status code_change_impact_analyzer
sudo systemctl restart code_change_impact_analyzer
```

---

## 9. RAG Grounding & Anti-Hallucination Constitution
To eliminate AI hallucinations, the system adheres to strict validation rules:
1. **Repository Membership Check:** Every file in the final impact report must exist in the parsed repository file tree. Fictitious files are systematically discarded.
2. **Code Evidence Required:** An impact claim is never made without referencing a retrieved code block with line numbers.
3. **Tri-State Classification:** Components are labeled as *Confirmed dependency*, *Potential dependency*, or *Insufficient evidence to confirm impact*.

---

## 10. Limitations & Future Scope
- **Current Limitations:** Dynamic meta-programming (e.g. `getattr(mod, dynamic_name)`) cannot be statically determined without runtime tracing.
- **Future Scope:**
  - GitHub Actions CI/CD bot that automatically posts blast-radius tables onto incoming PRs.
  - LSP (Language Server Protocol) deep semantic call-graph cross-referencing.
  - Automatic test generation for uncovered affected components.
