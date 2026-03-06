import { IsNotEmpty, IsString, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateBaseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-zA-Z][a-zA-Z0-9]*$/, {
    message: 'Название должно начинаться с английской буквы и содержать только английские буквы и цифры',
  })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  description?: string;
}

export class UpdateBaseDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  description?: string;
}

export class UploadDtDto {
  @IsString()
  @IsOptional()
  @MaxLength(50)
  adminUser?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  adminPass?: string;
}
