import { CreditTermDays, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested
} from 'class-validator';

class UpdateSaleItemDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsNumber()
  quantity!: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}

export class UpdateSaleDto {
  @IsOptional()
  @IsString()
  saleNumber?: string;

  @IsOptional()
  @IsDateString()
  soldAt?: string;

  @IsOptional()
  @IsNumber()
  amountPaid?: number;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(CreditTermDays)
  creditTermDays?: CreditTermDays;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsNumber()
  tax?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSaleItemDto)
  items?: UpdateSaleItemDto[];
}
