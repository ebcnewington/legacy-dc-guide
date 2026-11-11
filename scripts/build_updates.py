#!/usr/bin/env python3
"""Generate a static public trip announcement feed from trusted GitHub issues."""
import json
import os
import re
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPOSITORY = os.environ.get("GITHUB_REPOSITORY", "ebcnewington/legacy-dc-guide")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
PREFIX = "[Trip Update]"
TRUSTED_USERS = {"wearethebrowns"}
TRUSTED_ASSOCIATIONS = {"OWNER", "MEMBER", "COLLABORATOR"}
OUTPUT = Path("data/updates.json")


def fetch_issues():
    url = f"https://api.github.com/repos/{REPOSITORY}/issues?state=open&sort=created&direction=desc&per_page=100"
    headers = {"Accept": "application/vnd.github+json",
               "User-Agent": "ebc-legacy-tour-updates-builder",
               "X-GitHub-Api-Version": "2022-11-28"}
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.load(response)
    if not isinstance(data, list):
        raise ValueError("Expected a list of GitHub issues")
    return data


def allowed(issue):
    author = (issue.get("user") or {}).get("login", "").lower()
    association = issue.get("author_association", "").upper()
    title = issue.get("title", "")
    return ("pull_request" not in issue
            and title.lower().startswith(PREFIX.lower())
            and (author in TRUSTED_USERS or association in TRUSTED_ASSOCIATIONS)
            and issue.get("state") == "open")


def issue_expiry(body):
    """Optional UTC expiry in a private issue-body comment."""
    match = re.search(r"<!--\s*expires_at:\s*(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ)\b[^>]*-->", body or "", flags=re.IGNORECASE)
    if not match:
        return None
    return datetime.fromisoformat(match.group(1).replace("Z", "+00:00"))


def clean_body(body):
    body = re.sub(r"<!--.*?-->", "", body or "", flags=re.DOTALL)
    body = re.sub(r"^\s*###\s+Update message\s*\n+", "", body, flags=re.IGNORECASE)
    return body.strip()[:4000]


def main():
    updates = []
    for issue in fetch_issues():
        if not allowed(issue):
            continue
        expiry = issue_expiry(issue.get("body"))
        if expiry and expiry <= datetime.now(timezone.utc):
            continue
        message = clean_body(issue.get("body"))
        if not message:
            continue
        updates.append({
            "id": issue.get("number"),
            "title": issue["title"][len(PREFIX):].strip()[:160] or "Trip update",
            "message": message,
            "created_at": issue.get("created_at"),
            "updated_at": issue.get("updated_at"),
            "expires_at": expiry.isoformat().replace("+00:00", "Z") if expiry else None,
        })
        if len(updates) >= 30:
            break
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps({
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "updates": updates,
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Published {len(updates)} trusted trip update(s)")


if __name__ == "__main__":
    main()
