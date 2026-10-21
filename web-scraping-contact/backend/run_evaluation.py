import json
import sys
from datetime import datetime

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from app.core.database import SessionLocal
from app.services.search_engine import CompanySearchEngine

test_companies = [
    "Bundamedik Tbk.",
    "Triniti Dinamik Tbk.",
    "NexAI Digital Infrastruktur Tb",
    "Green Power Group Tbk.",
    "Archi Indonesia Tbk.",
    "Era Graharealty Tbk.",
    "Bank Multiarta Sentosa Tbk.",
    "Falmaco Nonwoven Industri Tbk.",
    "Bukalapak.com Tbk.",
    "Cemindo Gemilang Tbk.",
    "Dayamitra Telekomunikasi Tbk.",
    "Ace Oldfields Tbk."
]

def main():
    engine = CompanySearchEngine()
    db = SessionLocal()

    print(f"Starting real evaluation test on {len(test_companies)} companies from Pipeline AR-SR.xlsx...\n")
    evaluation_records = []

    for idx, comp_name in enumerate(test_companies, 1):
        print(f"[{idx}/{len(test_companies)}] Processing: {comp_name}...")
        try:
            start_t = datetime.now()
            res = engine.search_and_enrich(comp_name, db=db, search_type="evaluation_test")
            duration = (datetime.now() - start_t).total_seconds()
            
            # Extract sample evidence
            emails = [c for c in res["contacts"] if c.get("email")]
            phones = [c for c in res["contacts"] if c.get("phone")]
            addresses = [c for c in res["contacts"] if c.get("address")]

            email_ev = f"{emails[0]['email']} ({emails[0].get('source_section')})" if emails else "None"
            phone_ev = f"{phones[0]['phone']} ({phones[0].get('source_section')})" if phones else "None"
            addr_ev = f"{res.get('address')[:45]}..." if res.get('address') else "None"

            record = {
                "company": comp_name,
                "official_name": res.get("official_name"),
                "website": res.get("website") or "Not Found",
                "status": res.get("search_status"),
                "confidence": res.get("matching_confidence"),
                "pages_crawled": res.get("audit_metadata", {}).get("pages_crawled_count", 0),
                "browser_used": res.get("audit_metadata", {}).get("browser_crawler_used", False),
                "total_contacts": len(res.get("contacts", [])),
                "email_evidence": email_ev,
                "phone_evidence": phone_ev,
                "address_evidence": addr_ev,
                "duration_seconds": round(duration, 1),
                "raw_contacts": res.get("contacts", [])
            }
            evaluation_records.append(record)
            print(f"    Status: {record['status']} | Website: {record['website']}")
            print(f"    Pages: {record['pages_crawled']} (Browser: {record['browser_used']}) | Contacts: {record['total_contacts']}")
            print(f"    Email: {email_ev} | Phone: {phone_ev}\n")
        except Exception as e:
            print(f"    ERROR processing {comp_name}: {e}\n")

    db.close()

    with open("evaluation_report.json", "w", encoding="utf-8") as f:
        json.dump(evaluation_records, f, indent=2, default=str)

    print("Evaluation completed successfully! Saved to evaluation_report.json.")

if __name__ == "__main__":
    main()
