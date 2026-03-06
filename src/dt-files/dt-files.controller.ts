import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  Body,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DtFilesService } from './dt-files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BasesService } from '../bases/bases.service';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: { userId: number };
}

export class ApplyDtDto {
  adminUser?: string;
  adminPass?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('bases/:baseId/dt-files')
export class DtFilesController {
  constructor(
    private readonly dtFilesService: DtFilesService,
    @Inject(forwardRef(() => BasesService))
    private readonly basesService: BasesService,
  ) {}

  @Get()
  async findAll(@Param('baseId', ParseIntPipe) baseId: number, @Req() req: RequestWithUser) {
    await this.basesService.findOne(baseId, req.user.userId);
    return this.dtFilesService.findAll(baseId);
  }

  @Get(':id')
  async findOne(
    @Param('baseId', ParseIntPipe) baseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    await this.basesService.findOne(baseId, req.user.userId);
    return this.dtFilesService.findOne(id, baseId);
  }

  @Delete(':id')
  async remove(
    @Param('baseId', ParseIntPipe) baseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    await this.basesService.findOne(baseId, req.user.userId);
    await this.dtFilesService.remove(id, baseId);
    return { message: 'File deleted successfully' };
  }

  @Post(':id/apply')
  async apply(
    @Param('baseId', ParseIntPipe) baseId: number,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
    @Body() applyDto: ApplyDtDto,
  ) {
    await this.basesService.findOne(baseId, req.user.userId);
    await this.dtFilesService.apply(id, baseId, applyDto.adminUser, applyDto.adminPass);
    return { message: 'Apply started' };
  }
}
