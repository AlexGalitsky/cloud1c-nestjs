import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequireRoles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('users/:id')
  async findUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.findUserById(id);
  }

  @Patch('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.adminService.updateUser(id, updateUserDto, req.user.userId);
  }

  @Post('users/:id/confirm')
  async confirmUser(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.adminService.confirmUser(id, req.user.userId);
  }

  @Post('users/:id/block')
  async blockUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.blockUser(id);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.adminService.deleteUser(id);
    return { message: 'User deleted successfully' };
  }

  @Post('users')
  async createUser(@Body() body: { email: string; password: string; role?: UserRole }) {
    return this.adminService.createUser(body.email, body.password, body.role);
  }
}
