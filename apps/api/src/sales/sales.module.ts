import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [InventoryModule],
  controllers: [SalesController],
  providers: [SalesService, PrismaService]
})
export class SalesModule {}
