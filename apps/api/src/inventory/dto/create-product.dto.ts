import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  sku!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  reorderPoint?: number;
}
