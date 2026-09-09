#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成词宠岛发音语音（微软 edge-tts 神经童声 en-US-AnaNeural）。
输出到 game/audio/，并生成 manifest.json 供前端按 key 取文件：
  word/<id>.mp3        单词（正常语速）
  word/<id>_slow.mp3   单词（慢速）
  syl/<syllable>.mp3   音节（慢速，用于音节拆分跟读）
  letter/<ch>.mp3      字母 A-Z
"""
import asyncio
import json
import os
import sys

import edge_tts

VOICE = "en-US-JennyNeural"
BASE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "game", "audio"))
CONCURRENCY = 6


def sanitize(en):
    import re
    return re.sub(r"[^a-z0-9]+", "-", en.lower()).strip("-")


def plan_tasks():
    here = os.path.dirname(os.path.abspath(__file__))
    words = json.load(open(os.path.join(here, "words_data.json"), encoding="utf-8"))
    tasks = []  # (key, text, rate)

    def add(en, rate="+0%"):
        key = "word/" + sanitize(en)
        tasks.append((key, en, rate))

    for w in words:
        add(w["en"])
        add(w["en"] + "_slow", "-35%")
    try:
        cur = json.load(open(os.path.join(here, "curriculum_data.json"), encoding="utf-8"))
        for sem in cur.values():
            for unit in sem["units"]:
                for item in unit["words"]:
                    en = item.split("|")[0].strip()
                    add(en)
    except FileNotFoundError:
        print("（无 curriculum_data.json，跳过课程语音）")
    syls = sorted({s.lower() for w in words for s in w["syl"]})
    for s in syls:
        tasks.append(("syl/" + s, s, "-25%"))
    for i in range(26):
        ch = chr(ord("a") + i)
        tasks.append(("letter/" + ch, ch.upper(), "-25%"))
    # 去重
    seen, uniq = set(), []
    for t in tasks:
        if t[0] not in seen:
            seen.add(t[0])
            uniq.append(t)
    return uniq


async def gen(sem, key, text, rate):
    out = os.path.join(BASE, key + ".mp3")
    if os.path.exists(out) and os.path.getsize(out) > 500:
        return
    async with sem:
        for attempt in (1, 2, 3):
            try:
                tts = edge_tts.Communicate(text, VOICE, rate=rate)
                await tts.save(out)
                return
            except Exception as e:
                if attempt == 3:
                    print("FAIL", key, e)
                else:
                    await asyncio.sleep(1.5 * attempt)


async def main():
    os.makedirs(BASE, exist_ok=True)
    for sub in ("word", "syl", "letter"):
        os.makedirs(os.path.join(BASE, sub), exist_ok=True)
    tasks = plan_tasks()
    print("共 %d 个语音文件" % len(tasks))
    sem = asyncio.Semaphore(CONCURRENCY)
    await asyncio.gather(*[gen(sem, k, t, r) for k, t, r in tasks])
    manifest = {k: "audio/" + k + ".mp3" for k, _, _ in tasks}
    with open(os.path.join(BASE, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=1)
    ok = sum(1 for k, _, _ in tasks if os.path.getsize(os.path.join(BASE, k + ".mp3")) > 500)
    print("完成 %d/%d" % (ok, len(tasks)))
    sys.exit(0 if ok == len(tasks) else 1)


if __name__ == "__main__":
    asyncio.run(main())
