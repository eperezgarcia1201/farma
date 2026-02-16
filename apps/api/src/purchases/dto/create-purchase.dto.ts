import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

class PurchaseItemInput {
  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  unitCost!: number;

  @IsNumber()
  unitPrice!: number;
}

export class CreatePurchaseDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  supplierId!: string;

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemInput)
  items!: PurchaseItemInput[];
}
