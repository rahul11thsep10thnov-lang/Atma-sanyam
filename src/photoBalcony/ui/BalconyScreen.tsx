// The Balcony tab: the photograph fills the screen and the controls float
// lightly over it. Tap the balcony to hide every control (and the tab bar);
// tap again to bring them back. Customize turns on placement guides, which
// never appear otherwise.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PACK } from '../pack.generated';
import { STORE } from '../catalog';
import { focusVariant, PlacedItem, slotsFor, stageIndexFor, storeItem, turnItem, STAGE_WORDS } from '../model';
import { BalconyScene, SceneGeometry } from '../scene/BalconyScene';
import { useBalcony, useRewards } from '../useBalcony';
import { CollectionSheet } from './CollectionSheet';
import { EditLayer } from './EditLayer';
import { GallerySheet } from './GallerySheet';
import { GLASS, GLASS_EDGE, GlassChip, GlassPill, CREAM, INK } from './Glass';
import { RootStackParamList } from '../../navigation/types';
import { gridForDuration } from '../../utils/grid';
import { AppText } from '../../ui/AppText';
import { Icon, IconName } from '../../ui/Icon';
import { Tactile } from '../../ui/Pressable';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '../../ui/TabBar';
import { radii } from '../../theme/radii';
import { space } from '../../theme/spacing';
import { duration, easing } from '../../theme/motion';

const DURATIONS = [25, 45, 60, 90];

export function BalconyScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [state, save] = useBalcony();
  const [rewards, saveRewards] = useRewards(isFocused);

  const [chrome, setChrome] = useState(true);
  const [editing, setEditing] = useState(false);
  const [sheet, setSheet] = useState<'collection' | 'gallery' | 'focus' | null>(null);
  const [selected, setSelected] = useState<PlacedItem | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [geometry, setGeometry] = useState<SceneGeometry | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fade = useRef(new Animated.Value(1)).current;

  const showChrome = chrome && !editing;
  useEffect(() => {
    Animated.timing(fade, { toValue: showChrome ? 1 : 0, duration: duration.normal, easing: easing.standard, useNativeDriver: true }).start();
  }, [showChrome, fade]);

  // the tab bar steps aside with the rest of the controls
  useLayoutEffect(() => {
    navigation.setOptions({ tabBarStyle: { display: chrome && !editing && !sheet ? 'flex' : 'none' } } as never);
  }, [navigation, chrome, editing, sheet]);

  useEffect(() => {
    if (!isFocused) {
      setEditing(false);
      setSheet(null);
      setChrome(true);
    }
  }, [isFocused]);

  const say = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);
  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const startFocus = (minutes: number) => {
    setSheet(null);
    navigation.navigate('ActiveSession', { config: { durationMinutes: minutes, image: { kind: 'balcony' }, grid: gridForDuration(minutes) } });
  };

  if (!state || !rewards) return <View style={styles.screen} />;

  const tabSpace = TAB_BAR_HEIGHT + Math.max(insets.bottom, TAB_BAR_MARGIN) + space.md;
  const plant = focusVariant(state.focus.minutes, state.focus.health);
  const stages = PACK.focusPlant.stages;
  const next = stages[stageIndexFor(state.focus.minutes) + 1];
  const plantLine = plant.wilted
    ? 'Drooping — one good session will revive it'
    : next
      ? `${STAGE_WORDS[plant.stage]} · ${Math.ceil(next.minutes - state.focus.minutes)} min to grow`
      : STAGE_WORDS[plant.stage];

  const sel = selected ? state.placed.find((p) => p.uid === selected.uid) ?? null : null;
  const turns = sel ? PACK.items[sel.itemId]?.variants[sel.slot]?.length ?? 1 : 1;
  const movable = sel ? slotsFor(sel.itemId).filter((s) => s !== PACK.focusPlant.slot).length > 1 : false;

  return (
    <View style={styles.screen}>
      <BalconyScene
        state={state}
        mode={isFocused ? 'live' : 'still'}
        parallax={!editing}
        hiddenUid={dragging}
        onGeometry={setGeometry}
        style={StyleSheet.absoluteFill}
      >
        {!editing && <Pressable style={StyleSheet.absoluteFill} onPress={() => setChrome((c) => !c)} accessibilityLabel={chrome ? 'Hide controls' : 'Show controls'} />}
        {editing && geometry && <EditLayer state={state} geometry={geometry} selected={sel} onSelect={setSelected} onChange={save} onDragging={setDragging} />}
      </BalconyScene>

      {/* ambient status, top */}
      <Animated.View style={[styles.top, { top: insets.top + space.sm, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <GlassChip>
          <Icon name="sprout" size="xs" color={plant.wilted ? '#F3D9A6' : '#FFFFFF'} />
          <AppText variant="caption" style={styles.white} numberOfLines={1}>
            {PACK.focusPlant.name} · {plantLine}
          </AppText>
        </GlassChip>
        <GlassChip>
          <Icon name="coins" size="xs" color="#FFFFFF" />
          <AppText variant="bodySmallStrong" style={styles.white}>
            {rewards.coins}
          </AppText>
        </GlassChip>
      </Animated.View>

      {/* the dock */}
      <Animated.View style={[styles.dockWrap, { bottom: tabSpace, opacity: fade }]} pointerEvents={showChrome ? 'box-none' : 'none'}>
        <View style={styles.dock}>
          <DockItem icon="timer" label="Focus" emphasis onPress={() => setSheet('focus')} />
          <DockItem icon="move" label="Customize" onPress={() => { setEditing(true); setSelected(null); }} />
          <DockItem icon="armchair" label="Collection" onPress={() => setSheet('collection')} />
          <DockItem icon="image" label="Gallery" onPress={() => setSheet('gallery')} badge={!!state.art.currentId && state.art.pieces > (state.art.seen ?? 0)} />
        </View>
      </Animated.View>

      {/* customize mode */}
      {editing && (
        <>
          <View style={[styles.editTop, { top: insets.top + space.sm }]} pointerEvents="box-none">
            <GlassChip>
              <Icon name="move" size="xs" color="#FFFFFF" />
              <AppText variant="caption" style={styles.white}>
                {sel ? (movable ? 'Drag it, or tap a spot to move it' : 'This has one home on the balcony') : 'Tap something to arrange it'}
              </AppText>
            </GlassChip>
            <GlassPill icon="check" label="Done" emphasis compact onPress={() => { setEditing(false); setSelected(null); }} />
          </View>
          {sel && (
            <View style={[styles.selection, { bottom: insets.bottom + space.xl }]} pointerEvents="box-none">
              <View style={styles.selectionCard}>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmallStrong" style={styles.white} numberOfLines={1}>
                    {PACK.items[sel.itemId]?.name}
                  </AppText>
                  <AppText variant="caption" style={styles.faint} numberOfLines={1}>
                    {PACK.slots[sel.slot]?.label}
                  </AppText>
                </View>
                {turns > 1 && <GlassPill icon="reset" label="Turn" compact onPress={() => save(turnItem(state, sel.uid))} />}
                {!STORE[sel.itemId]?.hidden && (
                  <GlassPill
                    icon="trash"
                    label="Put away"
                    compact
                    onPress={() => {
                      save(storeItem(state, sel.uid));
                      say(`${PACK.items[sel.itemId]?.name} put away — find it in Collection`);
                      setSelected(null);
                    }}
                  />
                )}
              </View>
            </View>
          )}
        </>
      )}

      {toast && (
        <View style={[styles.toastWrap, { bottom: (editing ? insets.bottom + 96 : tabSpace + 76) }]} pointerEvents="none">
          <GlassChip style={styles.toast}>
            <AppText variant="caption" style={styles.white}>
              {toast}
            </AppText>
          </GlassChip>
        </View>
      )}

      {sheet === 'focus' && (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={() => setSheet(null)} accessibilityLabel="Close" />
          <View style={[styles.focusCard, { bottom: insets.bottom + space.xl }]}>
            <AppText variant="subheading" style={{ color: INK }}>
              Sit with your balcony
            </AppText>
            <AppText variant="bodySmall" style={{ color: 'rgba(43,33,24,0.7)' }}>
              Your {PACK.focusPlant.name.toLowerCase()} grows while you focus. Leaving early makes it droop.
            </AppText>
            <View style={styles.durations}>
              {DURATIONS.map((m) => (
                <Tactile key={m} onPress={() => startFocus(m)} accessibilityRole="button" accessibilityLabel={`Focus for ${m} minutes`} style={styles.duration}>
                  <AppText variant="heading" style={{ color: INK }}>
                    {m}
                  </AppText>
                  <AppText variant="caption" style={{ color: 'rgba(43,33,24,0.6)' }}>
                    min
                  </AppText>
                </Tactile>
              ))}
            </View>
          </View>
        </View>
      )}

      <CollectionSheet
        visible={sheet === 'collection'}
        state={state}
        rewards={rewards}
        onClose={() => setSheet(null)}
        onState={save}
        onRewards={saveRewards}
        onToast={say}
      />
      <GallerySheet visible={sheet === 'gallery'} state={state} rewards={rewards} onClose={() => setSheet(null)} onState={save} onToast={say} />
    </View>
  );
}

function DockItem({ icon, label, onPress, emphasis, badge }: { icon: IconName; label: string; onPress: () => void; emphasis?: boolean; badge?: boolean }) {
  const ink = emphasis ? INK : '#FFFFFF';
  return (
    <Tactile onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={label} style={[styles.dockItem, emphasis && styles.dockEmphasis]}>
      <Icon name={icon} size="sm" color={ink} />
      <AppText variant="caption" style={{ color: ink }} numberOfLines={1}>
        {label}
      </AppText>
      {badge && <View style={styles.badge} />}
    </Tactile>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#3a2e26' },
  white: { color: '#FFFFFF' },
  faint: { color: 'rgba(255,255,255,0.72)' },
  top: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  dockWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  dock: {
    flexDirection: 'row',
    gap: 4,
    padding: 5,
    borderRadius: radii.xl,
    backgroundColor: GLASS,
    borderColor: GLASS_EDGE,
    borderWidth: StyleSheet.hairlineWidth,
  },
  dockItem: { width: 78, height: 56, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', gap: 3 },
  dockEmphasis: { backgroundColor: CREAM },
  badge: { position: 'absolute', top: 8, right: 22, width: 7, height: 7, borderRadius: 4, backgroundColor: '#F2B66D' },
  editTop: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  selection: { position: 'absolute', left: space.lg, right: space.lg },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.lg,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(28,20,14,0.62)',
    borderColor: GLASS_EDGE,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toastWrap: { position: 'absolute', left: space.lg, right: space.lg, alignItems: 'center' },
  toast: { height: undefined, paddingVertical: 8, maxWidth: '100%' },
  scrim: { backgroundColor: 'rgba(20,12,8,0.25)' },
  focusCard: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    padding: space.xl,
    gap: space.sm,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(251,245,236,0.96)',
  },
  durations: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  duration: { flex: 1, height: 72, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(43,33,24,0.07)' },
});
