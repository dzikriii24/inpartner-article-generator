import re
from ddgs import DDGS
from crawler import clean_social_url

IGNORE_SITE_DOMAINS = [
    'wikipedia.org', 'reuters.com', 'bloomberg.com', 'facebook.com', 'instagram.com',
    'linkedin.com', 'twitter.com', 'x.com', 'youtube.com', 'jobstreet', 'glints',
    'idx.co.id', 'idnfinancials.com', 'duniainvestasi.com', 'britama.com'
]

class DDGFallbackSearcher:
    def __init__(self):
        pass

    def search_company_info(self, company_name: str):
        """
        Fallback search when website or contact info is missing.
        Returns: {
            'website': str,
            'socials': dict,
            'emails': set(),
            'phones': set()
        }
        """
        results = {
            'website': '',
            'socials': {},
            'emails': set(),
            'phones': set()
        }

        try:
            with DDGS() as ddgs:
                # 1. Search for official website
                query_web = f"{company_name} website resmi indonesia"
                for r in ddgs.text(query_web, max_results=3):
                    href = r.get('href', '')
                    if not any(ign in href for ign in IGNORE_SITE_DOMAINS):
                        if not results['website'] and href.startswith('http'):
                            results['website'] = href
                            break

                # 2. Search for social media accounts
                query_soc = f"{company_name} instagram linkedin official"
                for r in ddgs.text(query_soc, max_results=4):
                    href = r.get('href', '')
                    href_lower = href.lower()
                    if 'instagram.com/' in href_lower and 'Instagram' not in results['socials']:
                        clean = clean_social_url(href)
                        if len(clean) > 23:
                            results['socials']['Instagram'] = clean
                    elif 'linkedin.com/company/' in href_lower and 'LinkedIn' not in results['socials']:
                        clean = clean_social_url(href)
                        if len(clean) > 27:
                            results['socials']['LinkedIn'] = clean

                # 3. Search for corsec contacts
                query_corsec = f"{company_name} corporate secretary email kontak"
                for r in ddgs.text(query_corsec, max_results=3):
                    body = r.get('body', '') + ' ' + r.get('title', '')
                    for email in re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', body):
                        email = email.strip('.').lower()
                        if not any(email.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']):
                            results['emails'].add(email)

        except Exception as e:
            # print(f"DDG search error for {company_name}: {e}")
            pass

        return results
