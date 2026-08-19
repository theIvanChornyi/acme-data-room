const encodePathParameter = (value: string) => encodeURIComponent(value);

/** Canonical browser routes for the application. */
export const AppRoutes = {
  dashboard: '/',
  login: '/login',
  roomPattern: '/rooms/:roomId',
  sharedWithMe: '/shared-with-me',
  sharedWithMePattern: '/shared-with-me/:shareId',
  publicSharePattern: '/shared/:token',
  fallback: '*',
  room: (roomId: string) => `/rooms/${encodePathParameter(roomId)}`,
  receivedShare: (shareId: string) => `/shared-with-me/${encodePathParameter(shareId)}`,
  publicShare: (token: string) => `/shared/${encodePathParameter(token)}`,
} as const;
