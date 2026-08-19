import type { ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppRoutes } from './app-routes';

type AppRouterProps = {
  authenticated: boolean;
  LoginScreen: ComponentType;
  DashboardScreen: ComponentType;
  RoomScreen: ComponentType;
  SharedRoomScreen: ComponentType;
  NotFoundScreen: ComponentType;
};

/** Keeps route declarations separate from screen implementation. */
export function AppRouter({
  authenticated,
  LoginScreen,
  DashboardScreen,
  RoomScreen,
  SharedRoomScreen,
  NotFoundScreen,
}: AppRouterProps) {
  return (
    <Routes>
      <Route path={AppRoutes.publicSharePattern} element={<SharedRoomScreen />} />
      {authenticated ? (
        <>
          <Route path={AppRoutes.dashboard} element={<DashboardScreen />} />
          <Route path={AppRoutes.roomPattern} element={<RoomScreen />} />
          <Route path={AppRoutes.login} element={<Navigate to={AppRoutes.dashboard} replace />} />
          <Route
            path={AppRoutes.sharedWithMe}
            element={<Navigate to={AppRoutes.dashboard} replace />}
          />
          <Route path={AppRoutes.sharedWithMePattern} element={<SharedRoomScreen />} />
          <Route path={AppRoutes.fallback} element={<NotFoundScreen />} />
        </>
      ) : (
        <>
          <Route path={AppRoutes.dashboard} element={<LoginScreen />} />
          <Route path={AppRoutes.login} element={<LoginScreen />} />
          <Route path={AppRoutes.fallback} element={<NotFoundScreen />} />
        </>
      )}
    </Routes>
  );
}
