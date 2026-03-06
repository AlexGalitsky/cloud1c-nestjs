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
import { CreateBaseDto, UpdateBaseDto, UploadDtDto } from './dto/base.dto';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    userId: number;
    email: string;
    role: string;
    status: string;
  };
}

@UseGuards(JwtAuthGuard)
@Controller('bases')
export class BasesController {
  constructor(private readonly basesService: BasesService) {}

  @Post()
  async create(@Body() createBaseDto: CreateBaseDto, @Req() req: RequestWithUser) {
    return this.basesService.create(createBaseDto, req.user.userId);
  }

  @Post(':id/dt-files')
  @UseInterceptors(FileInterceptor('dtFile'))
  async uploadDt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() dtFile: Express.Multer.File,
    @Body() uploadDto: UploadDtDto,
    @Req() req: RequestWithUser,
  ) {
    return this.basesService.uploadDt(id, req.user.userId, dtFile, uploadDto);
  }

  @Get()
  async findAll(@Req() req: RequestWithUser) {
    return this.basesService.findAll(req.user.userId);
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
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBaseDto: UpdateBaseDto,
    @Req() req: RequestWithUser,
  ) {
    return this.basesService.update(id, updateBaseDto, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    const result = await this.basesService.remove(id, req.user.userId);
    return result;
  }

  @Post(':id/publish')
  async publish(@Param('id', ParseIntPipe) id: number, @Req() req: RequestWithUser) {
    return this.basesService.publish(id, req.user.userId);
  }
}
