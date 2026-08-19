import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { ShareAccessType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: { authorization?: string }; user?: unknown }>();
    const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new UnauthorizedException();
    }
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: { autoRefreshToken: false, persistSession: false },
        },
      );
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user.email) throw new UnauthorizedException();
      const email = data.user.email.toLowerCase();
      await this.prisma.user.upsert({
        where: { id: data.user.id },
        update: { email },
        create: { id: data.user.id, email },
      });
      await this.prisma.share.updateMany({
        where: {
          accessType: ShareAccessType.USER,
          recipientId: null,
          recipientEmail: email,
          revokedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { recipientId: data.user.id },
      });
      request.user = { id: data.user.id, email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
