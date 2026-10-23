// Interactive "Try it" and challenge activities. Each kind reads its data
// from the lesson step and reports a result; the lesson engine counts them.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AppText, BigButton, Tactile } from '../../ui';
import { palette, rainbow } from '../../theme/palette';
import { shuffle, rng } from '../../games/engine';
import { playBol, playClick, playNote, guitarStringNote } from '../audio';
import { PianoKeys, GuitarChord, Tabla } from '../visuals';
import { t } from '../../i18n';

export interface ActivityResult {
  correct: boolean;
  /** For practice activities (rhythm, instruments): how close, 0..1. */
  accuracy?: number;
}

export interface ActivityProps {
  activity: Record<string, unknown> & { kind: string };
  onResult: (r: ActivityResult) => void;
  seed?: number;
  sfx?: (kind: 'tap' | 'good' | 'bad' | 'win' | 'pop') => void;
}

const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' ? v : d);
const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const INK = palette.ink;

export function LessonActivity(props: ActivityProps) {
  switch (props.activity.kind) {
    case 'mcq':
    case 'predict':
      return <Choice {...props} />;
    case 'trueFalse':
      return <TrueFalse {...props} />;
    case 'count':
      return <Count {...props} />;
    case 'number':
      return <NumberInput {...props} />;
    case 'tapTarget':
      return <TapTarget {...props} />;
    case 'order':
      return <Order {...props} />;
    case 'match':
      return <Match {...props} />;
    case 'rhythm':
      return <Rhythm {...props} />;
    case 'piano':
      return <Piano {...props} />;
    case 'tabla':
      return <TablaPractice {...props} />;
    case 'guitar':
      return <Guitar {...props} />;
    default:
      return <AppText variant="body" tone="secondary">{t('learn.activity.unsupported')}</AppText>;
  }
}

function Feedback({ state, explanation }: { state: 'idle' | 'right' | 'wrong'; explanation?: string }) {
  if (state === 'idle') return null;
  return (
    <View style={[styles.feedback, { backgroundColor: state === 'right' ? '#E6F8DA' : '#FDE2E3' }]}>
      <AppText variant="bodyStrong">{state === 'right' ? `✅ ${t('learn.activity.correct')}` : `🤔 ${t('learn.activity.tryAgain')}`}</AppText>
      {explanation && state === 'right' && <AppText variant="bodySmall" tone="secondary">{explanation}</AppText>}
    </View>
  );
}

function Choice({ activity, onResult, sfx }: ActivityProps) {
  const options = arr<string>(activity.options);
  const correct = num(activity.correctIndex, 0);
  const [picked, setPicked] = useState<number | null>(null);
  const [tries, setTries] = useState(0);
  const state = picked === null ? 'idle' : picked === correct ? 'right' : 'wrong';
  const pick = (i: number) => {
    if (state === 'right') return;
    setPicked(i);
    setTries((n) => n + 1);
    const ok = i === correct;
    sfx?.(ok ? 'good' : 'bad');
    if (ok || tries >= 1) onResult({ correct: ok });
  };
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.options}>
        {options.map((o, i) => (
          <Tactile key={i} onPress={() => pick(i)} accessibilityRole="button" accessibilityLabel={o} accessibilityState={{ selected: picked === i }}>
            <View style={[styles.option, { borderColor: rainbow[i % rainbow.length] }, picked === i && { backgroundColor: i === correct ? '#E6F8DA' : '#FDE2E3' }, state === 'right' && i === correct && { backgroundColor: '#E6F8DA' }]}>
              <AppText variant="bodyStrong">{o}</AppText>
            </View>
          </Tactile>
        ))}
      </View>
      <Feedback state={state} explanation={str(activity.reveal) || str(activity.explanation) || undefined} />
    </View>
  );
}

function TrueFalse({ activity, onResult, sfx }: ActivityProps) {
  const answer = !!activity.answer;
  const [picked, setPicked] = useState<boolean | null>(null);
  const state = picked === null ? 'idle' : picked === answer ? 'right' : 'wrong';
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.statement)}</AppText>
      <View style={styles.row}>
        <BigButton label={t('common.yes')} emoji="👍" color={palette.lime} size="md" onPress={() => { setPicked(true); sfx?.(answer ? 'good' : 'bad'); onResult({ correct: answer }); }} />
        <BigButton label={t('common.no')} emoji="👎" color={palette.cherry} size="md" onPress={() => { setPicked(false); sfx?.(!answer ? 'good' : 'bad'); onResult({ correct: !answer }); }} />
      </View>
      <Feedback state={state} explanation={str(activity.explanation) || undefined} />
    </View>
  );
}

function Count({ activity, onResult, sfx }: ActivityProps) {
  const count = num(activity.count, 3);
  const options = arr<number>(activity.options);
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const [picked, setPicked] = useState<number | null>(null);
  const state = picked === null ? 'idle' : picked === count ? 'right' : 'wrong';
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.row}>
        {Array.from({ length: count }, (_, i) => (
          <Tactile key={i} onPress={() => { setTapped((s) => new Set(s).add(i)); playClick(); }} accessibilityRole="button" accessibilityLabel={`${i + 1}`}>
            <View style={[styles.counter, tapped.has(i) && { backgroundColor: palette.sunshine }]}>
              <Text style={{ fontSize: 34 }}>{str(activity.emoji, '⭐')}</Text>
              {tapped.has(i) && <Text style={styles.counterNum}>{[...tapped].sort((a, b) => a - b).indexOf(i) + 1}</Text>}
            </View>
          </Tactile>
        ))}
      </View>
      <View style={styles.row}>
        {options.map((o) => (
          <Tactile key={o} onPress={() => { if (state === 'right') return; setPicked(o); sfx?.(o === count ? 'good' : 'bad'); onResult({ correct: o === count }); }} accessibilityRole="button" accessibilityLabel={String(o)}>
            <View style={[styles.numBtn, picked === o && { backgroundColor: o === count ? palette.lime : palette.cherry }]}><Text style={styles.numText}>{o}</Text></View>
          </Tactile>
        ))}
      </View>
      <Feedback state={state} />
    </View>
  );
}

function NumberInput({ activity, onResult, sfx }: ActivityProps) {
  const answer = num(activity.answer, 0);
  const [value, setValue] = useState('');
  const [state, setState] = useState<'idle' | 'right' | 'wrong'>('idle');
  const [tries, setTries] = useState(0);
  const check = () => {
    const ok = Number(value) === answer;
    setState(ok ? 'right' : 'wrong');
    setTries((n) => n + 1);
    sfx?.(ok ? 'good' : 'bad');
    if (ok || tries >= 1) onResult({ correct: ok });
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'];
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.display}><Text style={styles.displayText}>{value || ' '}</Text></View>
      <View style={styles.keypad}>
        {keys.map((k) => (
          <Tactile key={k} onPress={() => { if (state === 'right') return; if (k === '⌫') setValue((v) => v.slice(0, -1)); else if (k === '✓') { if (value) check(); } else if (value.length < 7) setValue((v) => v + k); setState((s) => (s === 'wrong' && k !== '✓' ? 'idle' : s)); }} accessibilityRole="button" accessibilityLabel={k === '✓' ? t('learn.activity.check') : k}>
            <View style={[styles.key, k === '✓' && { backgroundColor: palette.lime }, k === '⌫' && { backgroundColor: '#FFF4CC' }]}><Text style={styles.keyText}>{k}</Text></View>
          </Tactile>
        ))}
      </View>
      <Feedback state={state} explanation={state === 'right' ? `${answer}` : undefined} />
      {state === 'wrong' && tries >= 2 && <AppText variant="caption" tone="secondary">{t('learn.activity.answerWas', { n: answer })}</AppText>}
    </View>
  );
}

function TapTarget({ activity, onResult, sfx }: ActivityProps) {
  const items = arr<{ emoji?: string; label: string; correct: boolean }>(activity.items);
  const multi = activity.multi !== false;
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [done, setDone] = useState<'idle' | 'right' | 'wrong'>('idle');
  const need = items.filter((i) => i.correct).length;
  const tap = (i: number) => {
    if (done === 'right') return;
    const next = new Set(picked);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setPicked(next);
    sfx?.(items[i]!.correct ? 'good' : 'bad');
    if (!multi) {
      const ok = !!items[i]!.correct;
      setDone(ok ? 'right' : 'wrong');
      onResult({ correct: ok });
      return;
    }
    const chosenCorrect = [...next].filter((k) => items[k]!.correct).length;
    const chosenWrong = [...next].filter((k) => !items[k]!.correct).length;
    if (chosenCorrect === need && chosenWrong === 0) {
      setDone('right');
      onResult({ correct: true });
    } else if (chosenWrong > 0) {
      setDone('wrong');
    } else setDone('idle');
  };
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.row}>
        {items.map((it, i) => {
          const on = picked.has(i);
          return (
            <Tactile key={i} onPress={() => tap(i)} accessibilityRole="button" accessibilityLabel={it.label} accessibilityState={{ selected: on }}>
              <View style={[styles.target, on && { backgroundColor: it.correct ? '#E6F8DA' : '#FDE2E3', borderColor: it.correct ? palette.limeDeep : palette.cherry }]}>
                {it.emoji && <Text style={{ fontSize: 34 }}>{it.emoji}</Text>}
                <AppText variant="bodySmallStrong" align="center">{it.label}</AppText>
              </View>
            </Tactile>
          );
        })}
      </View>
      {multi && done !== 'right' && <AppText variant="caption" tone="secondary">{t('learn.activity.tapAll', { n: need })}</AppText>}
      <Feedback state={done === 'wrong' ? 'wrong' : done} />
    </View>
  );
}

function Order({ activity, onResult, sfx, seed = 1 }: ActivityProps) {
  const items = arr<string>(activity.items);
  const shuffled = useMemo(() => {
    let s = shuffle(items, rng(seed));
    if (s.join() === items.join() && items.length > 1) s = [...s.slice(1), s[0]!];
    return s;
  }, [items, seed]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'right' | 'wrong'>('idle');
  const remaining = shuffled.filter((x) => !chosen.includes(x));
  const pick = (x: string) => {
    const next = [...chosen, x];
    setChosen(next);
    playClick();
    if (next.length === items.length) {
      const ok = next.every((v, i) => v === items[i]);
      setState(ok ? 'right' : 'wrong');
      sfx?.(ok ? 'good' : 'bad');
      onResult({ correct: ok });
    }
  };
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.orderList}>
        {chosen.map((c, i) => (
          <View key={c} style={[styles.orderRow, state === 'wrong' && c !== items[i] && { backgroundColor: '#FDE2E3' }, state === 'right' && { backgroundColor: '#E6F8DA' }]}>
            <View style={styles.orderNum}><Text style={{ color: '#fff', fontFamily: 'Fredoka_700Bold' }}>{i + 1}</Text></View>
            <AppText variant="bodyStrong" style={{ flex: 1 }}>{c}</AppText>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        {remaining.map((x) => (
          <Tactile key={x} onPress={() => pick(x)} accessibilityRole="button" accessibilityLabel={x}><View style={styles.option}><AppText variant="bodyStrong">{x}</AppText></View></Tactile>
        ))}
      </View>
      {state === 'wrong' && <BigButton label={t('games.tryAgain')} emoji="🔁" size="md" color={palette.sunshine} onPress={() => { setChosen([]); setState('idle'); }} />}
      <Feedback state={state} />
    </View>
  );
}

function Match({ activity, onResult, sfx, seed = 1 }: ActivityProps) {
  const pairs = arr<{ left: string; right: string }>(activity.pairs);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right), rng(seed + 7)), [pairs, seed]);
  const [left, setLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Record<number, string>>({});
  const [wrong, setWrong] = useState(0);
  const done = Object.keys(matched).length === pairs.length;
  useEffect(() => {
    if (done && pairs.length) onResult({ correct: wrong === 0, accuracy: pairs.length / (pairs.length + wrong) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  const pickRight = (r: string) => {
    if (left === null) return;
    const ok = pairs[left]!.right === r;
    sfx?.(ok ? 'good' : 'bad');
    if (ok) setMatched((m) => ({ ...m, [left]: r }));
    else setWrong((n) => n + 1);
    setLeft(null);
  };
  const used = new Set(Object.values(matched));
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, gap: 8 }}>
          {pairs.map((p, i) => (
            <Tactile key={i} disabled={i in matched} onPress={() => setLeft(i)} accessibilityRole="button" accessibilityLabel={p.left} accessibilityState={{ selected: left === i }}>
              <View style={[styles.matchCard, left === i && { backgroundColor: '#FFF4CC', borderColor: palette.sunshineDeep }, i in matched && { backgroundColor: '#E6F8DA' }]}><AppText variant="bodySmallStrong">{p.left}</AppText></View>
            </Tactile>
          ))}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {rights.map((r) => (
            <Tactile key={r} disabled={used.has(r) || left === null} onPress={() => pickRight(r)} accessibilityRole="button" accessibilityLabel={r}>
              <View style={[styles.matchCard, used.has(r) && { backgroundColor: '#E6F8DA' }, left === null && !used.has(r) && { opacity: 0.7 }]}><AppText variant="bodySmallStrong">{r}</AppText></View>
            </Tactile>
          ))}
        </View>
      </View>
      {left !== null && <AppText variant="caption" tone="secondary">{t('learn.activity.nowTapMatch')}</AppText>}
      <Feedback state={done ? 'right' : 'idle'} />
    </View>
  );
}

/** Tap along with the beat; scored on how many taps land near a lit beat. */
function Rhythm({ activity, onResult, sfx }: ActivityProps) {
  const pattern = arr<number>(activity.pattern);
  const bpm = num(activity.bpm, 80);
  const rounds = num(activity.rounds, 1);
  const total = pattern.length * rounds;
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [taps, setTaps] = useState(0);
  const [finished, setFinished] = useState(false);
  const beatAt = useRef<number>(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const start = () => {
    timers.current.forEach(clearTimeout);
    setRunning(true);
    setFinished(false);
    setHits(0);
    setTaps(0);
    const ms = 60_000 / bpm;
    timers.current = Array.from({ length: total }, (_, i) => setTimeout(() => { setBeat(i % pattern.length); beatAt.current = Date.now(); if (pattern[i % pattern.length]) playClick(i % pattern.length === 0); }, (i + 1) * ms));
    timers.current.push(setTimeout(() => { setRunning(false); setBeat(null); setFinished(true); }, (total + 1.5) * ms));
  };
  useEffect(() => {
    if (!finished) return;
    const expected = pattern.filter(Boolean).length * rounds;
    const accuracy = Math.min(1, hits / Math.max(1, expected));
    sfx?.(accuracy >= 0.6 ? 'good' : 'bad');
    onResult({ correct: accuracy >= 0.6, accuracy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);
  const tap = () => {
    if (!running) return;
    setTaps((n) => n + 1);
    const ms = 60_000 / bpm;
    const diff = Math.abs(Date.now() - beatAt.current);
    if (diff < ms * 0.35 || ms - diff < ms * 0.35) setHits((n) => n + 1);
    playBol('Na');
  };
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.row}>
        {pattern.map((p, i) => <View key={i} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: beat === i ? palette.sunshine : p ? rainbow[i % rainbow.length] : '#eee', borderWidth: 2, borderColor: INK }} />)}
      </View>
      <Tactile onPress={tap} disabled={!running} accessibilityRole="button" accessibilityLabel={t('learn.activity.tapDrum')}>
        <View style={[styles.drum, running && { borderColor: palette.cherry }]}><Text style={{ fontSize: 56 }}>🥁</Text></View>
      </Tactile>
      {!running && <BigButton label={finished ? t('games.tryAgain') : t('learn.activity.start')} emoji="▶️" size="md" color={palette.lime} onPress={start} />}
      {finished && <AppText variant="bodyStrong" align="center">{t('learn.activity.rhythmScore', { hits, total: pattern.filter(Boolean).length * rounds, taps })}</AppText>}
    </View>
  );
}

/** Tap the named keys in order. */
function Piano({ activity, onResult, sfx }: ActivityProps) {
  const notes = arr<string>(activity.notes);
  const [index, setIndex] = useState(0);
  const [slips, setSlips] = useState(0);
  const done = index >= notes.length;
  useEffect(() => {
    if (done && notes.length) {
      sfx?.('win');
      onResult({ correct: slips <= Math.ceil(notes.length / 3), accuracy: notes.length / (notes.length + slips) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  const onInteract = (d: string) => {
    if (!d.startsWith('key:') || done) return;
    const k = d.slice(4);
    if (k === notes[index]) setIndex((i) => i + 1);
    else setSlips((n) => n + 1);
  };
  const octaves = notes.some((n) => n.endsWith('5')) || notes.some((n) => n.endsWith('3')) ? 2 : 1;
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.row}>{notes.map((n, i) => <View key={i} style={[styles.noteChip, i < index && { backgroundColor: '#E6F8DA' }, i === index && { backgroundColor: palette.sunshine }]}><Text style={{ fontFamily: 'Fredoka_700Bold', color: INK }}>{n.slice(0, -1)}</Text></View>)}</View>
      <PianoKeys w={340} props={{ octaves, labels: activity.showLabels ? true : [], highlight: done ? [] : [notes[index]] }} onInteract={onInteract} />
      {done ? <Feedback state="right" /> : <AppText variant="caption" tone="secondary">{t('learn.activity.nextKey', { n: notes[index]?.slice(0, -1) ?? '' })}</AppText>}
      <AppText variant="caption" tone="muted" align="center">{t('learn.screenOnly')}</AppText>
    </View>
  );
}

function TablaPractice({ activity, onResult, sfx }: ActivityProps) {
  const bols = arr<string>(activity.bols);
  const [index, setIndex] = useState(0);
  const [slips, setSlips] = useState(0);
  const done = index >= bols.length;
  useEffect(() => {
    if (done && bols.length) {
      sfx?.('win');
      onResult({ correct: slips <= Math.ceil(bols.length / 3), accuracy: bols.length / (bols.length + slips) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  const expectedDrum = (b: string) => (['Ge', 'Ghe', 'Ka'].includes(b) ? 'bayan' : ['Dha', 'Dhin'].includes(b) ? 'both' : 'dayan');
  const onInteract = (d: string) => {
    if (!d.startsWith('drum:') || done) return;
    const drum = d.slice(5);
    const want = expectedDrum(bols[index]!);
    if (want === drum || want === 'both') {
      setIndex((i) => i + 1);
      if (want === 'both') playBol(bols[index]!);
    } else setSlips((n) => n + 1);
  };
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.row}>{bols.map((b, i) => <View key={i} style={[styles.noteChip, i < index && { backgroundColor: '#E6F8DA' }, i === index && { backgroundColor: palette.sunshine }]}><Text style={{ fontFamily: 'Fredoka_700Bold', color: INK }}>{b}</Text></View>)}</View>
      <Tabla w={340} props={{}} onInteract={onInteract} />
      {done ? <Feedback state="right" /> : <AppText variant="caption" tone="secondary">{t('learn.activity.nextBol', { bol: bols[index] ?? '', drum: expectedDrum(bols[index] ?? '') === 'bayan' ? 'left drum' : expectedDrum(bols[index] ?? '') === 'both' ? 'both drums (tap either)' : 'right drum' })}</AppText>}
      <AppText variant="caption" tone="muted" align="center">{t('learn.screenOnly')}</AppText>
    </View>
  );
}

function Guitar({ activity, onResult, sfx }: ActivityProps) {
  const chord = (activity.chord ?? {}) as { name?: string; frets?: (number | null)[]; fingers?: (number | null)[] };
  const frets = chord.frets ?? [];
  const needed = frets.map((f, i) => (f ? i : -1)).filter((i) => i >= 0);
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const [strums, setStrums] = useState(0);
  const target = num(activity.strums, 4);
  const ready = needed.every((i) => pressed.has(i));
  const done = strums >= target;
  useEffect(() => {
    if (done) {
      sfx?.('win');
      onResult({ correct: true, accuracy: 1 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return (
    <View style={styles.wrap}>
      <AppText variant="heading">{str(activity.prompt)}</AppText>
      <View style={styles.row}>
        {needed.map((i) => (
          <Tactile key={i} onPress={() => { setPressed((s) => new Set(s).add(i)); const n = guitarStringNote(i, frets[i] ?? 0); if (n) playNote(n, 'guitar'); }} accessibilityRole="button" accessibilityLabel={`finger on string ${i + 1}`}>
            <View style={[styles.option, pressed.has(i) && { backgroundColor: '#E6F8DA' }]}><AppText variant="bodySmallStrong">{t('learn.activity.pressString', { s: ['E', 'A', 'D', 'G', 'B', 'e'][i] ?? '', f: frets[i] ?? 0 })}</AppText></View>
          </Tactile>
        ))}
      </View>
      <GuitarChord w={340} props={{ name: chord.name ?? '', frets: ready ? frets : frets.map((f, i) => (pressed.has(i) ? f : 0)), fingers: chord.fingers ?? [], labels: true }} onInteract={(d) => { if (d === 'strum' && ready) setStrums((n) => n + 1); }} />
      <AppText variant="caption" tone="secondary">{ready ? t('learn.activity.strumCount', { n: strums, total: target }) : t('learn.activity.placeFingers')}</AppText>
      {done && <Feedback state="right" />}
      <AppText variant="caption" tone="muted" align="center">{t('learn.screenOnly')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, alignItems: 'stretch' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center' },
  options: { gap: 8 },
  option: { padding: 14, borderRadius: 16, backgroundColor: '#fff', borderWidth: 3, borderColor: INK },
  feedback: { padding: 12, borderRadius: 14, gap: 4 },
  counter: { width: 56, height: 64, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  counterNum: { fontFamily: 'Fredoka_700Bold', fontSize: 14, color: INK },
  numBtn: { width: 64, height: 64, borderRadius: 20, backgroundColor: '#fff', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  numText: { fontFamily: 'Fredoka_700Bold', fontSize: 28, color: INK },
  display: { minHeight: 56, borderRadius: 16, backgroundColor: '#fff', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  displayText: { fontFamily: 'Fredoka_700Bold', fontSize: 32, color: INK },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 240, alignSelf: 'center' },
  key: { width: 68, height: 52, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  keyText: { fontFamily: 'Fredoka_700Bold', fontSize: 22, color: INK },
  target: { width: 120, minHeight: 100, padding: 8, borderRadius: 18, backgroundColor: '#fff', borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center', gap: 4 },
  orderList: { gap: 6 },
  orderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK },
  orderNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: palette.grape, alignItems: 'center', justifyContent: 'center' },
  matchCard: { padding: 12, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: INK, minHeight: 56, justifyContent: 'center' },
  drum: { alignSelf: 'center', width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', borderWidth: 4, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  noteChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: INK },
});
