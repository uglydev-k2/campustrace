/**
 * Wraps every page and is re-created on each navigation, so the CSS
 * entrance below plays once per route change: a short fade and rise that
 * makes moving between pages feel continuous without slowing it down.
 * Reduced-motion settings turn it off (see globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
