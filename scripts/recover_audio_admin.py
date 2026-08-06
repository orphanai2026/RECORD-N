from pathlib import Path
import re

workflow_path = Path('.github/workflows/expand-audio-admin-controls.yml')
source = workflow_path.read_text(encoding='utf-8')
marker = "          python - <<'PY'\n"
start = source.index(marker) + len(marker)
end = source.index("\n          PY", start)
lines = source[start:end].splitlines()
script = '\n'.join(line[10:] if line.startswith('          ') else line for line in lines)

tolerant_helper = '''def replace_once(text, old, new, label):
    if old in text:
        return text.replace(old, new, 1)
    parts = [part for part in re.split(r'\\s+', old.strip()) if part]
    pattern = r'\\s+'.join(re.escape(part) for part in parts)
    updated, count = re.subn(pattern, lambda match: new, text, count=1)
    if count != 1:
        raise SystemExit(f'Missing replacement target: {label}')
    return updated'''

script, count = re.subn(
    r"def replace_once\(text, old, new, label\):\n\s+if old not in text:\n\s+raise SystemExit\(f'Missing replacement target: \{label\}'\)\n\s+return text\.replace\(old, new, 1\)",
    tolerant_helper,
    script,
    count=1,
)
if count != 1:
    raise SystemExit('Could not replace replace_once helper')

exec(compile(script, 'embedded-audio-admin-update.py', 'exec'), {'re': re})
workflow_path.unlink(missing_ok=True)
Path('.github/workflows/recover-audio-admin-controls.yml').unlink(missing_ok=True)
Path('scripts/recover_audio_admin.py').unlink(missing_ok=True)
