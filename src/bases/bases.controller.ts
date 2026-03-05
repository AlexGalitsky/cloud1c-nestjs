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
  UseInterceptors,
  UploadedFile,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BasesService } from './bases.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBaseDto, UpdateBaseDto } from './dto/base.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number };
}

@UseGuards(JwtAuthGuard)
@Controller('bases')
export class BasesController {
  constructor(private readonly basesService: BasesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('dtFile'))
  async create(
    @Body() createBaseDto: CreateBaseDto,
    @UploadedFile() dtFile: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.basesService.create(createBaseDto, req.user.userId, dtFile);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    console.log('findAll called, userId:', req.user?.userId);
    const result = await this.basesService.findAll(req.user.userId);
    console.log('findAll result:', result);
    return result;
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.basesService.findOne(id, req.user.userId);
  }

  @Get(':id/status')
  async getStatus(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.basesService.getStatus(id, req.user.userId);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('dtFile'))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBaseDto: UpdateBaseDto,
    @UploadedFile() dtFile: Express.Multer.File,
    @Req() req: RequestWithUser,
  ) {
    return this.basesService.update(id, updateBaseDto, req.user.userId, dtFile);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    await this.basesService.remove(id, req.user.userId);
    return { message: 'Base deleted successfully' };
  }
}
