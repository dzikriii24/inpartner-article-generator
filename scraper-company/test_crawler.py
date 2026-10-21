import re
import urllib.parse
from bs4 import BeautifulSoup
from curl_cffi import requests as cureq

SOCIAL_DOMAINS = {
    'linkedin': ['linkedin.com/company/', 'linkedin.com/in/'],
    'instagram': ['instagram.com/'],
    'facebook': ['facebook.com/'],
    'twitter': ['twitter.com/', 'x.com/'],
    'youtube': ['youtube.com/c/', 'youtube.com/channel/', 'youtube.com/@', 'youtube.com/user/'],
}

IGNORE_PATTERNS = [
    'sharer', 'intent', 'share', 'plugins', 'tr?id=', 'login', 'signup', 'policy', 'terms', 'privacy'
]

def normalize_url(url):
    if not url:
        return None
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

def extract_socials_and_contacts(website_url):
    results = {
        'socials': {},
        'emails': set(),
        'phones': set()
    }
    target_url = normalize_url(website_url)
    if not target_url:
        return results
        
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
        # Try https first
        try:
            r = cureq.get(target_url, headers=headers, impersonate='chrome120', timeout=7, verify=False)
        except Exception:
            # Fallback to http if https fails
            if target_url.startswith('https://'):
                target_url = 'http://' + target_url[8:]
                r = cureq.get(target_url, headers=headers, impersonate='chrome120', timeout=7, verify=False)
            else:
                return results

        if r.status_code != 200:
            return results

        soup = BeautifulSoup(r.text, 'html.parser')
        
        # 1. Social Media Links
        for a in soup.find_all('a', href=True):
            href = a['href'].strip()
            href_lower = href.lower()
            if any(ign in href_lower for ign in IGNORE_PATTERNS):
                continue
                
            for platform, domains in SOCIAL_DOMAINS.items():
                if platform not in results['socials']:
                    for d in domains:
                        if d in href_lower:
                            # Clean up tracking params
                            clean_href = href.split('?')[0].rstrip('/')
                            if len(clean_href) > len(d) + 8:  # Ensure it has a handle/path
                                results['socials'][platform] = clean_href
                                break

            # Mailto links
            if href_lower.startswith('mailto:'):
                email = href.split('mailto:')[-1].split('?')[0].strip()
                if '@' in email and '.' in email:
                    results['emails'].add(email)

            # Tel links
            if href_lower.startswith('tel:'):
                phone = href.split('tel:')[-1].split('?')[0].strip()
                if len(phone) >= 6:
                    results['phones'].add(phone)

        # 2. Page text email regex
        text = soup.get_text()
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        for email in re.findall(email_pattern, r.text):
            email = email.strip('.').lower()
            if not any(email.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.js', '.css']):
                if not any(j in email for j in ['wix', 'sentry', 'example', 'domain', 'bootstrap', 'schema.org']):
                    results['emails'].add(email)

    except Exception as e:
        # print(f"Error crawling {target_url}: {e}")
        pass

    return results

if __name__ == '__main__':
    test_sites = [
        'www.bukalapak.com',
        'www.adaroindonesia.com',
        'www.astra-agro.co.id',
        'www.mahakax.com',
        'www.abm-investama.com'
    ]
    for s in test_sites:
        print(f"Testing {s}...")
        res = extract_socials_and_contacts(s)
        print("  Socials:", res['socials'])
        print("  Emails:", list(res['emails'])[:3])
        print("  Phones:", list(res['phones'])[:3])
