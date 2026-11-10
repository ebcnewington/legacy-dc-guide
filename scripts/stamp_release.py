#!/usr/bin/env python3
"""Stamp each Pages artifact with a unique release identifier.

GitHub issue edits deploy the static updates feed without source commits, so
use the workflow run ID rather than only the commit hash.
"""
import json
import os
import re
from pathlib import Path

run = os.environ.get("GITHUB_RUN_ID", "")
attempt = os.environ.get("GITHUB_RUN_ATTEMPT", "1")
identifier = f"{run}-{attempt}"
if not re.fullmatch(r"[0-9]{1,40}-[0-9]{1,10}", identifier):
    raise SystemExit("GitHub workflow release ID is missing or invalid")

html_file = Path("index.html")
html = html_file.read_text(encoding="utf-8")
placeholder = "__EBC_BUILD_ID__"
if html.count(placeholder) < 4:
    raise SystemExit("Missing stamped build markers in index.html")

html_file.write_text(html.replace(placeholder, identifier), encoding="utf-8")
version_file = Path("data/site-version.json")
version_file.parent.mkdir(parents=True, exist_ok=True)
version_file.write_text(
    json.dumps({"id": identifier, "source": "github-pages"}, indent=2) + "\n",
    encoding="utf-8",
)
assert identifier in html_file.read_text(encoding="utf-8")
assert version_file.exists()
print("Stamped current release:", identifier)
