import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateBaseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  serverPath: string;

  @IsString()
  @IsNotEmpty()
  adminUser: string;

  @IsString()
  @IsNotEmpty()
  adminPass: string;
}

export class UpdateBaseDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  serverPath?: string;

  @IsString()
  @IsOptional()
  adminUser?: string;

  @IsString()
  @IsOptional()
  adminPass?: string;
}
