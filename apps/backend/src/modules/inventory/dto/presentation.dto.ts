import { IsString, IsOptional, IsNumber, Min, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePresentationDto {
  @IsString()
  name: string; // "Suelta", "Media docena", "Cajetilla"

  @IsOptional()
  @IsString()
  description?: string; // "6 cervezas"

  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitsPerSale: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class UpdatePresentationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitsPerSale?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
