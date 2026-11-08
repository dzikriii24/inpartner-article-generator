# RESOURCE OPTIMIZATION REPORT — INPARTNER COMPANY CONTACT SCRAPER
**Production URL:** `https://contactscraper.1slabs.my.id/dashboard`
**Server:** CloudLinux 9.8 / LiteSpeed Web Server / Passenger WSGI / Python 3.11.17
**Date:** November 3, 2026

---

## 1. Measured Improvements

| Metric | Before Optimization | After Optimization | Improvement |
|---|---|---|---|
| **Worker Idle RAM (RSS)** | **120.2 MB** | **95.8 MB – 96.1 MB** | **-20.3% reduction** (-24.4 MB per worker) |
| **Total RAM across 3 workers** | **~360.6 MB** | **~288.0 MB** | **-72.6 MB server RAM saved** |
| **FastAPI Deprecation Warnings** | Spammed on every list request | **0 warnings** (fixed `pattern` query param) | Clean server logs |
| **Google GenAI Loading** | Eager at boot for all workers | **Lazy On-Demand** | Eliminates 16.4 MB overhead during HTTP requests |
| **Search Engine Result Cache** | None (crawls external web on every search) | **In-Memory LRU Cache (TTL 1 Hour)** | Near 0s latency & 0 AI/Scraping requests for cached queries |
| **Bing Provider Resiliency** | Failed on rate-limit / DNS error | **DuckDuckGo multi-fallback integration** | Continuous discovery uptime |
| **Resource Monitoring Endpoint** | Not available | Real-time endpoint `/api/settings` with `worker_rss_mb` and system load | Accessible via API & UI |
| **Frontend Theme & Bundle Size** | Heavy glassmorphism / gradient (63.8 KB CSS, 475 KB JS) | Clean White & Light Blue (56.4 KB CSS, 471.7 KB JS) | **Faster load, -11.5% CSS footprint** |

---

## 2. Optimization Methodology & Details

### A. Lazy Initialization of Heavy AI Library
- **Problem:** `google.genai` was loaded unconditionally on worker startup in `gemini_ai.py`, consuming 16.4 MB RSS per Passenger worker even when only servicing regular dashboard API calls.
- **Solution:** Converted `GeminiAIService` to lazily instantiate `genai.Client` only when `_safe_generate` is called for ambiguous entity enrichment.

### B. In-Memory Domain Search Caching
- **Problem:** Re-searching a company within the same day triggered identical external HTTP calls, search engine queries, and token consumption.
- **Solution:** Implemented class-level LRU dictionary cache `_domain_cache` with a 1-hour TTL (`settings.CACHE_TTL_COMPANY = 3600`) and max-capacity eviction (200 entries).

### C. Search Provider Multi-Tier Fallback
- **Problem:** External search provider failures caused searches to fail prematurely.
- **Solution:** Added resilient fallback to DuckDuckGo search (`ddgs`) when Bing returns non-200, is blocked, or encounters network timeouts.

### D. Server Resource Monitoring
- Added `/api/settings` resource reporting using standard Python `resource.getrusage(RUSAGE_SELF)` and `os.getloadavg()`, providing non-intrusive monitoring without external daemon overhead.

