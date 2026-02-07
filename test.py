import os
import certifi

# MUST be set before requests/urllib3 is imported
os.environ["SSL_CERT_FILE"] = certifi.where()
os.environ["REQUESTS_CA_BUNDLE"] = certifi.where()

import requests
from urllib.robotparser import RobotFileParser
from urllib.parse import urljoin

base_url = "https://www.fortytwolabs.com"

# robots.txt
rp = RobotFileParser()
rp.set_url(urljoin(base_url, "/robots.txt"))
rp.read()

if not rp.can_fetch("*", base_url):
    raise Exception("Crawling not allowed")

# sitemap
sitemap_url = urljoin(base_url, "/sitemap.xml")

resp = requests.get(
    sitemap_url,
    timeout=10
)

print(resp.status_code)
print(resp.text)