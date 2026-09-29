"""
Move GET /resources/shortage-alerts BEFORE GET /resources/{resource_id}
so FastAPI matches the static path first.
"""

with open("main.py", "r", encoding="utf-8") as f:
    lines = f.readlines()

# ── Find the shortage-alerts block ──────────────────────────────────────────
# Block starts at the SHORTAGE_THRESHOLD = 50 line
# Block ends after the closing line of get_shortage_alerts function
# (the line containing "return {"alerts": alerts, "count": len(alerts)}")

block_start = None
block_end = None

for i, line in enumerate(lines):
    stripped = line.strip()
    if stripped == "SHORTAGE_THRESHOLD = 50" and block_start is None:
        block_start = i
    if block_start is not None and 'return {"alerts": alerts, "count": len(alerts)}' in stripped:
        # include the blank line after
        block_end = i + 1
        # skip trailing blank lines to include them in block
        while block_end < len(lines) and lines[block_end].strip() == "":
            block_end += 1
        break

if block_start is None or block_end is None:
    print(f"ERROR: Could not find shortage block. start={block_start} end={block_end}")
    exit(1)

print(f"Shortage block: lines {block_start+1} to {block_end}")

# ── Find GET /resources/{resource_id} ───────────────────────────────────────
insert_before = None
for i, line in enumerate(lines):
    if '@app.get("/resources/{resource_id}")' in line:
        insert_before = i
        break

if insert_before is None:
    print("ERROR: Could not find @app.get(\"/resources/{resource_id}\")")
    exit(1)

print(f"Insert before line: {insert_before+1}")

if block_start < insert_before:
    print("Block is already BEFORE resource_id route — no change needed.")
    exit(0)

# ── Extract and reinsert ─────────────────────────────────────────────────────
block = lines[block_start:block_end]
remaining = lines[:block_start] + lines[block_end:]

# Find new insert position in remaining
new_insert = None
for i, line in enumerate(remaining):
    if '@app.get("/resources/{resource_id}")' in line:
        new_insert = i
        break

new_lines = remaining[:new_insert] + block + remaining[new_insert:]

with open("main.py", "w", encoding="utf-8") as f:
    f.writelines(new_lines)

print(f"Done. Moved shortage-alerts block ({len(block)} lines) before resource_id route.")
