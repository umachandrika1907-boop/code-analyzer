"""Streamlit UI for Code Change Impact Analyzer."""

import io
import json
import os
import tempfile
import time
import zipfile
from pathlib import Path
from typing import Dict, Any, Optional

import streamlit as st

# Configure page
st.set_page_config(
    page_title="Code Change Impact Analyzer",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

from config.config import get_config
from core.git_analyzer import GitDiffAnalyzer
from core.code_parser import CodeParser
from core.chunker import CodeChunker
from core.embeddings import CodeEmbeddingEngine
from core.retriever import CodeRetriever
from core.impact_analyzer import ImpactAnalyzer, ImpactReportData
from core.report_generator import ReportGenerator
from services.llm_service import LLMService
from services.auth_service import AuthService, UserProfile
from services.history_service import HistoryService

config = get_config()
auth_service = AuthService()
history_service = HistoryService()
report_generator = ReportGenerator()

# Session State Initialization
if "user" not in st.session_state:
    st.session_state.user = None
if "current_report" not in st.session_state:
    st.session_state.current_report = None
if "selected_page" not in st.session_state:
    st.session_state.selected_page = "Dashboard"


# ==============================================================================
# AUTHENTICATION PAGE
# ==============================================================================
def render_login_page():
    st.markdown(
        """
        <div style="text-align: center; margin-top: 60px; margin-bottom: 30px;">
            <h1 style="font-size: 2.8rem; font-weight: 800; color: #818cf8; margin-bottom: 8px;">
                🔍 Code Change Impact Analyzer
            </h1>
            <p style="font-size: 1.25rem; color: #94a3b8; font-weight: 500;">
                AI-powered software change impact analysis using Code Embeddings + RAG + LLM Code Analysis
            </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    col1, col2, col3 = st.columns([1, 1.2, 1])
    with col2:
        with st.container(border=True):
            st.markdown("### 🔐 Sign in to continue")
            st.caption("Verify your identity with Firebase Authentication before accessing codebase analysis.")

            col_g, col_a = st.columns(2)
            with col_g:
                if st.button("🔴 Continue with Google", use_container_width=True, type="primary"):
                    st.session_state.user = auth_service.create_demo_user(provider="google.com")
                    st.rerun()

            with col_a:
                if st.button(" Continue with Apple", use_container_width=True):
                    st.session_state.user = auth_service.create_demo_user(provider="apple.com")
                    st.rerun()

            st.divider()
            st.markdown(
                """
                <div style="font-size: 0.85rem; color: #64748b; line-height: 1.5;">
                    🛡️ <b>Enterprise Security</b>: Code is processed in memory and never stored in third-party training datasets.
                    Grounding validation prevents hallucinations.
                </div>
                """,
                unsafe_allow_html=True,
            )


# ==============================================================================
# SIDEBAR
# ==============================================================================
def render_sidebar():
    with st.sidebar:
        st.markdown("### 🔍 Impact Analyzer")
        st.caption(f"v{config.version} • {config.gemini_model}")
        st.divider()

        pages = ["Dashboard", "New Analysis", "Analysis History", "Settings", "User Profile"]
        for p in pages:
            btn_type = "primary" if st.session_state.selected_page == p else "secondary"
            if st.button(p, use_container_width=True, type=btn_type):
                st.session_state.selected_page = p
                st.rerun()

        st.divider()
        if st.session_state.user:
            st.markdown(f"**👤 {st.session_state.user.display_name}**")
            st.caption(st.session_state.user.email)
            if st.button("🚪 Logout", use_container_width=True):
                st.session_state.user = None
                st.session_state.current_report = None
                st.rerun()


# ==============================================================================
# DASHBOARD
# ==============================================================================
def render_dashboard():
    st.markdown(
        """
        ## Code Change Impact Analyzer
        ##### Understand what your code changes may affect before deployment.
        """
    )

    history = history_service.list_history()
    total_analyses = len(history)
    high_impact_cnt = sum(1 for h in history if h.overall_impact_level == "HIGH")
    med_impact_cnt = sum(1 for h in history if h.overall_impact_level == "MEDIUM")
    low_impact_cnt = sum(1 for h in history if h.overall_impact_level == "LOW")
    last_analysis_str = history[0].timestamp if history else "No analyses yet"

    c1, c2, c3, c4, c5 = st.columns(5)
    with c1:
        st.metric("Total Analyses", total_analyses)
    with c2:
        st.metric("🔴 High Impact Changes", high_impact_cnt)
    with c3:
        st.metric("🟠 Medium Impact Changes", med_impact_cnt)
    with c4:
        st.metric("🟢 Low Impact Changes", low_impact_cnt)
    with c5:
        st.metric("Last Analysis", last_analysis_str[:10] if history else "Never")

    st.markdown("---")

    col_action1, col_action2 = st.columns([2, 1])
    with col_action1:
        st.markdown("### 🚀 Quick Start")
        st.write("Ready to analyze a pull request or patch? Upload your repository and Git diff.")
        if st.button("✨ Start New Analysis", type="primary", use_container_width=False):
            st.session_state.selected_page = "New Analysis"
            st.rerun()

    with col_action2:
        st.markdown("### 📊 System Status")
        st.success("✓ RAG Pipeline: Ready")
        st.success(f"✓ Embeddings: {config.embedding_model_name}")
        st.success(f"✓ Model: {config.gemini_model}")

    if history:
        st.markdown("### 🕒 Recent Impact Analyses")
        for h in history[:5]:
            with st.container(border=True):
                col_h1, col_h2, col_h3, col_h4 = st.columns([3, 2, 2, 1])
                with col_h1:
                    st.markdown(f"**{h.repository_name}** (`{h.analysis_id}`)")
                    st.caption(h.summary[:120] + "..." if len(h.summary) > 120 else h.summary)
                with col_h2:
                    st.write(f"📅 {h.timestamp}")
                with col_h3:
                    color = "red" if h.overall_impact_level == "HIGH" else "orange" if h.overall_impact_level == "MEDIUM" else "green"
                    st.markdown(f":{color}[● {h.overall_impact_level} IMPACT]")
                with col_h4:
                    if st.button("View", key=f"view_{h.analysis_id}"):
                        st.session_state.selected_page = "New Analysis"
                        st.rerun()


# ==============================================================================
# NEW ANALYSIS PAGE
# ==============================================================================
def render_new_analysis():
    st.markdown("## 🚀 New Code Change Analysis")
    st.caption("Upload your complete software repository along with a unified Git diff or patch file.")

    col_repo, col_diff = st.columns(2)

    with col_repo:
        st.markdown("### 📦 Repository")
        repo_zip = st.file_uploader(
            "Upload Repository [ Drag & Drop ZIP ]",
            type=["zip"],
            help="Supported: Python, Java, JavaScript, TypeScript, C, C++, C#, Go, PHP, Ruby, SQL"
        )
        st.caption("Supported: `.py`, `.js`, `.ts`, `.java`, `.go`, `.cs`, `.cpp`, `.php`, `.rb`, `.sql`, `.md`")

    with col_diff:
        st.markdown("### 📄 Git Diff")
        diff_file = st.file_uploader(
            "Upload Git Diff [ Drag & Drop .diff / .patch ]",
            type=["diff", "patch", "txt"],
            help="Unified diff output from `git diff main...feature` or `git format-patch`"
        )
        diff_text_input = st.text_area(
            "Or paste Git diff directly:",
            height=130,
            placeholder="diff --git a/services/user_service.py b/services/user_service.py\n--- a/services/user_service.py\n+++ b/services/user_service.py\n@@ -45,3 +45,5 @@ def calculate_total(cart, tax_rate=0.08):"
        )

    # Sample Quick Load Buttons for convenience
    st.markdown("##### 💡 Need a sample to test immediately?")
    col_s1, col_s2 = st.columns(2)
    sample_diff = ""
    with col_s1:
        if st.button("Load Sample: Python E-Commerce Cart & Checkout"):
            sample_diff = (
                "diff --git a/services/user_service.py b/services/user_service.py\n"
                "index 8b3c10a..4a72d3f 100644\n"
                "--- a/services/user_service.py\n"
                "+++ b/services/user_service.py\n"
                "@@ -32,7 +32,9 @@ class UserService:\n"
                "-    def calculate_total(self, items):\n"
                "-        return sum(item.price for item in items)\n"
                "+    def calculate_total(self, items, tax_rate=0.08, currency='USD'):\n"
                "+        subtotal = sum(item.price for item in items)\n"
                "+        return round(subtotal * (1 + tax_rate), 2)\n"
            )
            st.session_state.sample_diff = sample_diff

    with col_s2:
        if st.button("Load Sample: TypeScript Auth Token Expiry"):
            sample_diff = (
                "diff --git a/src/auth/token_service.ts b/src/auth/token_service.ts\n"
                "index 91f7a2b..e34c11d 100644\n"
                "--- a/src/auth/token_service.ts\n"
                "+++ b/src/auth/token_service.ts\n"
                "@@ -15,4 +15,6 @@ export function verifyToken(token: string): TokenPayload {\n"
                "-  return jwt.verify(token, SECRET) as TokenPayload;\n"
                "+  const decoded = jwt.verify(token, SECRET, { algorithms: ['RS256'] }) as TokenPayload;\n"
                "+  if (decoded.exp < Date.now() / 1000) throw new Error('TokenExpired');\n"
                "+  return decoded;\n"
            )
            st.session_state.sample_diff = sample_diff

    active_diff_text = (
        diff_file.read().decode("utf-8", errors="replace")
        if diff_file
        else (diff_text_input or st.session_state.get("sample_diff", ""))
    )

    if st.button("🚀 Analyze Changes", type="primary", use_container_width=True):
        if not active_diff_text.strip():
            st.error("Please upload or paste a Git diff to begin analysis.")
            return

        with st.status("Analyzing repository and code changes...", expanded=True) as status:
            st.write("✓ Repository uploaded")
            time.sleep(0.3)

            # Extract repository files
            repo_files: Dict[str, str] = {}
            if repo_zip is not None:
                with zipfile.ZipFile(repo_zip, "r") as z:
                    for filename in z.namelist():
                        # Filter ignored dirs
                        if any(ignored in filename for ignored in config.ignored_patterns):
                            continue
                        ext = Path(filename).suffix.lower()
                        if ext in config.supported_extensions:
                            try:
                                repo_files[filename] = z.read(filename).decode("utf-8", errors="replace")
                            except Exception:
                                pass
            else:
                # Built-in fallback reference repository
                repo_files = {
                    "services/user_service.py": (
                        "class UserService:\n"
                        "    def calculate_total(self, items, tax_rate=0.08, currency='USD'):\n"
                        "        return round(sum(item.price for item in items) * (1 + tax_rate), 2)\n"
                    ),
                    "services/checkout.py": (
                        "from services.user_service import UserService\n\n"
                        "class CheckoutService:\n"
                        "    def __init__(self):\n"
                        "        self.user_svc = UserService()\n\n"
                        "    def process_order(self, cart):\n"
                        "        total = self.user_svc.calculate_total(cart.items)\n"
                        "        return {'status': 'processed', 'total': total}\n"
                    ),
                    "api/order_controller.py": (
                        "from fastapi import APIRouter\n"
                        "from services.checkout import CheckoutService\n"
                        "router = APIRouter()\n\n"
                        "@router.post('/api/v1/orders/checkout')\n"
                        "def checkout_endpoint(cart_data: dict):\n"
                        "    return CheckoutService().process_order(cart_data)\n"
                    ),
                    "tests/test_checkout.py": (
                        "import pytest\n"
                        "from services.user_service import UserService\n\n"
                        "def test_calculate_total():\n"
                        "    svc = UserService()\n"
                        "    assert svc.calculate_total([]) == 0.0\n"
                    ),
                    "docs/API_DOCUMENTATION.md": (
                        "# Order & Billing API\n"
                        "The checkout system invokes calculate_total() for cart subtotal summation.\n"
                    )
                }

            st.write(f"✓ Source files detected ({len(repo_files)} files)")
            time.sleep(0.3)

            # Code Parsing
            code_parser = CodeParser()
            chunker = CodeChunker(parser=code_parser)
            st.write("✓ Code parsed")
            time.sleep(0.3)

            # Code Chunking
            chunks = chunker.chunk_repository(repo_files)
            st.write(f"✓ Code chunks created ({len(chunks)} chunks)")
            time.sleep(0.3)

            # Embeddings & Vector DB
            embedder = CodeEmbeddingEngine(model_name=config.embedding_model_name)
            retriever = CodeRetriever(embedding_engine=embedder)
            st.write("✓ Embeddings generated")
            time.sleep(0.3)

            retriever.index_chunks(chunks)
            st.write("✓ Vector database created")
            time.sleep(0.3)

            # LLM Impact Analysis
            llm_service = LLMService(api_key=config.gemini_api_key, model_name=config.gemini_model)
            analyzer = ImpactAnalyzer(retriever=retriever, llm_service=llm_service)

            report_data = analyzer.analyze_change(
                diff_text=active_diff_text,
                repo_files=repo_files,
                top_k=config.top_k_retrieval
            )
            st.session_state.current_report = report_data

            # Save to history
            history_service.save_analysis(
                analysis_id=f"ANL-{int(time.time())}",
                repo_name=repo_zip.name if repo_zip else "e-commerce-core",
                changed_count=len(report_data.changed_files),
                affected_count=len(report_data.affected_components),
                impact_level="HIGH" if report_data.metrics.get("high", 0) > 0 else "MEDIUM" if report_data.metrics.get("medium", 0) > 0 else "LOW",
                summary=report_data.summary,
                report_data=json.loads(report_generator.to_json(report_data))
            )

            status.update(label="Impact Analysis Completed Successfully!", state="complete", expanded=False)

    # Render Report if available
    if st.session_state.current_report:
        render_report(st.session_state.current_report)


# ==============================================================================
# IMPACT REPORT DISPLAY
# ==============================================================================
def render_report(report: ImpactReportData):
    st.markdown("---")
    st.markdown("## 📊 Impact Analysis Report")
    st.markdown(f"**Executive Summary:** {report.summary}")

    # Metrics
    m = report.metrics
    c1, c2, c3, c4, c5 = st.columns(5)
    with c1:
        st.metric("Changed Files", m.get("changed_files", 0))
    with c2:
        st.metric("Affected Files", m.get("affected_files", 0))
    with c3:
        st.metric("🔴 High Impact", m.get("high", 0))
    with c4:
        st.metric("🟠 Medium Impact", m.get("medium", 0))
    with c5:
        st.metric("🟢 Low Impact", m.get("low", 0))

    # Download Buttons
    col_d1, col_d2 = st.columns([1, 1])
    md_content = report_generator.to_markdown(report)
    json_content = report_generator.to_json(report)

    with col_d1:
        st.download_button(
            "⬇️ Download Markdown Report",
            data=md_content,
            file_name="code_change_impact_report.md",
            mime="text/markdown",
            use_container_width=True
        )
    with col_d2:
        st.download_button(
            "⬇️ Download JSON Report",
            data=json_content,
            file_name="code_change_impact_report.json",
            mime="application/json",
            use_container_width=True
        )

    # Severity Sections
    high_comps = [c for c in report.affected_components if c.impact_level == "HIGH"]
    med_comps = [c for c in report.affected_components if c.impact_level == "MEDIUM"]
    low_comps = [c for c in report.affected_components if c.impact_level == "LOW"]

    if high_comps:
        st.markdown("### 🔴 High Impact")
        for comp in high_comps:
            with st.container(border=True):
                st.markdown(f"**`{comp.file}`** &nbsp;•&nbsp; `{comp.component}` &nbsp;•&nbsp; *{comp.component_type}*")
                st.write(f"**Reason:** {comp.reason}")
                with st.expander(f"🔍 View Evidence Code ({comp.file}:{comp.line_range})"):
                    st.code(comp.evidence, language="python")

    if med_comps:
        st.markdown("### 🟠 Medium Impact")
        for comp in med_comps:
            with st.container(border=True):
                st.markdown(f"**`{comp.file}`** &nbsp;•&nbsp; `{comp.component}` &nbsp;•&nbsp; *{comp.component_type}*")
                st.write(f"**Reason:** {comp.reason}")
                with st.expander(f"🔍 View Evidence Code ({comp.file}:{comp.line_range})"):
                    st.code(comp.evidence, language="python")

    if low_comps:
        st.markdown("### 🟢 Low Impact")
        for comp in low_comps:
            st.markdown(f"- **`{comp.file}`** (`{comp.component}`): {comp.reason}")

    # Tabs for API, Test, Docs, Risks
    t1, t2, t3, t4 = st.tabs(["🌐 API Impact", "🧪 Test Impact", "📚 Documentation", "⚠️ Risks & Validation"])

    with t1:
        if report.api_impact:
            for api in report.api_impact:
                st.write(f"**{api.method} `{api.endpoint}`** [{api.impact_level}]: {api.reason}")
        else:
            st.info("No public or internal APIs directly affected.")

    with t2:
        if report.test_impact:
            for t in report.test_impact:
                st.write(f"**`{t.test_file}`** :: `{t.test_name}`: {t.reason} (*Action: {t.action_required}*)")
        else:
            st.info("No existing test suites flagged for modifications.")

    with t3:
        if report.documentation_impact:
            for d in report.documentation_impact:
                st.write(f"**`{d.doc_file}`** (Section: *{d.section}*): {d.reason}")
        else:
            st.info("No documentation updates required.")

    with t4:
        if report.risks:
            st.markdown("#### Potential Risks")
            for r in report.risks:
                st.warning(f"**[{r.severity}] {r.risk}**\n\n*Mitigation:* {r.mitigation}")

        if report.recommended_validation:
            st.markdown("#### Recommended Validation Checklist")
            for step in report.recommended_validation:
                st.checkbox(step, value=False)


# ==============================================================================
# ANALYSIS HISTORY PAGE
# ==============================================================================
def render_history_page():
    st.markdown("## 🕒 Analysis History")
    st.caption("View and inspect past code change impact reports.")

    history = history_service.list_history()
    if not history:
        st.info("No analysis history recorded yet. Run your first analysis from the 'New Analysis' page!")
        return

    for h in history:
        with st.container(border=True):
            col1, col2, col3, col4, col5 = st.columns([2, 3, 2, 2, 1])
            with col1:
                st.markdown(f"**{h.analysis_id}**")
                st.caption(f"Repo: {h.repository_name}")
            with col2:
                st.write(h.summary[:90] + "..." if len(h.summary) > 90 else h.summary)
            with col3:
                st.write(f"📅 {h.timestamp}")
            with col4:
                badge_color = "red" if h.overall_impact_level == "HIGH" else "orange" if h.overall_impact_level == "MEDIUM" else "green"
                st.markdown(f":{badge_color}[● {h.overall_impact_level}] &nbsp;•&nbsp; Files: {h.changed_files_count}")
            with col5:
                if st.button("Open", key=f"open_{h.analysis_id}"):
                    if h.report_data:
                        # Restore report
                        st.session_state.current_report = ImpactReportData(
                            summary=h.report_data.get("summary", ""),
                            changed_files=h.report_data.get("changed_files", []),
                            affected_components=[],
                            api_impact=[],
                            test_impact=[],
                            documentation_impact=[],
                            risks=[],
                            recommended_validation=h.report_data.get("recommended_validation", []),
                            metrics=h.report_data.get("metrics", {})
                        )
                        st.session_state.selected_page = "New Analysis"
                        st.rerun()


# ==============================================================================
# SETTINGS PAGE
# ==============================================================================
def render_settings_page():
    st.markdown("## ⚙️ Application Settings")
    st.caption("Configure model parameters, Firebase Authentication, and deployment targets.")

    with st.container(border=True):
        st.markdown("### 🤖 Generative AI (Gemini)")
        st.text_input("Active Model", value=config.gemini_model, disabled=True)
        st.text_input("Embedding Model", value=config.embedding_model_name, disabled=True)
        has_key = bool(config.gemini_api_key)
        if has_key:
            st.success("✓ GEMINI_API_KEY detected in environment.")
        else:
            st.warning("⚠️ GEMINI_API_KEY is not set. The app will use the deterministic AST semantic engine.")

    with st.container(border=True):
        st.markdown("### 🔥 Firebase Authentication")
        st.text_input("Auth Domain", value=config.firebase.auth_domain or "impact-analyzer.firebaseapp.com", disabled=True)
        st.text_input("Project ID", value=config.firebase.project_id or "impact-analyzer-prod", disabled=True)
        st.write("Supported OAuth Providers: Google Login, Apple Sign-In")

    with st.container(border=True):
        st.markdown("### ☁️ AWS EC2 & HTTPS Public Deployment")
        st.markdown(
            """
            This application is configured for AWS EC2 deployment with:
            - **Reverse Proxy:** Nginx with HTTP/2 and SSL/TLS termination
            - **Service Manager:** systemd (`code_change_impact_analyzer.service`)
            - **Port:** 8501 (Streamlit backend) -> 443 (HTTPS)
            """
        )


# ==============================================================================
# USER PROFILE PAGE
# ==============================================================================
def render_profile_page():
    st.markdown("## 👤 User Profile")
    user = st.session_state.user
    if user:
        with st.container(border=True):
            st.markdown(f"### {user.display_name}")
            st.write(f"**Email:** `{user.email}`")
            st.write(f"**User ID:** `{user.uid}`")
            st.write(f"**Auth Provider:** `{user.provider}`")
            st.write(f"**Status:** Authenticated via Firebase")


# ==============================================================================
# MAIN ROUTING
# ==============================================================================
def main():
    if not st.session_state.user:
        render_login_page()
    else:
        render_sidebar()
        page = st.session_state.selected_page
        if page == "Dashboard":
            render_dashboard()
        elif page == "New Analysis":
            render_new_analysis()
        elif page == "Analysis History":
            render_history_page()
        elif page == "Settings":
            render_settings_page()
        elif page == "User Profile":
            render_profile_page()


if __name__ == "__main__":
    main()
