import { IsString, IsOptional, MinLength } from 'class-validator';
import { PaymentMethodType } from '@prisma/client';

export { PaymentMethodType };

export class CreatePaymentMethodDto {
  @IsString()
  type: PaymentMethodType;

  @IsString()
  @MinLength(2)
  displayName: string;

  @IsOptional()
  @IsString()
  accountInfo?: string;

  @IsOptional()
  @IsString()
  qrImageUrl?: string;
}
