import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

export interface AuthenticatedUser { id: string; email: string }

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
  if (!request.user) throw new UnauthorizedException();
  return request.user;
});
