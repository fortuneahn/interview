"""Regenerate all bundled voices. Only the built-in example text is sent for speech synthesis."""
import json
from pathlib import Path
import subprocess
import sys

BASE = Path(__file__).resolve().parent
PACKS = [('male', 'ko-KR-InJoonNeural', '인준 · 차분한 남성'),
         ('hyunsu', 'ko-KR-HyunsuMultilingualNeural', '현수 · 또렷한 남성'),
         ('sunhi', 'ko-KR-SunHiNeural', '선희 · 부드러운 여성')]

def combine():
    manifests = []
    for pack, voice, label in PACKS:
        raw = (BASE / 'dist' / (pack + '-audio.js')).read_text(encoding='utf-8')
        manifests.append(json.loads(raw.split('=', 1)[1].rstrip(';\n')))
    primary = manifests[0]
    primary['voices'] = [dict(id='bundled-' + pack, label=label, **manifest)
                         for (pack, _, label), manifest in zip(PACKS[1:], manifests[1:])]
    (BASE / 'dist' / 'male-audio.js').write_text('window.MALE_AUDIO=' + json.dumps(primary, ensure_ascii=False) + ';\n', encoding='utf-8')

if __name__ == '__main__':
    if '--combine-only' not in sys.argv:
        for _, voice, _ in PACKS:
            subprocess.run([sys.executable, str(BASE / 'generate-male-audio.py'), '--voice', voice], cwd=BASE, check=True)
    combine()
