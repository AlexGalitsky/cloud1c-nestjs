import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserStatus } from '../entities/user.entity';

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

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException('Account pending confirmation by administrator');
    }

    if (user.status === UserStatus.BLOCKED) {
      throw new ForbiddenException('Account is blocked');
    }

    return true;
  }
}
