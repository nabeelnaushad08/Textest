// DEPRECATED — safe to delete.
//
// This used to broker the Supabase auth session to the Lovable editor over
// postMessage while the app ran inside a Lovable preview iframe. The project now
// talks to its own Supabase project directly, so the broker is gone.
//
// The function is kept as a thin localStorage shim only so that any stray import
// left in the codebase still compiles. Nothing in the app imports it any more.

export function brokeredPreviewStorage() {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage;
}
