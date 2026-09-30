# 🔍 Code Change Impact Analyzer
> **AI-Powered Software Change Impact Analysis using Code Embeddings, RAG, and Gemini LLM**

This repository contains the complete production-ready **Code Change Impact Analyzer**:
1. **Interactive Full-Stack Web Application (Port 3000):** Built with React 19, TypeScript, Express, Tailwind CSS, and Gemini 3.8 Flash (`gemini-3.8-flash`) via the modern `@google/genai` SDK.
2. **Python & Streamlit Backend (`code_change_impact_analyzer/`):** Streamlit application, AST code parser, semantic chunker, SentenceTransformers + FAISS code retriever, strict grounding validator, and 20 automated unit tests.
3. **Production Deployment Suite:** AWS EC2 setup scripts, Nginx reverse proxy configuration, systemd service, Dockerfile, and Docker Compose.

---

## Quick Navigation
- **Python App & Streamlit:** [`code_change_impact_analyzer/app.py`](./code_change_impact_analyzer/app.py)
- **Comprehensive Documentation:** [`code_change_impact_analyzer/README.md`](./code_change_impact_analyzer/README.md)
- **Automated Test Matrix (20 Tests):** [`code_change_impact_analyzer/tests/test_cases.md`](./code_change_impact_analyzer/tests/test_cases.md)
- **AWS EC2 & Nginx Deployment:** [`code_change_impact_analyzer/deploy/`](./code_change_impact_analyzer/deploy/)
- **Core Engine Modules:** [`code_change_impact_analyzer/core/`](./code_change_impact_analyzer/core/)
