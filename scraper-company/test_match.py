import json
import pandas as pd
from rapidfuzz import process, fuzz
import re

excel_path = r'c:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\Pipeline AR-SR.xlsx'
df = pd.read_excel(excel_path)

with open('all_profiles.json', encoding='utf-8') as f:
    idx_data = json.load(f)['data']

def clean_company_name(name):
    if not isinstance(name, str):
        return ''
    s = name.strip()
    s = re.sub(r'\b(PT|Persero|Tbk|Tb)\b\.?', '', s, flags=re.IGNORECASE)
    s = re.sub(r'[^a-zA-Z0-9\s]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    return s

idx_cleaned = [clean_company_name(c['NamaEmiten']) for c in idx_data]

low_matches = []
for idx, row in df.iterrows():
    raw_name = str(row['Nama Perusahaan'])
    cleaned = clean_company_name(raw_name)
    
    # Try token_set_ratio
    best_set = process.extractOne(cleaned, idx_cleaned, scorer=fuzz.token_set_ratio)
    score_set = best_set[1] if best_set else 0
    
    # Also test token_sort_ratio
    best_sort = process.extractOne(cleaned, idx_cleaned, scorer=fuzz.token_sort_ratio)
    score_sort = best_sort[1] if best_sort else 0
    
    # Combined score
    score = max(score_set, score_sort)
    matched = idx_data[best_set[2]] if score_set >= score_sort else idx_data[best_sort[2]]
    
    if score < 85:
        low_matches.append((row['No'], raw_name, matched['NamaEmiten'], matched['KodeEmiten'], score, score_set, score_sort))

print(f"Total rows checked: {len(df)}")
print(f"Rows with score < 85: {len(low_matches)}")
for r in low_matches:
    print(r)
