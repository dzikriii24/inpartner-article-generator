# Project Plan: AI-Powered Article Generator (Business & Investment)

## Overview
This plan outlines the development of an automated AI-driven platform for generating business and investment news articles. The platform ensures factual accuracy, anti-hallucination, and SEO optimization. The core stack includes **Python (FastAPI), PostgreSQL (pgvector), Gemini API, n8n, and Streamlit (MVP)**.

## Timeline: 6 Days (MVP Phase)

### Day 1: Project Setup & Data Aggregation Layer
**Goal:** Initialize the project and build the capability to gather news from various sources.
- **Tasks:**
  - Set up Python environment and install dependencies (FastAPI, feedparser, requests, python-dotenv).
  - Setup local PostgreSQL database with `pgvector` extension.
  - Create the data aggregation script to parse RSS feeds from financial news outlets.
  - Integrate secondary APIs (GNews/NewsAPI) as fallbacks.
  - Implement basic data normalization and deduplication to avoid redundant news.

### Day 2: Topic Clustering, Trend Scoring, & Database Integration
**Goal:** Group similar news and rank them by relevance/trend score.
- **Tasks:**
  - Implement `SentenceTransformers` for local text embedding to save API costs.
  - Build the Topic Clustering module using similarity search in `pgvector`.
  - Develop a scoring algorithm based on freshness, volume, and relevance.
  - Filter the top 5 highest-scoring topics per day.
  - Save normalized topics, sources, and claims into the database.

### Day 3: AI Research & Article Generation Pipeline
**Goal:** Integrate Gemini API for evidence-based content generation.
- **Tasks:**
  - Establish connection to Gemini API.
  - Build the **Evidence Store** logic: extract solid facts and figures from the selected top topics.
  - Design the strict AI Prompts/Templates for the article structure (Headline, Lead, Body with financial data, Insight).
  - Ensure prompt instructions strictly forbid hallucinations and plagiarism, enforcing an evidence-based approach.
  - Implement language logic (English) with formal/journalistic tone tailored for C-level executives.

### Day 4: Fact-Checking, Compliance & SEO Optimization
**Goal:** Add safety nets to prevent false data and prepare articles for publishing.
- **Tasks:**
  - Build the **Automated Fact-Checking** module to cross-reference AI-generated numbers/claims against the Evidence Store.
  - Implement a fallback mechanism: if fact-check fails, discard the article and optionally retry.
  - Inject mandatory legal disclaimers ("Not financial advice") and source attributions.
  - Implement the SEO Optimization module: generate meta titles, descriptions, and structure HTML/Markdown headings.

### Day 5: Orchestration (n8n) & CMS Integration
**Goal:** Automate the entire workflow and connect it to the publishing platform.
- **Tasks:**
  - Set up **n8n** (or alternative orchestrator) workflows to trigger tasks.
  - Create the daily schedule logic (e.g., Data collection at 01:00, generation at 05:00, final validation at 07:00).
  - Enforce the **Hard-Limit**: strictly maximum 5 articles per day, max 1 per topic category.
  - Integrate with WordPress REST API (or Headless CMS) to push generated articles.
  - Implement logic to hold "Ready" articles in a *Scheduled/Draft* state until the 08:00 WIB auto-publish window.

### Day 6: Admin Dashboard (Streamlit MVP) & Testing
**Goal:** Provide a user interface for manual control and monitor the system.
- **Tasks:**
  - Build a simple **Streamlit Dashboard** to view daily quotas, generation status, and logs.
  - Implement toggle controls: *Auto Schedule Mode* vs *Manual Selection Mode*.
  - Allow admin to manually select topics and force-generate articles (within the 5/day limit).
  - End-to-end testing of the pipeline (simulate a full day's run).
  - Setup error tracking and hallucination logs for future prompt iterations.

---

> [!IMPORTANT]
> The system strictly prioritizes **quality over quantity**. If only 3 topics pass the strict fact-checking phase, only 3 articles will be published. Hallucination and unverified financial data are strictly prohibited.
