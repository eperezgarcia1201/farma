import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InventoryModule } from '../inventory/inventory.module';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [InventoryModule],
  controllers: [PurchasesController],
  providers: [PurchasesService, PrismaService]
})
export class PurchasesModule {}
