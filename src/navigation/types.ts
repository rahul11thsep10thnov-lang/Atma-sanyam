import { NavigatorScreenParams } from '@react-navigation/native';
import { RemoteImageRef, SessionConfig } from '../types';
import type { LegalDocId } from '../legal/documents';
import type { ReportContext } from '../social/api';

export type RootTabParamList = {
  Home: { mode?: 'plants' | 'jigsaw'; arrival?: string } | undefined; // arrival: a nonce so the same mode can be asked again
  History: { arrival?: string } | undefined; // the Balcony tab (route name kept for saved navigation state)
  Garden: { arrival?: string } | undefined;
  Museum: undefined;
  Friends: { tab?: 'friends' | 'requests' | 'find' } | undefined;
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  ActiveSession: { config: SessionConfig };
  ContentBrowser: { onSelect: (image: RemoteImageRef) => void; initialCategoryId?: string };
  Auth: { mode?: 'signIn' | 'profile' | 'password' } | undefined;
  Notifications: undefined;
  Legal: { doc: LegalDocId };
  Report: { userId: string; name: string; avatarId?: string | null; context: ReportContext; groupSessionId?: string };
  GroupSetup: { editSessionId?: string } | undefined;
  GroupLobby: { sessionId: string };
  Language: undefined;
};
