import { Body, Controller, Get, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

type ExchangeRateResponse = {
  base: 'USD';
  quote: 'NIO';
  rate: number;
  fetchedAt: string;
  source: string;
  stale: boolean;
};

@Controller('finance')
export class FinanceController {
  private exchangeRateCache: ExchangeRateResponse | null = null;

  constructor(private readonly prisma: PrismaService) {}

  @Post('expenses')
  async createExpense(@Body() dto: CreateExpenseDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.expense.create({
      data: {
        tenantId,
        category: dto.category,
        description: dto.description,
        amount: new Prisma.Decimal(dto.amount),
        paymentMethod: dto.paymentMethod
      }
    });
  }

  @Get('expenses')
  async listExpenses() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.expense.findMany({
      where: { tenantId },
      orderBy: { expenseDate: 'desc' },
      take: 100
    });
  }

  @Get('receivables')
  async listReceivables() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.accountReceivable.findMany({
      where: { tenantId },
      include: { customer: true, sale: true },
      orderBy: { dueDate: 'asc' }
    });
  }

  @Get('payables')
  async listPayables() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.accountPayable.findMany({
      where: { tenantId },
      include: { supplier: true, purchase: true },
      orderBy: { dueDate: 'asc' }
    });
  }

  @Get('exchange-rate')
  async getExchangeRate(): Promise<ExchangeRateResponse> {
    const today = new Date().toISOString().slice(0, 10);
    if (this.exchangeRateCache && this.exchangeRateCache.fetchedAt.slice(0, 10) === today) {
      return this.exchangeRateCache;
    }

    const sources = [
      {
        name: 'open.er-api.com',
        url: 'https://open.er-api.com/v6/latest/USD',
        pick: (data: unknown) =>
          Number((data as { rates?: Record<string, number> })?.rates?.NIO)
      },
      {
        name: 'exchangerate.host',
        url: 'https://api.exchangerate.host/latest?base=USD&symbols=NIO',
        pick: (data: unknown) =>
          Number((data as { rates?: Record<string, number> })?.rates?.NIO)
      }
    ] as const;

    for (const source of sources) {
      try {
        const res = await fetch(source.url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data: unknown = await res.json();
        const rate = source.pick(data);
        if (Number.isFinite(rate) && rate > 0) {
          const payload: ExchangeRateResponse = {
            base: 'USD',
            quote: 'NIO',
            rate,
            fetchedAt: new Date().toISOString(),
            source: source.name,
            stale: false
          };
          this.exchangeRateCache = payload;
          return payload;
        }
      } catch {
        // continue to next source
      }
    }

    if (this.exchangeRateCache) {
      return { ...this.exchangeRateCache, stale: true };
    }

    return {
      base: 'USD',
      quote: 'NIO',
      rate: 36.5,
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
      stale: true
    };
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({ data: { name: 'Main Business', slug: 'main-business' } });
    return created.id;
  }
}
