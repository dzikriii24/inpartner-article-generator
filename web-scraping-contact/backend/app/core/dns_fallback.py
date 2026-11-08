"""
Resilient DNS Fallback Resolver.
Provides transparent DNS-over-HTTPS (DoH) fallback via direct IP (Cloudflare 1.1.1.1 and Google 8.8.8.8)
when standard OS socket.getaddrinfo fails (e.g. [Errno 11001] getaddrinfo failed on restrictive ISPs).
"""

import socket
import ssl
import json
import logging
import urllib.request
from typing import Optional, Dict

logger = logging.getLogger(__name__)

_orig_getaddrinfo = socket.getaddrinfo
_dns_cache: Dict[str, str] = {}
_installed = False

# Direct IP endpoints for DoH — require NO prior DNS resolution
_DOH_ENDPOINTS = [
    ("https://1.1.1.1/dns-query?name={host}&type=A", {"accept": "application/dns-json"}),
    ("https://8.8.8.8/resolve?name={host}&type=A", {"Host": "dns.google"}),
]

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def _doh_resolve(host: str) -> Optional[str]:
    """Resolve hostname to IPv4 address using direct-IP DNS-over-HTTPS."""
    if not host or host in ("localhost", "127.0.0.1", "::1"):
        return None

    # Check if host is already an IP address
    parts = host.split(".")
    if len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts):
        return host

    if host in _dns_cache:
        return _dns_cache[host]

    for url_tmpl, headers in _DOH_ENDPOINTS:
        url = url_tmpl.format(host=host)
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=2.5, context=_ssl_ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                answers = data.get("Answer", [])
                for ans in answers:
                    if ans.get("type") == 1:  # Type 1 = A record (IPv4)
                        ip = ans.get("data")
                        if ip:
                            _dns_cache[host] = ip
                            logger.info(f"[DNS Fallback] Resolved '{host}' -> {ip} via DoH")
                            return ip
        except Exception as e:
            logger.debug(f"[DNS Fallback] DoH attempt for '{host}' on {url[:25]} failed: {e}")

    return None


def _fallback_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """Intercept socket.getaddrinfo and fallback to DoH on resolution failure."""
    try:
        return _orig_getaddrinfo(host, port, family, type, proto, flags)
    except socket.gaierror:
        # Standard DNS failed, attempt DoH fallback
        host_str = str(host) if host is not None else ""
        ip = _doh_resolve(host_str)
        if ip:
            try:
                # Return getaddrinfo for resolved IP
                return _orig_getaddrinfo(ip, port, family, type, proto, flags)
            except Exception:
                pass
        # If fallback also fails, re-raise original exception
        raise


def install_dns_fallback():
    """Install the DoH fallback into socket.getaddrinfo."""
    global _installed
    if not _installed:
        socket.getaddrinfo = _fallback_getaddrinfo
        _installed = True
        logger.info("[DNS Fallback] Resilient DoH DNS fallback installed successfully")
