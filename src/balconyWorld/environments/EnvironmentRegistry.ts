import { EnvironmentDefinition } from '../state/types';
import terraceModern from './terrace_modern_01/environment.json';

/** Every bundled environment, keyed by id. Adding one is a new folder with
 * an environment.json plus one line here (a build-time glob replaces the
 * line once there are more than a handful); a remote list from the API
 * merges over this later (architecture doc, section J). */
export const ENVIRONMENTS: Record<string, EnvironmentDefinition> = {
  [terraceModern.id]: terraceModern as EnvironmentDefinition,
};

export const STARTER_ENVIRONMENT_ID = terraceModern.id;

export function getEnvironment(id: string): EnvironmentDefinition {
  return ENVIRONMENTS[id] ?? ENVIRONMENTS[STARTER_ENVIRONMENT_ID];
}
