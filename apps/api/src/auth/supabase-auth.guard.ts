import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new UnauthorizedException();
    }
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user.email) throw new UnauthorizedException();
      request.user = { id: data.user.id, email: data.user.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
