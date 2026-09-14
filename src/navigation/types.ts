import { NavigatorScreenParams } from '@react-navigation/native';
import { SessionConfig } from '../types';

export type RootTabParamList = {
  Home: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<RootTabParamList>;
  ActiveSession: { config: SessionConfig };
};
