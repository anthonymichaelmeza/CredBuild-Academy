#!/usr/bin/env python3
"""Bounded, reproducible research-access audit of explicitly selected URLs.

This is an operator-run access audit, not an unrestricted crawler. It attempts
only the supplied URLs, eight official supplementary seeds and one constructed
publisher-site title query for each of the 21 supplied bibliography entries.
Constructed queries are not discovered product links. No child links are followed,
no authentication is attempted, and no technical or bibliographic verification is
created. HTTP responses and their content are separate from proxy CONNECT errors.

The ordinary urllib proxy configuration is retained. Authentication, paywalls,
CAPTCHAs, 401/403 responses and transport restrictions are never bypassed or
retried. Only temporary failures receive at most two bounded backoff retries.
Public response snapshots are stored privately in the selected output directory;
no book full-text URL is constructed or fetched.
"""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import socket
import subprocess
import threading
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_BYTES = 8 * 1024 * 1024
TIMEOUT_SECONDS = 10
MAX_ATTEMPTS = 3
MAX_WORKERS = 2
MIN_HOST_INTERVAL_SECONDS = 1.0

MANDATORY = [
    ("mandatory-bcsp-chst", "https://www.bcsp.org/construction-health-and-safety-technician-chst", "BCSP CHST certification", "Board of Certified Safety Professionals", "exam_objective"),
    ("mandatory-bcsp-blueprint", "https://www.bcsp.org/wp-content/uploads/2024/04/CHST5-Blueprint.pdf", "CHST5 Examination Blueprint", "Board of Certified Safety Professionals", "exam_objective"),
    ("mandatory-bcsp-reference-list", "https://www.bcsp.org/hubfs/Website/Blueprints-References/CHST-References.pdf?hsLang=en", "BCSP CHST reference list", "Board of Certified Safety Professionals", "bibliography"),
    ("mandatory-bcsp-exam-collection", "https://bcsphub.com/collections/exams", "BCSP examination resource collection", "Board of Certified Safety Professionals", "publisher_catalog"),
    ("mandatory-osha-1926", "https://www.osha.gov/laws-regs/regulations/standardnumber/1926/", "Construction Standards: 29 CFR 1926", "Occupational Safety and Health Administration", "regulatory_requirement"),
    ("mandatory-osha-construction", "https://www.osha.gov/construction", "OSHA Construction Resources", "Occupational Safety and Health Administration", "professional_guidance"),
    ("mandatory-osha-etool", "https://www.osha.gov/etools/construction/", "OSHA Construction eTool", "Occupational Safety and Health Administration", "professional_guidance"),
    ("mandatory-osha-regulations", "https://www.osha.gov/laws-regs", "OSHA Regulations", "Occupational Safety and Health Administration", "regulatory_requirement"),
    ("mandatory-osha-publications", "https://www.osha.gov/publications", "OSHA Publications", "Occupational Safety and Health Administration", "publisher_catalog"),
    ("mandatory-osha-topics", "https://www.osha.gov/a-z", "OSHA Safety and Health Topics", "Occupational Safety and Health Administration", "professional_guidance"),
    ("mandatory-osha-1910", "https://www.osha.gov/laws-regs/regulations/standardnumber/1910/", "OSHA General Industry: 29 CFR 1910", "Occupational Safety and Health Administration", "regulatory_requirement_applicability_unconfirmed"),
    ("mandatory-osha-interpretations", "https://www.osha.gov/laws-regs/standardinterpretations", "OSHA Letters of Interpretation", "Occupational Safety and Health Administration", "regulatory_interpretation"),
    ("mandatory-niosh", "https://www.cdc.gov/niosh/", "NIOSH", "National Institute for Occupational Safety and Health", "technical_research"),
    ("mandatory-cdc-stacks", "https://stacks.cdc.gov/", "CDC Stacks", "Centers for Disease Control and Prevention", "technical_research"),
]
SUPPLEMENTARY = [
    ("supplement-fema", "https://www.fema.gov/", "FEMA", "Federal Emergency Management Agency", "professional_guidance"),
    ("supplement-nfpa", "https://www.nfpa.org/", "NFPA", "National Fire Protection Association", "consensus_standard_candidate"),
    ("supplement-ansi", "https://www.ansi.org/", "ANSI", "American National Standards Institute", "consensus_standard_candidate"),
    ("supplement-assp", "https://www.assp.org/", "ASSP", "American Society of Safety Professionals", "consensus_standard_candidate"),
    ("supplement-epa", "https://www.epa.gov/", "EPA", "United States Environmental Protection Agency", "regulatory_guidance_candidate"),
    ("supplement-niosh-face", "https://www.cdc.gov/niosh/face/", "NIOSH FACE", "National Institute for Occupational Safety and Health", "technical_research"),
    ("supplement-cpwr", "https://www.cpwr.com/", "CPWR", "The Center for Construction Research and Training", "technical_research"),
    ("supplement-ccohs", "https://www.ccohs.ca/", "CCOHS", "Canadian Centre for Occupational Health and Safety", "supplemental_guidance_not_us_regulation"),
]
PUBLISHER_SEARCH = {
    "American Society of Safety Engineers": ("https://www.assp.org/search", "searchQuery", "ASSP candidate successor catalog for ASSE-listed publication"),
    "John Wiley & Sons, Inc": ("https://www.wiley.com/en-us/search", "pq", "Wiley official-site title query candidate"),
    "National Safety Council": ("https://www.nsc.org/search", "query", "National Safety Council official-site title query candidate"),
    "The McGraw-Hill Companies, Inc": ("https://www.mheducation.com/search.html", "searchQuery", "McGraw Hill official-site title query candidate"),
    "Taylor & Francis Group, LLC": ("https://www.routledge.com/search", "kw", "Routledge/Taylor & Francis official-site title query candidate"),
    "Pearson Education, Inc": ("https://www.pearson.com/en-us/search.html", "aq", "Pearson official-site title query candidate"),
    None: ("https://www.bcsp.org/", "s", "BCSP official-site title query candidate"),
}
ALLOWED_HOSTS = {
    "www.bcsp.org", "bcsphub.com", "www.osha.gov", "www.cdc.gov", "stacks.cdc.gov",
    "www.fema.gov", "www.nfpa.org", "www.ansi.org", "www.assp.org", "www.epa.gov",
    "www.cpwr.com", "www.ccohs.ca", "www.wiley.com", "www.nsc.org", "www.mheducation.com",
    "www.routledge.com", "www.pearson.com",
}
INFERRED_DOMAINS = [
    ["2"], ["3", "4"], ["1", "3"], ["1", "3"], ["3", "4"], ["4"],
    ["1", "3", "4"], ["1", "3"], ["2"], ["1"], ["1", "3"], ["1"],
    ["4"], ["1"], ["1", "3"], ["3", "4"], ["1", "3"], ["1", "2"],
    ["3", "4"], ["1", "2", "3", "4"], ["3", "4"],
]
HIGH_PRIORITY = {1, 2, 6, 7, 10, 12, 14, 18, 19}


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def allowed(url):
    parsed = urlsplit(url)
    return (parsed.scheme == "https" and parsed.hostname in ALLOWED_HOSTS
            and not parsed.username and not parsed.password
            and parsed.port in (None, 443))


class ScopedRedirects(HTTPRedirectHandler):
    def __init__(self):
        super().__init__()
        self.events = []

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self.events.append({"from": req.full_url, "to": newurl, "httpStatus": code,
                            "allowed": allowed(newurl)})
        if not allowed(newurl):
            raise URLError("Redirect outside the explicit HTTPS allowlist; not followed")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class PageTitle(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_title = False
        self.parts = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() == "title":
            self.in_title = True

    def handle_endtag(self, tag):
        if tag.lower() == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.parts.append(data)


_host_clock = {}
_clock_lock = threading.Lock()


def throttle(url):
    host = urlsplit(url).hostname
    with _clock_lock:
        now = time.monotonic()
        delay = max(0.0, _host_clock.get(host, 0.0) - now)
        _host_clock[host] = now + delay + MIN_HOST_INTERVAL_SECONDS
    if delay:
        time.sleep(delay)


def bibliography(repo):
    command = ["node", "--input-type=module", "-e",
               "import {chstBibliography} from './src/modules/curriculum/catalog.ts'; process.stdout.write(JSON.stringify(chstBibliography));"]
    return json.loads(subprocess.check_output(command, cwd=repo, text=True))


def source_records(books):
    result = []
    for group, entries in [("mandatory", MANDATORY), ("supplementary_candidate", SUPPLEMENTARY)]:
        for source_id, url, title, publisher, category in entries:
            result.append({"sourceId": source_id, "parentSourceId": None, "url": url,
                           "seedTitle": title, "publisher": publisher, "sourceCategory": category,
                           "group": group, "discoveryBasis": "explicit_user_url" if group == "mandatory" else "operator_selected_official_seed"})
    for book in books:
        base, key, provenance = PUBLISHER_SEARCH[book["publisher"]]
        query = book["title"].replace(";", " ")
        result.append({"sourceId": f"publisher-search-{book['id']}", "parentSourceId": book["id"],
                       "url": base + "?" + urlencode({key: query}), "seedTitle": book["title"],
                       "publisher": book["publisher"] or "Board of Certified Safety Professionals",
                       "sourceCategory": "publisher_catalog", "group": "bibliography_title_query",
                       "discoveryBasis": "constructed_official_site_title_query_not_a_discovered_product_link",
                       "queryProvenance": provenance, "bibliographyId": book["id"]})
    return result


def audit_one(source, snapshot_dir):
    url = source["url"]
    if not allowed(url):
        raise ValueError("A seed is outside the immutable allowlist")
    result = {**source, "status": "Failed", "resolvedUrl": None, "pageTitle": None,
              "publicationDate": None, "retrievedAt": None, "contentType": None,
              "format": None, "formatHint": "pdf" if urlsplit(url).path.lower().endswith(".pdf") else "html_candidate",
              "accessStatus": "not_yet_determined", "parseStatus": "not_attempted",
              "licensingStatus": "not_confirmed", "pageCount": None, "pagesProcessed": 0,
              "sectionsProcessed": 0, "mappedObjectives": [], "contentVerificationStatus": "unverified",
              "contentHash": None, "snapshotPath": None, "childLinksFollowed": [], "attempts": []}
    for number in range(1, MAX_ATTEMPTS + 1):
        throttle(url)
        redirects = ScopedRedirects()
        opener = build_opener(redirects)  # Retains ordinary environment HTTPS proxy behavior.
        attempt = {"attempt": number, "startedAt": utc_now(), "url": url,
                   "targetHttpStatus": None, "proxyConnectStatus": None,
                   "redirects": [], "responseBytes": 0, "retrieved": False, "error": None,
                   "retryScheduled": False}
        temporary = False
        try:
            request = Request(url, headers={"User-Agent": "CredBuiltResearchAudit/0.1 (bounded operator URL audit)",
                                           "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.5"})
            with opener.open(request, timeout=TIMEOUT_SECONDS) as response:
                attempt["targetHttpStatus"] = response.status
                result["resolvedUrl"] = response.geturl()
                result["contentType"] = response.headers.get("Content-Type")
                body = response.read(MAX_BYTES + 1)
                if len(body) > MAX_BYTES:
                    raise ValueError("Response exceeded the bounded 8 MiB audit limit; not processed")
                attempt["responseBytes"] = len(body)
                attempt["retrieved"] = True
                result["retrievedAt"] = utc_now()
                result["accessStatus"] = "retrieved_public_response_rights_not_confirmed"
                result["status"] = "Retrieved"
                digest = hashlib.sha256(body).hexdigest()
                result["contentHash"] = digest
                result["format"] = "pdf" if body.startswith(b"%PDF-") else "html" if "html" in (result["contentType"] or "").lower() else "other"
                extension = {"pdf": "pdf", "html": "html", "other": "bin"}[result["format"]]
                file_path = snapshot_dir / f"{digest}.{extension}"
                file_path.write_bytes(body)
                result["snapshotPath"] = str(file_path)
                if result["format"] == "html":
                    parser = PageTitle()
                    parser.feed(body.decode(response.headers.get_content_charset() or "utf-8", errors="replace"))
                    result["pageTitle"] = " ".join(" ".join(parser.parts).split()) or None
                result["parseStatus"] = "metadata_only_not_content_processed"
        except HTTPError as error:
            attempt["targetHttpStatus"] = error.code
            attempt["error"] = f"Target HTTP response {error.code}; no restricted content fetched"
            result["accessStatus"] = "publisher_restricted_access" if error.code in (401, 403) else "not_found" if error.code == 404 else "target_http_error"
            result["status"] = "Restricted Access" if error.code in (401, 403) else "Not Found" if error.code == 404 else "Failed"
            temporary = error.code in (429, 500, 502, 503, 504)
        except URLError as error:
            detail = str(error.reason)
            proxy_match = re.search(r"Tunnel connection failed:\s*(\d{3})", detail, re.I)
            if proxy_match:
                attempt["proxyConnectStatus"] = int(proxy_match.group(1))
                result["accessStatus"] = "workspace_proxy_connect_denied"
                attempt["error"] = f"Workspace HTTPS proxy denied CONNECT ({proxy_match.group(1)}) before reaching target; target HTTP status unknown"
            else:
                result["accessStatus"] = "transport_failure"
                attempt["error"] = re.sub(r"https?://[^/\s]*@", "[redacted-proxy]@", detail)
                temporary = isinstance(error.reason, (TimeoutError, socket.timeout, ConnectionResetError))
        except (TimeoutError, socket.timeout, ConnectionResetError) as error:
            result["accessStatus"] = "temporary_transport_failure"
            attempt["error"] = type(error).__name__
            temporary = True
        except Exception as error:
            result["accessStatus"] = "audit_processing_failure"
            attempt["error"] = f"{type(error).__name__}: {str(error)}"
        attempt["redirects"] = redirects.events
        attempt["finishedAt"] = utc_now()
        if temporary and number < MAX_ATTEMPTS:
            attempt["retryScheduled"] = True
            attempt["retryBackoffSeconds"] = min(2 ** (number - 1), 4)
        result["attempts"].append(attempt)
        if not attempt["retryScheduled"]:
            break
        time.sleep(attempt["retryBackoffSeconds"])
    result["errorNotes"] = result["attempts"][-1]["error"]
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default=".local/chst-research-audit")
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    output_dir = Path(args.output_dir).resolve()
    snapshots = output_dir / "snapshots"
    snapshots.mkdir(parents=True, exist_ok=True)
    books = bibliography(repo)
    if len(books) != 21:
        raise ValueError("Expected all 21 transcribed bibliography entries")
    sources = source_records(books)
    if len(sources) != 43 or len({entry["url"] for entry in sources}) != 43:
        raise ValueError("Audit must have 14 mandatory, 21 title queries, and 8 supplementary unique URLs")
    started = utc_now()
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        results = list(executor.map(lambda source: audit_one(source, snapshots), sources))
    all_attempts = [attempt for result in results for attempt in result["attempts"]]
    summary = {"mandatorySuppliedUrls": 14, "mandatoryUrlsAttempted": sum(entry["group"] == "mandatory" for entry in results),
               "supplementarySeedUrls": 8, "individualBibliographyTitleQueries": 21,
               "distinctUrlsAttempted": len({entry["url"] for entry in results}), "retrievalAttempts": len(all_attempts),
               "successfullyAccessedUrls": sum(any(a["retrieved"] for a in entry["attempts"]) for entry in results),
               "documentsRetrieved": sum(entry["retrievedAt"] is not None for entry in results),
               "documentsContentProcessed": 0, "sourceSectionsIndexed": 0, "relevantSupportingUrlsDiscovered": 0,
               "childLinksFollowed": 0, "proxyConnectDenied": sum(a["proxyConnectStatus"] == 403 for a in all_attempts),
               "additionalAccessRequired": sum(entry["retrievedAt"] is None for entry in results),
               "retryAttempts": sum(a["attempt"] > 1 for a in all_attempts), "verifiedSources": 0,
               "bookContentsProcessed": 0, "newerBookEditionsConfirmed": 0}
    audit = {"schemaVersion": 1, "startedAt": started, "finishedAt": utc_now(),
             "policy": {"mode": "bounded_operator_selected_url_access_audit", "maximumConcurrency": MAX_WORKERS,
                        "timeoutSeconds": TIMEOUT_SECONDS, "maximumResponseBytes": MAX_BYTES,
                        "minimumHostIntervalSeconds": MIN_HOST_INTERVAL_SECONDS, "maximumAttemptsPerUrl": MAX_ATTEMPTS,
                        "childLinkDepth": 0, "automaticallyFollowedChildLinks": False,
                        "publisherQueriesAreConstructedNotDiscoveredProductLinks": True,
                        "restrictionBypass": False, "proxyBehavior": "ordinary_environment_configuration_preserved",
                        "robotsPolicy": "No recursive crawl or discovered-link following. Publisher crawling policies remain unexamined when network access is denied."},
             "summary": summary, "sources": results}
    (output_dir / "network-audit-input.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2) + "\n")
    by_id = {entry["sourceId"]: entry for entry in results}
    book_results = []
    for index, book in enumerate(books, 1):
        result = by_id[f"publisher-search-{book['id']}"]
        book_results.append({**book, "listedMetadataProvenance": "User-supplied BCSP CHST bibliography V.2021.06.09; not a current publisher lookup",
                             "publisherQueryUrl": result["url"], "publisherQuerySourceId": result["sourceId"],
                             "queryBasis": result["discoveryBasis"], "queryAccessStatus": result["accessStatus"],
                             "availabilityStatus": "not_confirmed_network_blocked" if result["retrievedAt"] is None else "publisher_response_requires_analysis",
                             "listedEditionConfirmedFromAttachment": True, "currentEdition": None, "newerEditionExists": None,
                             "legallyAccessibleDigitalFormats": [], "authorizedDownloadLinksConfirmed": [],
                             "sampleChaptersConfirmed": [], "tablesOfContentsConfirmed": [], "libraryAccessOptionsConfirmed": [],
                             "purchaseOrSubscriptionRequirements": "Not confirmed; obtain publisher/library terms or an authorized copy before processing text",
                             "contentsProcessed": False, "contentEvidenceLevel": "bibliographic_information_only",
                             "inferredDomainRelevance": INFERRED_DOMAINS[index - 1],
                             "relevanceBasis": "Title-only editorial inference; no chapter or text contents were examined",
                             "acquisitionPriority": "high" if index in HIGH_PRIORITY else "medium",
                             "priorityBasis": "Provisional curriculum acquisition triage, not a claim of examined coverage or comparative quality",
                             "authorizedCopyNeededForContentAnalysis": True,
                             "purchaseRequirementConfirmed": False,
                             "rightsStatus": "Publisher rights and distribution terms unexamined; no restricted text may be redistributed"})
    (output_dir / "book-audit-input.json").write_text(json.dumps({"schemaVersion": 1, "researchAuditFile": "network-audit-input.json",
                                                              "publications": book_results}, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == "__main__":
    main()
