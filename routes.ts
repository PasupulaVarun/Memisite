export const routes = {
  home: { path: '/', label: 'Home', title: 'Memisite: make memes move with you' },
  studio: { path: '/studio', label: 'Studio', title: 'Studio · Memisite' },
  effects: { path: '/effects', label: 'Effects', title: 'Effects · Memisite' },
  gestureLab: { path: '/gesture-lab', label: 'Gesture Lab', title: 'Gesture Lab · Memisite' },
  help: { path: '/help', label: 'Help', title: 'Help · Memisite' },
} as const;

export type RouteKey = keyof typeof routes;

/** Routes shown in the main navigation, in order. */
export const navRouteKeys: readonly RouteKey[] = ['studio', 'effects', 'gestureLab', 'help'];

export function getPageTitle(pathname: string): string {
  const match = Object.values(routes).find((route) => route.path === pathname);
  return match ? match.title : 'Page not found · Memisite';
}
