import type { NavigatorScreenParams } from '@react-navigation/native';

export type DaduTabParamList = {
  World: { location?: string } | undefined;
  Learn: undefined;
  Stories: undefined;
  Tests: undefined;
  Me: undefined;
};

export type DaduStackParamList = {
  Language: undefined;
  ParentSetup: undefined;
  ChildProfile: { editId?: string } | undefined;
  Tabs: NavigatorScreenParams<DaduTabParamList> | undefined;
  Location: { id: string };
  Lesson: { lessonId: string; objectId?: string };
  Activity: { objectId: string };
  Story: { storyId: string; bedtime?: boolean };
  Assignment: { assignmentId: string };
  Echo: undefined;
  Section: { section: string };
  WorldHub: { world: string };
  Achievements: undefined;
  ParentGate: { next: 'ParentDashboard' | 'Settings' | 'ChildProfile' } | undefined;
  ParentDashboard: undefined;
  Settings: undefined;
  Playground: undefined;
};
