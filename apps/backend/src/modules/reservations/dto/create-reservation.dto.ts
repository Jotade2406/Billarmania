import { IsString, IsDateString } from 'class-validator';

export class CreateReservationDto {
  @IsString()
  tableId: string;

  @IsString()
  branchId: string;

  @IsDateString()
  reservedFor: string;
}
