import { IsString, IsOptional, IsNumber, Min, MinLength } from 'class-validator';

export class CreateTableDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
}
