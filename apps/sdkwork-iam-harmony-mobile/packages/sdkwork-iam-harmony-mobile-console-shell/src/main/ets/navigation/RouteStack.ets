// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Push/pop stack of the `console` shell.
 *
 * The navigator keeps a stack rather than an index so a route can be replaced
 * without losing the entry it was pushed from, and so a back action is always
 * defined even when the current route is the first one pushed.
 */
import { type IamHarmonyConsoleRouteRegistration } from './ShellRoutes';

let stack: IamHarmonyConsoleRouteRegistration[] = [];

export function pushIamHarmonyConsoleRoute(route: IamHarmonyConsoleRouteRegistration): void {
  stack = stack.concat([route]);
}

/**
 * Pops the top route.
 *
 * Returns the new top rather than the popped route: every caller is a screen that
 * needs to know what to render next, and returning the removed entry invites a
 * caller to navigate back to the route it just left.
 */
export function popIamHarmonyConsoleRoute(): IamHarmonyConsoleRouteRegistration | undefined {
  const next: IamHarmonyConsoleRouteRegistration[] = stack.slice(0, Math.max(stack.length - 1, 0));
  stack = next;
  return next.length === 0 ? undefined : next[next.length - 1];
}

export function currentIamHarmonyConsoleRoute(): IamHarmonyConsoleRouteRegistration | undefined {
  return stack.length === 0 ? undefined : stack[stack.length - 1];
}

export function resetIamHarmonyConsoleRouteStack(): void {
  stack = [];
}
