export class UpdateUserDto {
  role?: 'admin' | 'user';
  status?: 'pending' | 'active' | 'blocked';
}
