import { IsNumber } from 'class-validator';

export class RecordSalePaymentDto {
  @IsNumber()
  amount!: number;
}
