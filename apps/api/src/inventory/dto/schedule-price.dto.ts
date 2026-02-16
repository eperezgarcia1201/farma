import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SchedulePriceDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  productId!: string;

  @IsString()
  batchNumber!: string;

  @IsNumber()
  quantity!: number;

  @IsNumber()
  purchaseCost!: number;

  @IsNumber()
  salePrice!: number;
}
