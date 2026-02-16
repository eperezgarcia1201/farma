import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('top-products')
  async topProducts() {
    const tenantId = await this.getDefaultTenantId();
    const rows = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          tenantId
        }
      },
      _sum: {
        quantity: true,
        lineTotal: true
      },
      orderBy: {
        _sum: {
          lineTotal: 'desc'
        }
      },
      take: 10
    });

    return rows;
  }

  @Get('dashboard')
  async dashboard() {
    const tenantId = await this.getDefaultTenantId();
    const [inventoryValue, receivables, payables, openExpenses] = await Promise.all([
      this.prisma.inventoryLot.aggregate({
        where: { tenantId, status: 'ACTIVE' },
        _sum: { remainingQty: true }
      }),
      this.prisma.accountReceivable.aggregate({
        where: { tenantId, status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balance: true }
      }),
      this.prisma.accountPayable.aggregate({
        where: { tenantId, status: { in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'] } },
        _sum: { balance: true }
      }),
      this.prisma.expense.aggregate({
        where: { tenantId },
        _sum: { amount: true }
      })
    ]);

    return {
      inventoryUnits: inventoryValue._sum.remainingQty ?? 0,
      receivablesBalance: receivables._sum.balance ?? 0,
      payablesBalance: payables._sum.balance ?? 0,
      expensesTotal: openExpenses._sum.amount ?? 0
    };
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({ data: { name: 'Main Business', slug: 'main-business' } });
    return created.id;
  }
}
