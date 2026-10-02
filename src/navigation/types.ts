import { NavigatorScreenParams } from '@react-navigation/native';
import { RemoteImageRef, SessionConfig } from '../types';

export type RootTabParamList = {
  Home: undefined;
  History: undefined; // the Balcony tab (route name kept for saved navigation state)
  Garden: undefined;
  Room: undefined;
  Progress: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  ActiveSession: { config: SessionConfig };
  ContentBrowser: { onSelect: (image: RemoteImageRef) => void; initialCategoryId?: string };
  Auth: undefined;
  Language: undefined;
};
