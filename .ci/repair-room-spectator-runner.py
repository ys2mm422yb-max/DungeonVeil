from pathlib import Path

source_path = Path('.ci/apply-room-spectator-firelands.mjs')
target_path = Path('.ci/apply-room-spectator-firelands.repaired.mjs')
text = source_path.read_text(encoding='utf-8')

# The runner writes TypeScript files through multiline JavaScript template literals.
# Escape template literals that belong to the generated TypeScript while preserving
# the outer delimiters used by the runner itself.
pos = 0
while True:
    call = text.find("write('", pos)
    if call < 0:
        break
    opening = text.find('`', call)
    closing = text.find('\n`);', opening + 1)
    if opening < 0 or closing < 0:
        raise RuntimeError(f'Unable to locate write template near offset {call}')
    body = text[opening + 1:closing].replace('`', r'\`')
    text = text[:opening + 1] + body + text[closing:]
    pos = opening + 1 + len(body) + len('\n`);')

pos = 0
while True:
    call = text.find('patch(', pos)
    if call < 0:
        break
    next_patch = text.find('\npatch(', call + 1)
    next_write = text.find('\nwrite(', call + 1)
    boundaries = [value for value in (next_patch, next_write, len(text)) if value >= 0]
    boundary = min(boundaries)
    marker = text.find('\n  `', call, boundary)
    if marker < 0:
        pos = boundary
        continue
    opening = marker + 3
    closing = text.find('`,\n);', opening + 1)
    if closing < 0:
        raise RuntimeError(f'Unable to locate patch template near offset {call}')
    body = text[opening + 1:closing].replace('`', r'\`')
    text = text[:opening + 1] + body + text[closing:]
    pos = opening + 1 + len(body) + len('`,\n);')

target_path.write_text(text, encoding='utf-8')
print(f'Repaired runner written to {target_path}')
