// In-world side-view activities that change the shared world state:
// gardening (plant, water, harvest), animal care, a short kitchen recipe and
// cleaning/organising. Every action goes through the pure engine functions,
// so the isometric view shows the result when the camera returns.
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDadu } from '../../state/DaduContext';
import { ui, tx } from '../../i18n';
import type { CharacterKey } from '../../core/characters';
import { characterName } from '../../core/characters';
import { LOCATION_BY_ID } from '../../core/locations';
import type { PlantState } from '../../core/worldState';
import { PLANT_CATALOG, careForAnimal, cookDish, harvestPlant, plantSeed, refillInventory, setObjectFlag, waterPlantInWorld, grant } from '../../engines';
import type { CareAction } from '../../core/simulation';
import { useAudio } from '../../audio/useAudio';
import { P, FONT } from '../../ui/palette';
import { BigButton, Body, Card, Chip, Progress, Row, SpeechBubble } from '../../ui';

export type WorldActivityKind = 'garden' | 'animal' | 'kitchen' | 'clean';

const RECIPES: Record<string, { name: { en: string; hi: string }; steps: { en: string; hi: string }[] }> = {
  poha: { name: { en: 'Poha', hi: 'पोहा' }, steps: [{ en: 'Measure 1 cup of flattened rice and rinse it twice.', hi: '1 कप पोहा नापो और दो बार धोओ।' }, { en: 'Heat 1 spoon of oil; add mustard seeds, curry leaves and half an onion.', hi: '1 चम्मच तेल गरम करो; राई, करी पत्ता और आधा प्याज़ डालो।' }, { en: 'Add the poha, a pinch of turmeric and salt. Mix for 2 minutes.', hi: 'पोहा, चुटकी हल्दी और नमक डालो। 2 मिनट मिलाओ।' }] },
  khichdi: { name: { en: 'Khichdi', hi: 'खिचड़ी' }, steps: [{ en: 'Measure half a cup of rice and a quarter cup of moong dal.', hi: 'आधा कप चावल और चौथाई कप मूँग दाल नापो।' }, { en: 'Wash and add 3 cups of water: that is four times the grain.', hi: 'धोकर 3 कप पानी डालो: अनाज का चार गुना।' }, { en: 'Add turmeric and salt, cook until soft. Serve with ghee.', hi: 'हल्दी और नमक डालो, नरम होने तक पकाओ। घी के साथ परोसो।' }] },
  lassi: { name: { en: 'Lassi', hi: 'लस्सी' }, steps: [{ en: 'Measure 1 cup of curd and half a cup of cold water.', hi: '1 कप दही और आधा कप ठंडा पानी नापो।' }, { en: 'Add 2 spoons of sugar or a pinch of salt and cumin.', hi: '2 चम्मच चीनी या चुटकी नमक और जीरा डालो।' }, { en: 'Whisk until frothy. Count 30 whisks!', hi: 'झाग आने तक फेंटो। 30 बार गिनो!' }] },
};

const ANIMAL_FOR_LOCATION: Record<string, CharacterKey> = { 'animalia.dog': 'buddy', 'animalia.rabbit': 'chikki', 'animalia.cowshed': 'gauri', 'animalia.calf': 'nandu' };

export function animalForLocation(locationId: string, fallback: CharacterKey[]): CharacterKey {
  return ANIMAL_FOR_LOCATION[locationId] ?? fallback[0] ?? 'buddy';
}

interface Props { kind: WorldActivityKind; locationId: string; objectId?: string; plantId?: string; onDone: () => void }

export function WorldActivity({ kind, locationId, objectId, plantId, onDone }: Props) {
  const { world, updateWorld, prefs, logEvent, child } = useDadu();
  const { speak } = useAudio(prefs.primary);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [recipe, setRecipe] = useState<string | null>(null);
  const [species, setSpecies] = useState<string>('tulsi');
  const hi = prefs.primary === 'hi';
  const loc = LOCATION_BY_ID[locationId];

  useEffect(() => { updateWorld((w) => refillInventory(w, Date.now())); }, [updateWorld]);

  const intro = useMemo(() => {
    const texts: Record<WorldActivityKind, { en: string; hi: string }> = {
      garden: { en: 'Beta, a plant needs soil, water and patience. Shall we plant, water or harvest?', hi: 'बेटा, पौधे को मिट्टी, पानी और धैर्य चाहिए। बोएँ, सींचें या काटें?' },
      animal: { en: 'Our friends cannot say what they need. Look at their faces and you will know.', hi: 'हमारे दोस्त अपनी ज़रूरत बता नहीं सकते। उनके चेहरे देखो, पता चल जाएगा।' },
      kitchen: { en: 'Wash hands first. Then we measure, because cooking is mathematics you can eat.', hi: 'पहले हाथ धोओ। फिर नापते हैं, क्योंकि खाना बनाना खाने लायक गणित है।' },
      clean: { en: 'A tidy place is a kind place. Everything has a home; let us put it back.', hi: 'सुथरी जगह, दयालु जगह। हर चीज़ का घर है; चलो उसे वापस रखें।' },
    };
    return hi ? texts[kind].hi : texts[kind].en;
  }, [kind, hi]);
  useEffect(() => { void speak(intro, 'dadaji'); }, [intro, speak]);

  const say = (text: string, who: CharacterKey = 'dadaji') => { setFeedback(text); void speak(text, who); };
  const reward = (label: string) => { updateWorld((w) => grant(w, { stars: 1, coins: 2 })); logEvent('activity'); say(label); };
  if (!world || !child) return null;

  if (kind === 'garden') {
    const plants = world.plants.filter((p) => p.plot === locationId);
    const stageLabel = (p: PlantState) => ui(`garden.stage.${p.stage}`, prefs);
    const water = (p: PlantState) => { updateWorld((w) => waterPlantInWorld(w, p.id, Date.now())); reward(hi ? `शाबाश! ${tx(PLANT_CATALOG[p.species].name, prefs)} ने पानी पी लिया।` : `Shabash! The ${tx(PLANT_CATALOG[p.species].name, prefs).toLowerCase()} drank its water.`); };
    const harvest = (p: PlantState) => { updateWorld((w) => grant(harvestPlant(w, p.id), { stars: 2, coins: 5, badges: ['first_harvest'] })); logEvent('activity'); say(hi ? 'पहली फ़सल! टोकरी में रखो और एक बीज बचाओ।' : 'A harvest! Into the basket, and keep one seed for next time.'); };
    const plant = () => { if ((world.inventory.seeds ?? 0) <= 0) { say(hi ? 'बीज खत्म। कल सुबह नए बीज मिलेंगे; कोई जल्दी नहीं।' : 'No seeds left. New seeds arrive tomorrow morning; no hurry.'); return; } updateWorld((w) => plantSeed(w, species, locationId, Date.now())); reward(hi ? `${tx(PLANT_CATALOG[species].name, prefs)} बो दिया। अब रोज़ पानी और धैर्य।` : `${tx(PLANT_CATALOG[species].name, prefs)} planted. Now daily water and patience.`); };
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} testID="world-activity-garden">
        <SpeechBubble who="dadaji" text={feedback ?? intro} />
        <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? `बीज: ${world.inventory.seeds ?? 0} · पानी: ${world.inventory.water ?? 0}` : `Seeds: ${world.inventory.seeds ?? 0} · Water: ${world.inventory.water ?? 0}`}</Body>
          <Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{Object.keys(PLANT_CATALOG).map((k) => <Chip key={k} label={tx(PLANT_CATALOG[k].name, prefs)} selected={species === k} onPress={() => setSpecies(k)} testID={`species-${k}`} />)}</Row>
          <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton kind="green" label={ui('garden.plant', prefs)} onPress={plant} testID="garden-plant" /></Row></Card>
        {plants.map((p) => (
          <Card key={p.id} accent={plantId === p.id ? P.saffron : undefined}>
            <Row style={{ paddingHorizontal: 0, justifyContent: 'space-between' }}><Body style={{ fontFamily: FONT.bodyBold }}>{tx(PLANT_CATALOG[p.species]?.name ?? { en: p.species }, prefs)}</Body><Chip label={stageLabel(p)} colour={p.stage === 'harvest' ? P.peepal : undefined} /></Row>
            <View style={{ marginVertical: 6 }}><Progress value={p.progress} colour={P.leaf} /></View>
            <Body tone="soft" size={12}>{hi ? `${p.waterings.length} बार पानी दिया` : `Watered ${p.waterings.length} times`}{Date.now() - p.lastWateredAt > 36 * 3_600_000 ? (hi ? ' · प्यासा!' : ' · thirsty!') : ''}</Body>
            <Row style={{ paddingHorizontal: 0, marginTop: 8 }}><BigButton label={ui('garden.water', prefs)} onPress={() => water(p)} testID={`water-${p.id}`} />{p.stage === 'harvest' && <BigButton kind="green" label={ui('garden.harvest', prefs)} onPress={() => harvest(p)} testID={`harvest-${p.id}`} />}</Row>
          </Card>
        ))}
        {plants.length === 0 && <Card><Body tone="soft">{hi ? 'अभी इस क्यारी में कुछ नहीं बोया। ऊपर से एक बीज चुनो।' : 'Nothing is planted in this bed yet. Choose a seed above.'}</Body></Card>}
        <Row style={{ marginTop: 8 }}><BigButton kind="ghost" label={ui('common.done', prefs)} onPress={onDone} testID="activity-done" /></Row>
      </ScrollView>
    );
  }

  if (kind === 'animal') {
    const key = animalForLocation(locationId, loc?.idlers.filter((k) => world.animals.some((a) => a.key === k)) ?? []);
    const a = world.animals.find((x) => x.key === key);
    if (!a) return null;
    const name = characterName(key, prefs.primary);
    const care = (action: CareAction) => {
      const cost = action === 'feed' ? 'fodder' : action === 'water' ? 'water' : null;
      if (cost && (world.inventory[cost] ?? 0) <= 0) { say(hi ? `${cost === 'fodder' ? 'चारा' : 'पानी'} खत्म। कल सुबह फिर भर जाएगा; तब तक ${name} को थपकी दो।` : `We are out of ${cost}. It refills tomorrow morning; give ${name} a pat meanwhile.`); return; }
      updateWorld((w) => careForAnimal(w, key, action, Date.now()));
      const lines: Record<CareAction, { en: string; hi: string }> = {
        feed: { en: `${name} says thank you with a happy mouthful.`, hi: `${name} खुश होकर खा रहा है। धन्यवाद!` }, water: { en: `Fresh water. ${name} drinks slowly, like Dadaji drinks tea.`, hi: `ताज़ा पानी। ${name} धीरे-धीरे पी रहा है, जैसे दादाजी चाय।` },
        rest: { en: `Shh. ${name} is resting. Even friends need quiet time.`, hi: `शश। ${name} आराम कर रहा है। दोस्तों को भी शांति चाहिए।` }, groom: { en: `Brush with the fur, never against it. ${name} loves it.`, hi: `रोएँ की दिशा में ब्रश करो। ${name} को बहुत पसंद है।` },
      };
      updateWorld((w) => grant(w, { stars: 1, coins: 2 })); logEvent('activity'); say(hi ? lines[action].hi : lines[action].en, key);
    };
    const bar = (label: string, v: number, colour: string) => <View style={{ marginTop: 6 }}><Row style={{ paddingHorizontal: 0, justifyContent: 'space-between' }}><Body size={13}>{label}</Body><Body size={13} tone="soft">{Math.round((1 - v) * 100)}%</Body></Row><Progress value={1 - v} colour={colour} /></View>;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} testID="world-activity-animal">
        <SpeechBubble who="dadaji" text={feedback ?? intro} />
        <Card accent={a.mood === 'needs-care' ? P.clay : a.mood === 'content' ? P.saffron : P.peepal}>
          <Row style={{ paddingHorizontal: 0, justifyContent: 'space-between', alignItems: 'center' }}><Text style={s.animalName}>{name}</Text><Chip label={ui(`care.${a.mood === 'needs-care' ? 'needs' : a.mood}`, prefs)} colour={a.mood === 'needs-care' ? P.clay : a.mood === 'content' ? P.saffron : P.peepal} /></Row>
          {bar(hi ? 'पेट भरा' : 'Fed', a.hunger, P.saffron)}{bar(hi ? 'पानी' : 'Water', a.thirst, P.monsoon)}{bar(hi ? 'आराम' : 'Rested', a.rest, P.plum)}{bar(hi ? 'साफ़' : 'Groomed', a.groom, P.peepal)}
          <Body tone="soft" size={12} style={{ marginTop: 6 }}>{hi ? `चारा: ${world.inventory.fodder ?? 0} · पानी: ${world.inventory.water ?? 0}` : `Fodder: ${world.inventory.fodder ?? 0} · Water: ${world.inventory.water ?? 0}`}</Body>
        </Card>
        <Row style={{ marginTop: 4 }}><BigButton label={ui('care.feed', prefs)} onPress={() => care('feed')} testID="care-feed" /><BigButton label={ui('care.water', prefs)} onPress={() => care('water')} testID="care-water" /></Row>
        <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={ui('care.rest', prefs)} onPress={() => care('rest')} testID="care-rest" /><BigButton kind="ghost" label={ui('care.groom', prefs)} onPress={() => care('groom')} testID="care-groom" /></Row>
        <Row style={{ marginTop: 10 }}><BigButton kind="ghost" label={ui('common.done', prefs)} onPress={onDone} testID="activity-done" /></Row>
      </ScrollView>
    );
  }

  if (kind === 'kitchen') {
    const r = recipe ? RECIPES[recipe] : null;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} testID="world-activity-kitchen">
        <SpeechBubble who="dadaji" text={feedback ?? intro} />
        {!r && <Card><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? 'आज क्या बनाएँ?' : 'What shall we cook today?'}</Body><Row style={{ paddingHorizontal: 0, marginTop: 8 }}>{Object.keys(RECIPES).map((k) => <Chip key={k} label={hi ? RECIPES[k].name.hi : RECIPES[k].name.en} onPress={() => { setRecipe(k); setStep(0); setFeedback(null); }} testID={`recipe-${k}`} />)}</Row></Card>}
        {r && step < r.steps.length && (
          <Card accent={P.saffron}><Body tone="soft" size={12}>{hi ? `चरण ${step + 1} / ${r.steps.length}` : `Step ${step + 1} of ${r.steps.length}`}</Body><Body style={{ fontFamily: FONT.bodyBold, fontSize: 17, marginTop: 4 }}>{hi ? r.steps[step].hi : r.steps[step].en}</Body>
            <Row style={{ paddingHorizontal: 0, marginTop: 10 }}><BigButton label={hi ? 'किया' : 'Done this step'} onPress={() => { void speak(hi ? r.steps[step].hi : r.steps[step].en, 'dadaji'); if (step + 1 >= r.steps.length) { updateWorld((w) => cookDish(w, recipe!)); reward(hi ? `${r.name.hi} तैयार! पहले दादाजी को चखाओ।` : `${r.name.en} is ready! Dadaji tastes first.`); } setStep(step + 1); }} testID="cook-step" /></Row></Card>
        )}
        {r && step >= r.steps.length && <Card accent={P.peepal}><Body style={{ fontFamily: FONT.bodyBold }}>{hi ? `${r.name.hi} बन गया। रसोई की मेज़ पर रखा है।` : `${r.name.en} is made and waiting on the kitchen counter.`}</Body></Card>}
        <Row style={{ marginTop: 8 }}><BigButton kind="ghost" label={ui('common.done', prefs)} onPress={onDone} testID="activity-done" /></Row>
      </ScrollView>
    );
  }

  const id = objectId ?? `${locationId}.tidy`;
  const clean = !!world.objects[id]?.flags.clean;
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 24 }} testID="world-activity-clean">
      <SpeechBubble who="dadaji" text={feedback ?? intro} />
      <Card accent={clean ? P.peepal : P.clay}><Body style={{ fontFamily: FONT.bodyBold }}>{clean ? (hi ? 'साफ़ और व्यवस्थित।' : 'Clean and organised.') : (hi ? 'थोड़ा बिखरा हुआ है।' : 'A little untidy.')}</Body>
        <Row style={{ paddingHorizontal: 0, marginTop: 10 }}>{!clean ? <BigButton kind="green" label={hi ? 'साफ़ करो' : 'Clean it up'} onPress={() => { updateWorld((w) => setObjectFlag(w, id, 'clean', true, Date.now())); reward(hi ? 'चमक गया! जगह साफ़, मन साफ़।' : 'Sparkling! A clean place, a clear mind.'); }} testID="clean-do" /> : <BigButton kind="ghost" label={hi ? 'फिर से इस्तेमाल करो' : 'Use it again'} onPress={() => updateWorld((w) => setObjectFlag(w, id, 'clean', false, Date.now()))} />}</Row></Card>
      <Row style={{ marginTop: 8 }}><BigButton kind="ghost" label={ui('common.done', prefs)} onPress={onDone} testID="activity-done" /></Row>
    </ScrollView>
  );
}

const s = StyleSheet.create({ animalName: { fontFamily: FONT.displayHeavy, fontSize: 20, color: P.indigo } });
