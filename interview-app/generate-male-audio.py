"""Build static Korean male narration; requires edge-tts from PyPI.

Only the existing, public question bank is sent to Microsoft's speech service.
The deployed app plays bundled MP3s and does not call the generation service.
"""
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(tempfile.gettempdir()) / 'interview-tts-deps'))
import edge_tts

BASE = Path(__file__).resolve().parent
VOICE = 'ko-KR-InJoonNeural'
PREVIEW = '지원자님, 지금부터 면접을 시작하겠습니다. 질문을 듣고 본인의 경험을 바탕으로 답변해 주십시오.'

async def main():
    voices = await edge_tts.list_voices()
    chosen = next(v for v in voices if v['ShortName'] == VOICE)
    assert chosen['Gender'] == 'Male' and chosen['Locale'] == 'ko-KR'
    print('Selected:', chosen['ShortName'], chosen['Gender'], flush=True)
    bank = json.loads(subprocess.check_output(['node', '-e', "process.stdout.write(JSON.stringify(require('./dist/questions.js')))"], cwd=BASE).decode('utf-8'))
    out = BASE / 'dist' / 'audio' / 'male'
    out.mkdir(parents=True, exist_ok=True)
    clips = [{'text': PREVIEW, 'name': 'preview'}]
    for q in bank:
        clips.extend({'text': q[field], 'name': q['id'] + '-' + field} for field in ('text', 'follow', 'model'))
    if '--sample' in sys.argv:
        clips = clips[:1]
    semaphore = asyncio.Semaphore(3)
    async def generate(clip):
        digest = hashlib.sha256(clip['text'].encode()).hexdigest()[:10]
        filename = clip.pop('name') + '-' + digest + '.mp3'
        clip['src'] = 'audio/male/' + filename
        dest = out / filename
        async with semaphore:
            if not dest.exists() or dest.stat().st_size < 1000:
                for attempt in range(3):
                    try:
                        await edge_tts.Communicate(clip['text'], VOICE, rate='+0%', pitch='-5Hz').save(str(dest))
                        assert dest.stat().st_size > 1000
                        break
                    except Exception:
                        if attempt == 2:
                            raise
                        await asyncio.sleep(2)
            print('Ready:', filename, dest.stat().st_size, flush=True)
    await asyncio.gather(*(generate(c) for c in clips))
    if '--sample' not in sys.argv:
        manifest = {'voice': VOICE, 'gender': 'Male', 'clips': clips}
        (BASE / 'dist' / 'male-audio.js').write_text('window.MALE_AUDIO=' + json.dumps(manifest, ensure_ascii=False) + ';\n', encoding='utf-8')
        print('Complete:', len(clips), 'clips', flush=True)

asyncio.run(main())
