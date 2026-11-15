#!/usr/bin/env python3
"""Writes the video prompts: one short motion prompt per story page, for any image-to-video tool.
Outputs docs/dadu/art-brief/video-prompts.json and video-prompt-book.html (a phone-friendly page with Copy buttons)."""
import csv, html, json, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BRIEF = os.path.join(ROOT, 'docs', 'dadu', 'art-brief')

BASE = ("Animate this exact picture as a short looping clip. Keep the premium chibi-anime painted style, the characters, the colours and the framing exactly the same. "
        "Smooth, gentle movement only. One continuous shot, no cuts, no new characters, no text, no speech bubbles, no sound. 6 seconds. {motion}")

MOTION = {
 'river_tree': 'The monkey reaches for a jamun and swings his tail; the crocodile blinks and smiles; the river ripples; leaves sway. Slow push-in.',
 'croc_wife': 'The crocodile wife licks her lips and gestures greedily, the husband looks worried; water ripples; the tree leaves sway. Slow push-in.',
 'river_ride': 'The crocodile swims steadily with the monkey on his back; the monkey waves his hands and laughs; the river flows; gentle camera drift to the right.',
 'tree_safe': 'The monkey on the branch wags a finger and smiles; the crocodile hangs his head and slowly swims away; leaves sway. Slow pull-out.',
 'jackal_vat': 'The jackal climbs out of the blue dye vat, shaking blue drops from his fur; night lights flicker; slow push-in.',
 'blue_king': 'The blue jackal stands proudly and lifts his chin; the animals bow slowly; leaves sway in the breeze. Slow push-in.',
 'howl_moon': 'The jackals tilt their heads up and howl at the full moon; the blue jackal joins in; the moon glows; slow push-in.',
 'lion_den': 'The lion paces and growls, the frightened animals tremble and huddle; light flickers through the trees. Slow push-in.',
 'rabbit_late': 'The rabbit looks up and speaks calmly while the lion leans in and listens; her ears twitch; grass sways. Slow push-in.',
 'lion_well': 'The lion leans over the well edge and roars at his reflection; water ripples; the rabbit watches from the side. Slow push-in.',
 'four_friends': 'The crow flies in a small circle above while the deer struggles in the net; the mouse and tortoise look up; leaves sway. Slow pull-out.',
 'mouse_net': 'The mouse gnaws the net rope; the deer holds still; the tortoise crawls slowly closer; gentle camera drift.',
 'escape_together': 'The deer springs up and leaps; the crow flaps away; the tortoise hurries into the water; the hunter stumbles back. Camera follows slightly to the right.',
 'ganga_mango': 'A mango floats down the river toward the king who reaches for it; monkeys in the tree sway and chatter; river ripples. Slow push-in.',
 'body_bridge': 'The monkey king stretches his body across the river as a bridge; the other monkeys scamper across one by one; slow camera drift to the right.',
 'king_learns': 'The human king gently holds the tired monkey king and listens; the monkey speaks softly; leaves drift down. Slow push-in.',
 'deer_kings': 'The two deer kings stand calmly and nod to each other; the king with the bow watches; grass and leaves sway. Slow push-in.',
 'golden_deer': 'The golden deer king walks calmly forward and lowers his head; the crowd watches in silence; light shimmers on his coat. Slow push-in.',
 'bow_down': 'The king slowly lowers his bow and bows his head; the golden deer lifts his head; sparkles drift in the air. Slow pull-out.',
 'farmer_well': 'The farmer points to the well and pleads with open hands; the rich man shakes his head and points a finger; the cow in the background swishes her tail. Slow push-in.',
 'birbal_court': 'Birbal gestures and speaks, the farmer folds his hands, Akbar strokes his chin and leans in; curtains sway softly. Slow push-in.',
 'court_laugh': 'The whole court laughs, shoulders shaking; the rich man bows his head; Akbar claps his hands; curtains sway. Slow pull-out.',
 'akbar_line': 'Akbar points at the line on the floor; the courtiers scratch their heads and glance at each other; guards stand still. Slow push-in.',
 'birbal_line': 'Birbal draws a longer line with the chalk; the courtiers lean forward and then smile; Akbar nods. Slow push-in.',
 'king_kittens': 'Courtiers cuddle fat cats that purr; the thin cat looks up at Tenali Raman, who smiles calmly; the king gestures; banners flutter. Slow push-in.',
 'cat_runs': 'The thin cat backs away and bolts from the bowl of milk; Tenali spreads his hands; the king raises his eyebrows; slow camera drift to the left.',
 'king_laughs': 'The king laughs and wipes his forehead while Tenali explains; the dreamy thought bubble glows; the cats purr. Slow push-in.',
 'thieves_garden': 'Tenali points toward the well and whispers; the wife looks worried; the three thieves peek over the wall and grin; the moon glows. Slow push-in.',
 'thieves_well': 'Tenali drops the box into the well with a big splash; the thieves haul up buckets and pour water, sweating; water splashes. Slow push-in.',
 'garden_watered': 'The thieves stumble and run away splashing through puddles; Tenali and his wife wave and laugh from the window; the sun rises. Slow push-in.',
 'tiger_bangle': 'The old tiger holds up the golden bangle and it sparkles; the traveller leans toward it curiously; the pond ripples; lotus flowers sway. Slow push-in.',
 'traveller_mud': 'The traveller sinks into the mud reaching out his hand; mud ripples and bubbles; the tiger watches and smiles; leaves sway. Slow push-in.',
 'dadaji_warns': 'The tiger grasps the traveller\'s hand; in the thought bubble Dadaji raises a finger as the children and pets listen. Slow push-in.',
 'mitthu_arrives': 'Mitthu the parrot flaps his wings on the branch and squawks cheerfully; Chintu laughs; the dog wags his tail; flowers sway. Slow push-in.',
 'mitthu_sings': 'Mitthu opens his beak and sings with spread wings; Chintu scratches his head; Dadaji taps the harmonium; musical sparkles float. Slow push-in.',
 'mitthu_job': 'Mitthu proudly puffs his chest, wearing his star medal; Dadaji pats Chintu\'s head; everyone cheers; sparkles. Slow push-in.',
}

def main():
    rows = list(csv.DictReader(open(os.path.join(BRIEF, 'story-pages.csv'), encoding='utf-8')))
    out = []
    for i, r in enumerate(rows, 1):
        n = r['art_file_name']
        assert n in MOTION, n
        out.append({'n': f'V{i:02d}', 'file': f'{n}.mp4', 'page_picture': f'assets/dadu-art/story/{n}.jpg', 'story': r['story_id'], 'page': int(r['page']), 'scene': r['scene_text_en'], 'prompt': BASE.format(motion=MOTION[n])})
    json.dump(out, open(os.path.join(BRIEF, 'video-prompts.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    cards = ''.join(f'<section><h3>{o["n"]} · save as <b>{o["file"]}</b></h3><p class="scene">{html.escape(o["scene"])}</p><p class="hint">Use the story picture <b>{o["page_picture"].split("/")[-1]}</b> as the first frame.</p><textarea readonly>{html.escape(o["prompt"])}</textarea><button onclick="c(this)">Copy prompt</button></section>' for o in out)
    page = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DADU video prompts</title>
<style>body{{font-family:system-ui,sans-serif;background:#FFF6E5;color:#3A2E2A;margin:0;padding:14px;max-width:640px;margin:auto}}h1{{color:#2F3C7E}}section{{background:#fff;border:2px solid #EAD9BF;border-radius:18px;padding:12px;margin:12px 0}}h3{{margin:0 0 6px;font-size:15px}}.scene{{font-size:13px;color:#6F5F58}}.hint{{font-size:13px}}textarea{{width:100%;height:150px;box-sizing:border-box;border:1px solid #EAD9BF;border-radius:10px;padding:8px;font-size:13px}}button{{background:#F4A523;color:#fff;border:0;border-radius:14px;padding:12px 16px;font-weight:700;font-size:15px;width:100%;margin-top:6px}}</style></head><body>
<h1>DADU story videos</h1><p>For each page: open your video tool, choose <b>image to video</b>, upload the story picture as the first frame, paste the prompt, make a 5 to 8 second clip, save it with the name shown.</p>{cards}
<script>function c(b){{var t=b.previousElementSibling;t.select();try{{navigator.clipboard.writeText(t.value)}}catch(e){{document.execCommand('copy')}}b.textContent='Copied';setTimeout(function(){{b.textContent='Copy prompt'}},1200)}}</script></body></html>'''
    open(os.path.join(BRIEF, 'video-prompt-book.html'), 'w', encoding='utf-8').write(page)
    print(f'{len(out)} video prompts written')

if __name__ == '__main__':
    main()
