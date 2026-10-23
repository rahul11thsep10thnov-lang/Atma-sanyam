// Loads a lesson and hands it to the LessonPlayer; saves progress as the
// child moves and on exit.
import React, { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../navigation/types';
import { LessonPlayer } from '../../../learning/LessonPlayer';
import type { Lesson } from '../../../learning/types';
import { playerApi } from '../../../api/player';
import { usePlayer } from '../../../context/PlayerContext';
import { useSettings } from '../../../context/SettingsContext';
import { ErrorState, LoadingState } from '../../../ui';
import { friendlyError } from '../../../services/apiClient';
import { BRACKET_FOR_AGE } from '../../../learning/types';

export function LessonScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Lesson'>) {
  const p = usePlayer();
  const { settings } = useSettings();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    playerApi.lesson(route.params.lessonId).then(setLesson).catch((e) => setError(friendlyError(e)));
  }, [route.params.lessonId]);
  const onSave = useCallback(
    async (body: Parameters<typeof playerApi.saveLessonProgress>[1]) => {
      try {
        const r = await playerApi.saveLessonProgress(route.params.lessonId, body);
        if (r.completed) void p.refresh();
        return r;
      } catch {
        return null;
      }
    },
    [route.params.lessonId, p]
  );
  if (error) return <ErrorState message={error} onRetry={() => navigation.goBack()} />;
  if (!lesson) return <LoadingState />;
  const selectedAge = route.params.age ?? p.me?.child.age ?? lesson.recommendedAge;
  // Text is simplified by the bracket of the age the child is learning at, not their profile.
  const bracket = BRACKET_FOR_AGE(selectedAge);
  const sound = settings.soundEnabled && (p.me?.controls.soundEnabled ?? true);
  const narration = settings.narrationEnabled && (p.me?.controls.narrationEnabled ?? true);
  return <LessonPlayer lesson={lesson} bracket={bracket} selectedAge={selectedAge} sound={sound} narration={narration} onSave={onSave} onExit={() => navigation.goBack()} />;
}
