import { NavigatorScreenParams } from '@react-navigation/native';
import { RemoteImageRef, SessionConfig } from '../types';

export type RootTabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  ActiveSession: { config: SessionConfig };
  ContentBrowser: { onSelect: (image: RemoteImageRef) => void };
};
