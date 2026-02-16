import { IsOptional, IsString } from 'class-validator';

export class CreateEmployeeDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsString()
  role!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
