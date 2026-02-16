import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { HealthController } from './health.controller';
import { InventoryModule } from './inventory/inventory.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { StatsModule } from './stats/stats.module';
import { MastersModule } from './masters/masters.module';
import { FinanceModule } from './finance/finance.module';
import { CompanyModule } from './company/company.module';

@Module({
  imports: [InventoryModule, SalesModule, PurchasesModule, StatsModule, MastersModule, FinanceModule, CompanyModule],
  controllers: [HealthController],
  providers: [PrismaService]
})
export class AppModule {}
