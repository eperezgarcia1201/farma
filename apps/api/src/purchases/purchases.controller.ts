import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async list() {
    const tenantId = await this.getDefaultTenantId();
    return this.purchasesService.listPurchases(tenantId);
  }

  @Post()
  async create(@Body() dto: CreatePurchaseDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.purchasesService.createPurchase({
      tenantId,
      supplierId: dto.supplierId,
      employeeId: dto.employeeId,
      paymentMethod: dto.paymentMethod,
      creditTermDays: dto.creditTermDays,
      amountPaid: dto.amountPaid,
      items: dto.items
    });
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({ data: { name: 'Main Business', slug: 'main-business' } });
    return created.id;
  }
}
