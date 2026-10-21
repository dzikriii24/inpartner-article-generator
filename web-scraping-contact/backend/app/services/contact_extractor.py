import re
import json
import urllib.parse
from typing import List, Dict, Any, Optional, Set
import phonenumbers
from phonenumbers import PhoneNumberFormat, PhoneNumberType
from bs4 import BeautifulSoup

JUNK_EMAIL_PATTERNS = [
    r'example\.com', r'domain\.com', r'test\.com', r'email\.com',
    r'wixpress\.com', r'sentry\.io', r'wordpress\.(com|org)',
    r'schema\.org', r'w3\.org', r'cloudflare\.com', r'github\.com',
    r'google\.com', r'mysite\.com', r'yourdomain\.com', r'facebook\.com',
    r'twitter\.com', r'instagram\.com', r'linkedin\.com', r'placeholder',
    r'sample', r'user@', r'admin@domain', r'none@', r'themeforest\.net',
    r'envato\.com', r'bootstrapmade\.com', r'@2x\.png', r'@3x\.png'
]

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
WHATSAPP_LINK_REGEX = re.compile(r'(?:https?://)?(?:api\.whatsapp\.com/send\?phone=|wa\.me/)([0-9+]+)')

class GroundedContactExtractor:
    @staticmethod
    def extract_evidence_snippet(text: str, target: str, window: int = 70) -> str:
        """Extract a readable snippet of text surrounding the target contact."""
        if not text or not target:
            return ""
        idx = text.lower().find(target.lower())
        if idx == -1:
            return target
        start = max(0, idx - window)
        end = min(len(text), idx + len(target) + window)
        snippet = text[start:end].replace('\n', ' ').strip()
        # Clean multiple spaces
        snippet = re.sub(r'\s+', ' ', snippet)
        return f"...{snippet}..." if (start > 0 or end < len(text)) else snippet

    @staticmethod
    def classify_email_type(email: str) -> str:
        prefix = email.split('@')[0].lower()
        if any(k in prefix for k in ['sales', 'marketing', 'penjualan', 'order', 'commercial']):
            return "sales_email"
        elif any(k in prefix for k in ['procurement', 'purchasing', 'vendor', 'pengadaan', 'tender', 'logistics']):
            return "procurement_email"
        elif any(k in prefix for k in ['corsec', 'corporate.secretary', 'secretary', 'sekretaris', 'ir@', 'investor', 'investor.relation']):
            return "pr_email"
        elif any(k in prefix for k in ['pr@', 'press', 'media', 'comms', 'humas', 'publikasi']):
            return "pr_email"
        elif any(k in prefix for k in ['partnership', 'partner', 'bizdev', 'bd@', 'kerjasama']):
            return "bizdev_email"
        elif any(k in prefix for k in ['cs@', 'support', 'care', 'helpdesk', 'layanan', 'bantuan', 'customercare']):
            return "cs_phone"
        return "general_email"

    @staticmethod
    def extract_structured_json_ld(soup: BeautifulSoup, source_url: str) -> List[Dict[str, Any]]:
        """Extract high-accuracy contact details from schema.org JSON-LD scripts."""
        contacts = []
        parsed_url = urllib.parse.urlparse(source_url)
        source_domain = parsed_url.netloc.lower()

        for script in soup.find_all("script", type="application/ld+json"):
            if not script.string:
                continue
            try:
                data = json.loads(script.string)
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if not isinstance(item, dict):
                        continue
                    schema_type = str(item.get("@type", ""))
                    if not any(t in schema_type for t in ["Organization", "Corporation", "LocalBusiness", "MedicalOrganization", "Store"]):
                        continue

                    # Telephone
                    tel = item.get("telephone")
                    if tel:
                        tels = [tel] if isinstance(tel, str) else tel
                        for t in tels:
                            parsed_phone = GroundedContactExtractor.clean_phone_number(str(t))
                            if parsed_phone:
                                contacts.append({
                                    "contact_type": "office_phone",
                                    "phone": parsed_phone,
                                    "email": None,
                                    "source_url": source_url,
                                    "source_domain": source_domain,
                                    "source_page_title": "Structured Data (JSON-LD)",
                                    "source_section": "json_ld_schema",
                                    "evidence_text": f"Schema.org {schema_type} telephone: {t}",
                                    "extraction_method": "json_ld_structured",
                                    "verification_status": "verified_official_website",
                                    "confidence_score": 0.98,
                                    "raw_value": str(t)
                                })

                    # Email
                    em = item.get("email")
                    if em:
                        emails = [em] if isinstance(em, str) else em
                        for e in emails:
                            e_clean = str(e).strip().lower()
                            if GroundedContactExtractor.is_email_valid(e_clean):
                                contacts.append({
                                    "contact_type": GroundedContactExtractor.classify_email_type(e_clean),
                                    "email": e_clean,
                                    "phone": None,
                                    "source_url": source_url,
                                    "source_domain": source_domain,
                                    "source_page_title": "Structured Data (JSON-LD)",
                                    "source_section": "json_ld_schema",
                                    "evidence_text": f"Schema.org {schema_type} email: {e_clean}",
                                    "extraction_method": "json_ld_structured",
                                    "verification_status": "verified_official_website",
                                    "confidence_score": 0.98,
                                    "raw_value": str(e)
                                })

                    # Address
                    addr = item.get("address")
                    if addr:
                        if isinstance(addr, dict):
                            parts = [addr.get("streetAddress"), addr.get("addressLocality"), addr.get("addressRegion"), addr.get("postalCode")]
                            full_addr = ", ".join([str(p).strip() for p in parts if p and str(p).strip().lower() not in ["none", "null"]])
                        elif isinstance(addr, str):
                            full_addr = addr.strip()
                        else:
                            full_addr = ""

                        if full_addr and len(full_addr) > 5:
                            contacts.append({
                                "contact_type": "address",
                                "address": full_addr,
                                "source_url": source_url,
                                "source_domain": source_domain,
                                "source_page_title": "Structured Data (JSON-LD)",
                                "source_section": "json_ld_schema",
                                "evidence_text": f"Schema.org PostalAddress: {full_addr}",
                                "extraction_method": "json_ld_structured",
                                "verification_status": "verified_official_website",
                                "confidence_score": 0.98,
                                "raw_value": full_addr
                            })
            except Exception:
                continue

        return contacts

    @staticmethod
    def extract_footer_and_page_contacts(
        soup: BeautifulSoup, 
        source_url: str, 
        page_title: str = "",
        is_contact_page: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Deep extraction of contacts specifically targeting footer elements,
        contact blocks, addresses, and surrounding textual evidence.
        """
        contacts: List[Dict[str, Any]] = []
        seen_keys: Set[str] = set()

        parsed_url = urllib.parse.urlparse(source_url)
        source_domain = parsed_url.netloc.lower()

        # 1. Identify Footer Section
        footer_elements = soup.find_all(["footer", "address"])
        footer_elements.extend(soup.select("[id*='footer'], [class*='footer'], .site-footer, #colophon"))
        
        footer_text = ""
        footer_soup = None
        if footer_elements:
            footer_soup = footer_elements[0]
            footer_text = footer_soup.get_text(separator=" ", strip=True)

        full_page_text = soup.get_text(separator=" ", strip=True)

        # 2. Extract mailto: and tel: links
        for a in soup.find_all("a", href=True):
            href = a["href"].strip()
            href_lower = href.lower()

            # Determine whether link is in footer or main body
            in_footer = False
            if footer_soup and any(p == footer_soup for p in a.parents):
                in_footer = True

            section_name = "footer" if in_footer else ("contact_page" if is_contact_page else "page_body")

            # Mailto link
            if href_lower.startswith("mailto:"):
                clean_email = href.split("mailto:")[1].split("?")[0].strip().lower()
                if GroundedContactExtractor.is_email_valid(clean_email):
                    key = f"email:{clean_email}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        evidence = GroundedContactExtractor.extract_evidence_snippet(full_page_text, clean_email)
                        contacts.append({
                            "contact_type": GroundedContactExtractor.classify_email_type(clean_email),
                            "email": clean_email,
                            "phone": None,
                            "source_url": source_url,
                            "source_domain": source_domain,
                            "source_page_title": page_title or "Official Website",
                            "source_section": section_name,
                            "evidence_text": evidence or f"Found mailto link on {section_name}",
                            "extraction_method": "html_link",
                            "verification_status": "verified_official_website",
                            "confidence_score": 0.95 if in_footer or is_contact_page else 0.90,
                            "raw_value": href
                        })

            # Tel link
            elif href_lower.startswith("tel:"):
                raw_tel = href.split("tel:")[1].split("?")[0].strip()
                cleaned_tel = GroundedContactExtractor.clean_phone_number(raw_tel)
                if cleaned_tel:
                    key = f"phone:{cleaned_tel}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        evidence = GroundedContactExtractor.extract_evidence_snippet(full_page_text, raw_tel)
                        contacts.append({
                            "contact_type": "office_phone",
                            "phone": cleaned_tel,
                            "email": None,
                            "source_url": source_url,
                            "source_domain": source_domain,
                            "source_page_title": page_title or "Official Website",
                            "source_section": section_name,
                            "evidence_text": evidence or f"Found tel link on {section_name}",
                            "extraction_method": "html_link",
                            "verification_status": "verified_official_website",
                            "confidence_score": 0.95 if in_footer or is_contact_page else 0.90,
                            "raw_value": href
                        })

            # WhatsApp Link
            elif "wa.me/" in href_lower or "api.whatsapp.com/send" in href_lower:
                m = WHATSAPP_LINK_REGEX.search(href)
                if m:
                    raw_wa = m.group(1).lstrip('+')
                    clean_wa = GroundedContactExtractor.clean_phone_number(raw_wa)
                    if clean_wa:
                        key = f"phone:{clean_wa}"
                        if key not in seen_keys:
                            seen_keys.add(key)
                            contacts.append({
                                "contact_type": "whatsapp",
                                "phone": clean_wa,
                                "email": None,
                                "source_url": source_url,
                                "source_domain": source_domain,
                                "source_page_title": page_title or "Official Website",
                                "source_section": section_name,
                                "evidence_text": f"Official WhatsApp link: {href}",
                                "extraction_method": "whatsapp_widget",
                                "verification_status": "verified_official_website",
                                "confidence_score": 0.98,
                                "raw_value": href
                            })

            # Social Profiles
            elif any(plat in href_lower for plat in ['linkedin.com/company/', 'instagram.com/', 'facebook.com/', 'youtube.com/']):
                clean_soc = href.split('?')[0].rstrip('/')
                soc_type = None
                if 'linkedin.com/company/' in clean_soc.lower():
                    soc_type = "linkedin"
                elif 'instagram.com/' in clean_soc.lower() and not any(x in clean_soc.lower() for x in ['/p/', '/reel/']):
                    soc_type = "instagram"
                elif 'facebook.com/' in clean_soc.lower() and not any(x in clean_soc.lower() for x in ['/sharer', '/groups']):
                    soc_type = "facebook"
                elif 'youtube.com/' in clean_soc.lower() and any(x in clean_soc.lower() for x in ['/@', '/channel/', '/c/']):
                    soc_type = "youtube"

                if soc_type:
                    key = f"url:{clean_soc.lower()}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        contacts.append({
                            "contact_type": soc_type,
                            "url": clean_soc,
                            "email": None,
                            "phone": None,
                            "source_url": source_url,
                            "source_domain": source_domain,
                            "source_page_title": page_title or "Official Website",
                            "source_section": section_name,
                            "evidence_text": f"Official {soc_type.title()} profile link: {clean_soc}",
                            "extraction_method": "social_link",
                            "verification_status": "verified_official_website",
                            "confidence_score": 0.95,
                            "raw_value": href
                        })

        # 3. Extract text-based emails and phones from footer and contact sections
        target_texts = [("footer", footer_text)] if footer_text else []
        if is_contact_page:
            target_texts.append(("contact_page", full_page_text))
        else:
            target_texts.append(("page_body", full_page_text[:4000]))

        for sec_name, t_content in target_texts:
            if not t_content:
                continue

            # Emails in text
            for raw_em in EMAIL_REGEX.findall(t_content):
                em_clean = raw_em.lower().strip().rstrip('.,;:)"\'')
                if GroundedContactExtractor.is_email_valid(em_clean):
                    key = f"email:{em_clean}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        evidence = GroundedContactExtractor.extract_evidence_snippet(t_content, raw_em)
                        contacts.append({
                            "contact_type": GroundedContactExtractor.classify_email_type(em_clean),
                            "email": em_clean,
                            "phone": None,
                            "source_url": source_url,
                            "source_domain": source_domain,
                            "source_page_title": page_title or "Official Website",
                            "source_section": sec_name,
                            "evidence_text": evidence,
                            "extraction_method": "text_context_match",
                            "verification_status": "verified_official_website" if sec_name in ["footer", "contact_page"] else "format_valid",
                            "confidence_score": 0.90 if sec_name in ["footer", "contact_page"] else 0.80,
                            "raw_value": raw_em
                        })

            # Phones in text via PhoneNumberMatcher
            try:
                for match in phonenumbers.PhoneNumberMatcher(t_content, "ID"):
                    parsed_num = match.number
                    if phonenumbers.is_valid_number(parsed_num):
                        formatted = phonenumbers.format_number(parsed_num, PhoneNumberFormat.INTERNATIONAL)
                        key = f"phone:{formatted}"
                        if key not in seen_keys:
                            seen_keys.add(key)
                            evidence = GroundedContactExtractor.extract_evidence_snippet(t_content, match.raw_string)
                            contacts.append({
                                "contact_type": "office_phone",
                                "phone": formatted,
                                "email": None,
                                "source_url": source_url,
                                "source_domain": source_domain,
                                "source_page_title": page_title or "Official Website",
                                "source_section": sec_name,
                                "evidence_text": evidence,
                                "extraction_method": "text_phone_matcher",
                                "verification_status": "verified_official_website" if sec_name in ["footer", "contact_page"] else "format_valid",
                                "confidence_score": 0.90 if sec_name in ["footer", "contact_page"] else 0.80,
                                "raw_value": match.raw_string
                            })
            except Exception:
                pass

        # 4. Extract Physical Address from <address> or footer
        if footer_soup:
            for addr_tag in footer_soup.find_all("address"):
                addr_text = addr_tag.get_text(separator=" ", strip=True)
                if len(addr_text) > 15 and len(addr_text) < 300:
                    contacts.append({
                        "contact_type": "address",
                        "address": addr_text,
                        "source_url": source_url,
                        "source_domain": source_domain,
                        "source_page_title": page_title or "Official Website",
                        "source_section": "footer_address",
                        "evidence_text": f"HTML <address> element: {addr_text}",
                        "extraction_method": "html_address_tag",
                        "verification_status": "verified_official_website",
                        "confidence_score": 0.95,
                        "raw_value": addr_text
                    })

        return contacts

    @staticmethod
    def is_email_valid(email: str) -> bool:
        if not email or len(email) < 6 or len(email) > 80:
            return False
        if any(re.search(pat, email) for pat in JUNK_EMAIL_PATTERNS):
            return False
        if '.' not in email.split('@')[-1] or email.endswith('.'):
            return False
        return True

    @staticmethod
    def clean_phone_number(raw_num: str, default_region: str = "ID") -> Optional[str]:
        if not raw_num:
            return None
        clean = re.sub(r'[^0-9+]', '', raw_num)
        if len(clean) < 7:
            return None
        try:
            parsed = phonenumbers.parse(raw_num if raw_num.startswith('+') else ('+62' + raw_num.lstrip('0') if raw_num.startswith('0') else raw_num), default_region)
            if phonenumbers.is_valid_number(parsed):
                return phonenumbers.format_number(parsed, PhoneNumberFormat.INTERNATIONAL)
        except Exception:
            pass
        return None

contact_extractor = GroundedContactExtractor()
