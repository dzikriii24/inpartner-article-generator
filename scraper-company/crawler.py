import re
import urllib.parse
from bs4 import BeautifulSoup
from curl_cffi import requests as cureq
import requests

SOCIAL_DOMAINS = {
    'LinkedIn': ['linkedin.com/company/', 'linkedin.com/in/'],
    'Instagram': ['instagram.com/'],
    'Facebook': ['facebook.com/'],
    'Twitter / X': ['twitter.com/', 'x.com/'],
    'YouTube': ['youtube.com/c/', 'youtube.com/channel/', 'youtube.com/@', 'youtube.com/user/'],
}

IGNORE_PATTERNS = [
    'sharer', 'intent', 'share', 'plugins', 'tr?id=', 'login', 'signup',
    'policy', 'terms', 'privacy', 'cookie', 'status', 'hashtag', 'widgets'
]

def normalize_url(url: str) -> str:
    if not url:
        return ""
    url = url.strip()
    # Remove leading dots or slashes
    url = re.sub(r'^[./]+', '', url)
    if not url:
        return ""
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url
    return url

def clean_social_url(url: str) -> str:
    """Removes query params and trailing slashes from social media URLs."""
    if not url:
        return ""
    url = url.split('?')[0].rstrip('/')
    return url

class WebCrawler:
    def __init__(self, timeout: int = 7):
        self.timeout = timeout
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7'
        }

    def fetch_page(self, url: str) -> str:
        """Fetches page HTML with curl_cffi then fallback to requests."""
        target_url = normalize_url(url)
        if not target_url:
            return ""

        # 1. Try HTTPS with curl_cffi
        try:
            r = cureq.get(target_url, headers=self.headers, impersonate='chrome120', timeout=self.timeout, verify=False)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass

        # 2. Try HTTP with curl_cffi if target was https
        if target_url.startswith('https://'):
            http_url = 'http://' + target_url[8:]
            try:
                r = cureq.get(http_url, headers=self.headers, impersonate='chrome120', timeout=self.timeout, verify=False)
                if r.status_code == 200:
                    return r.text
            except Exception:
                pass

        # 3. Fallback to standard requests
        try:
            r = requests.get(target_url, headers=self.headers, timeout=self.timeout, verify=False)
            if r.status_code == 200:
                return r.text
        except Exception:
            pass

        return ""

    def parse_page(self, html: str, base_url: str):
        """Extracts social media links, emails, and contact numbers."""
        socials = {}
        emails = set()
        phones = set()
        contact_subpages = []

        if not html:
            return socials, emails, phones, contact_subpages

        soup = BeautifulSoup(html, 'html.parser')

        # 1. Extract links
        for a in soup.find_all('a', href=True):
            href = a['href'].strip()
            href_lower = href.lower()

            if any(ign in href_lower for ign in IGNORE_PATTERNS):
                continue

            # Social media detection
            for platform, domains in SOCIAL_DOMAINS.items():
                if platform not in socials:
                    for d in domains:
                        if d in href_lower:
                            full_url = href
                            if not full_url.startswith(('http://', 'https://')):
                                full_url = urllib.parse.urljoin(base_url, href)
                            clean_link = clean_social_url(full_url)
                            # Ensure link has meaningful path after domain
                            if len(clean_link) > 22:
                                socials[platform] = clean_link
                                break

            # Mailto links
            if href_lower.startswith('mailto:'):
                email = href.split('mailto:')[-1].split('?')[0].strip()
                if '@' in email and '.' in email:
                    emails.add(email.lower())

            # Tel links
            if href_lower.startswith('tel:'):
                phone = href.split('tel:')[-1].split('?')[0].strip()
                if len(phone) >= 6:
                    phones.add(phone)

            # Potential contact subpage links
            if any(k in href_lower for k in ['contact', 'hubungi', 'about', 'tentang', 'kontak']):
                full_sub = urllib.parse.urljoin(base_url, href)
                if full_sub.startswith(('http://', 'https://')) and full_sub != base_url:
                    if len(contact_subpages) < 2 and full_sub not in contact_subpages:
                        contact_subpages.append(full_sub)

        # 2. Extract emails from text regex
        email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
        for email in re.findall(email_pattern, html):
            email = email.strip('.').lower()
            # Filter out file extensions
            if any(email.endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.js', '.css', '.woff', '.ttf']):
                continue
            # Filter out npm package versions (e.g. library@1.0.0 or package@2.5)
            if re.search(r'@\d+\.\d+', email):
                continue
            # Filter out mock/template/junk emails
            if any(j in email for j in ['wix', 'sentry', 'example', 'domain', 'bootstrap', 'schema.org', 'wordpress', 'sandbox@', 'nama@', 'test@', 'yourname@', 'email.com', 'dummy@']):
                continue
            emails.add(email)

        return socials, emails, phones, contact_subpages

    def crawl(self, website_url: str):
        """Crawls homepage and, if needed, a contact subpage."""
        target_url = normalize_url(website_url)
        if not target_url:
            return {'socials': {}, 'emails': set(), 'phones': set()}

        html = self.fetch_page(target_url)
        socials, emails, phones, contact_subpages = self.parse_page(html, target_url)

        # If no socials or emails found, check first contact subpage
        if (not socials or not emails) and contact_subpages:
            sub_url = contact_subpages[0]
            sub_html = self.fetch_page(sub_url)
            sub_socials, sub_emails, sub_phones, _ = self.parse_page(sub_html, sub_url)
            for k, v in sub_socials.items():
                if k not in socials:
                    socials[k] = v
            emails.update(sub_emails)
            phones.update(sub_phones)

        return {
            'socials': socials,
            'emails': emails,
            'phones': phones
        }
