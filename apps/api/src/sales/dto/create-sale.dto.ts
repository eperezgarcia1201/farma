import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class SaleItemInput {
  @IsString()
  productId!: string;

  @IsNumber()
  quantity!: number;
}

export class CreateSaleDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  creditTermDays?: 'DAYS_15' | 'DAYS_30' | 'DAYS_45' | 'DAYS_60';

  @IsNumber()
  amountPaid!: number;

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemInput)
  items!: SaleItemInput[];
}
