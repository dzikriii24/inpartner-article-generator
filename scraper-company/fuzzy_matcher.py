import re
from rapidfuzz import process, fuzz

# Known historical name changes or specific corporate renamings
KNOWN_ALIASES = {
    "calculus global ventures": "STAR",
    "buana artha anugerah": "STAR",
    "ever shine tex": "ESTI",
    "rig tenders indonesia": "RIGS",
    "sinarmas multiartha": "SMMA",
    "hotel sahid jaya international": "SHID",
}

def clean_company_name(name: str) -> str:
    """
    Cleans company name by removing prefixes/suffixes (PT, Tbk, etc.)
    and stripping punctuation for optimal fuzzy matching.
    """
    if not isinstance(name, str):
        return ""
    s = name.strip()
    # Remove common prefix/suffix: PT, Persero, Tbk, Tb, etc.
    s = re.sub(r'\b(PT|Persero|Tbk|Tb)\b\.?', '', s, flags=re.IGNORECASE)
    # Remove punctuation & extra whitespace
    s = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s

class FuzzyMatcher:
    def __init__(self, idx_companies):
        """
        idx_companies: list of dicts from IDX with at least 'NamaEmiten' and 'KodeEmiten'
        """
        self.idx_companies = idx_companies
        self.ticker_map = {c['KodeEmiten'].upper(): c for c in idx_companies if c.get('KodeEmiten')}
        
        # Prepare cleaned names
        self.cleaned_names = []
        self.exact_map = {}
        for c in idx_companies:
            cleaned = clean_company_name(c.get('NamaEmiten', ''))
            self.cleaned_names.append(cleaned)
            if cleaned and cleaned not in self.exact_map:
                self.exact_map[cleaned] = c

    def match(self, raw_name: str, score_cutoff: float = 75.0):
        """
        Matches a raw company name to the best IDX company profile.
        Returns: (matched_company_dict or None, score, match_method)
        """
        if not raw_name:
            return None, 0.0, "Empty"

        cleaned = clean_company_name(raw_name)

        # 1. Check known aliases / historical tickers
        if cleaned in KNOWN_ALIASES:
            alias_ticker = KNOWN_ALIASES[cleaned]
            if alias_ticker in self.ticker_map:
                return self.ticker_map[alias_ticker], 100.0, "Known Alias"

        # Check partial alias match
        for alias_key, alias_ticker in KNOWN_ALIASES.items():
            if alias_key in cleaned or cleaned in alias_key:
                if alias_ticker in self.ticker_map:
                    return self.ticker_map[alias_ticker], 98.0, "Known Alias Partial"

        # 2. Check exact cleaned match
        if cleaned in self.exact_map:
            return self.exact_map[cleaned], 100.0, "Exact Match"

        # 3. Fuzzy match using token_set_ratio & token_sort_ratio
        best_set = process.extractOne(cleaned, self.cleaned_names, scorer=fuzz.token_set_ratio)
        best_sort = process.extractOne(cleaned, self.cleaned_names, scorer=fuzz.token_sort_ratio)

        score_set = best_set[1] if best_set else 0.0
        score_sort = best_sort[1] if best_sort else 0.0

        if score_set >= score_sort:
            best_idx = best_set[2]
            best_score = score_set
            method = "Fuzzy Token Set"
        else:
            best_idx = best_sort[2]
            best_score = score_sort
            method = "Fuzzy Token Sort"

        if best_score >= score_cutoff and best_idx is not None:
            return self.idx_companies[best_idx], best_score, method

        return None, best_score, "No Match (Below Cutoff)"
