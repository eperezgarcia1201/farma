import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  amount!: number;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
