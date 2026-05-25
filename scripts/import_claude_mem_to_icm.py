import json
import sqlite3
import subprocess
import sys
from pathlib import Path


PROJECT = "Projeto_Casais_RFI"
TOPIC = "projeto-casais-rfi"
CLAUDE_MEM_DB = Path.home() / ".claude-mem" / "claude-mem.db"
STATE_PATH = Path.home() / ".claude-mem" / "icm-import-state.json"
ICM_BIN = Path.home() / "AppData" / "Local" / "icm" / "bin" / "icm.exe"


def load_state():
    if not STATE_PATH.exists():
        return {"imported_observation_ids": []}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"imported_observation_ids": []}


def save_state(state):
    STATE_PATH.write_text(json.dumps(state, indent=2), encoding="utf-8")


def decode_json_field(value):
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if item]
    except Exception:
        pass
    return []


def map_importance(obs_type):
    return {
        "decision": "high",
        "bugfix": "high",
        "change": "high",
        "feature": "medium",
        "discovery": "medium",
    }.get(obs_type or "", "medium")


def build_content(row):
    facts = decode_json_field(row["facts"])
    files_read = decode_json_field(row["files_read"])
    files_modified = decode_json_field(row["files_modified"])

    parts = []
    if row["type"]:
        parts.append(f"Type: {row['type']}.")
    if row["title"]:
        parts.append(f"Title: {row['title']}.")
    if row["subtitle"]:
        parts.append(f"Subtitle: {row['subtitle']}.")
    if facts:
        parts.append("Facts: " + "; ".join(facts[:6]) + ".")
    if row["narrative"]:
        narrative = " ".join(str(row["narrative"]).split())
        parts.append(f"Narrative: {narrative[:900]}.")
    if files_read:
        parts.append("Files read: " + ", ".join(Path(p).name for p in files_read[:6]) + ".")
    if files_modified:
        parts.append("Files modified: " + ", ".join(Path(p).name for p in files_modified[:6]) + ".")

    content = " ".join(parts)
    return content[:1800]


def build_keywords(row):
    concepts = decode_json_field(row["concepts"])
    base = [row["type"] or "", "claude-mem-import", "historical"]
    keywords = []
    for item in base + concepts:
        cleaned = str(item).strip().lower()
        if cleaned and cleaned not in keywords:
            keywords.append(cleaned)
    return ",".join(keywords[:12])


def import_observation(row):
    content = build_content(row)
    cmd = [
        str(ICM_BIN),
        "store",
        "--topic",
        TOPIC,
        "--content",
        content,
        "--importance",
        map_importance(row["type"]),
    ]

    keywords = build_keywords(row)
    if keywords:
        cmd.extend(["--keywords", keywords])

    raw = f"claude-mem observation #{row['id']} | created_at={row['created_at']}"
    cmd.extend(["--raw", raw])

    subprocess.run(cmd, check=True)


def main():
    if not CLAUDE_MEM_DB.exists():
        print(f"Claude-mem DB not found: {CLAUDE_MEM_DB}", file=sys.stderr)
        return 1
    if not ICM_BIN.exists():
        print(f"ICM binary not found: {ICM_BIN}", file=sys.stderr)
        return 1

    state = load_state()
    imported_ids = set(state.get("imported_observation_ids", []))

    conn = sqlite3.connect(str(CLAUDE_MEM_DB))
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, type, title, subtitle, facts, narrative, concepts,
               files_read, files_modified, created_at
        FROM observations
        WHERE project = ?
        ORDER BY created_at_epoch ASC
        """,
        (PROJECT,),
    )

    imported = 0
    skipped = 0
    for row in cur.fetchall():
        obs_id = int(row["id"])
        if obs_id in imported_ids:
            skipped += 1
            continue

        import_observation(row)
        imported_ids.add(obs_id)
        imported += 1

        state["imported_observation_ids"] = sorted(imported_ids)
        save_state(state)
        title = str(row["title"] or "").encode("cp1252", errors="replace").decode("cp1252")
        print(f"Imported observation {obs_id}: {title}")

    print(f"Done. Imported={imported} skipped={skipped} topic={TOPIC}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
