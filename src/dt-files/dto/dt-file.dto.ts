import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateDtFileDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  originalName: string;

  @IsString()
  @IsNotEmpty()
  filePath: string;

  @IsString()
  @IsNotEmpty()
  baseId: string;
}

export class ApplyDtFileDto {
  @IsString()
  @IsNotEmpty()
  baseId: string;

  @IsString()
  @IsNotEmpty()
  adminUser: string;

  @IsString()
  @IsNotEmpty()
  adminPass: string;

  @IsString()
  @IsNotEmpty()
  serverPath: string;
}
