import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const SkipStatusCheck = () => SetMetadata('skipStatusCheck', true);

@Injectable()
export class UserStatusGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const skipStatusCheck = this.reflector.getAllAndOverride<boolean>('skipStatusCheck', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipStatusCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Если user еще не установлен (JwtAuthGuard еще не выполнился), пропускаем
    // Статус будет проверен в следующем запросе после установки токена
    if (!user) {
      return true;
    }

    // Проверяем статус как строку (из JWT payload)
    if (user.status === 'pending') {
      throw new ForbiddenException('Account pending confirmation by administrator');
    }

    if (user.status === 'blocked') {
      throw new ForbiddenException('Account is blocked');
    }

    return true;
  }
}
