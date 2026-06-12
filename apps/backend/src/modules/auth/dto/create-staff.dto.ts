import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';

export enum StaffRole {
  DUENO = 'DUENO',
  CAJERO = 'CAJERO',
}

export class CreateStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsString()
  @IsOptional()
  staffBranchId?: string;
}
