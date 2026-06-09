import { IsString, IsOptional, IsUrl, MinLength } from 'class-validator';

export class CreateChainDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}

export class UpdateChainDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsUrl()
  logoUrl?: string;
}
