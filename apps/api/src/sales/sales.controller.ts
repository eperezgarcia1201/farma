import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { RecordSalePaymentDto } from './dto/record-sale-payment.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  async create(@Body() dto: CreateSaleDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.salesService.createSale({
      tenantId,
      customerId: dto.customerId,
      employeeId: dto.employeeId,
      paymentMethod: dto.paymentMethod,
      creditTermDays: dto.creditTermDays,
      amountPaid: dto.amountPaid,
      tax: dto.tax,
      discount: dto.discount,
      items: dto.items
    });
  }

  @Get()
  async list() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.sale.findMany({
      where: { tenantId },
      include: {
        customer: true,
        employee: true,
        items: {
          include: { product: true },
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { soldAt: 'desc' },
      take: 100
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        employee: true,
        items: {
          include: { product: true },
          orderBy: { id: 'asc' }
        }
      }
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSaleDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.salesService.updateSale(tenantId, id, dto);
  }

  @Post(':id/payments')
  async recordPayment(@Param('id') id: string, @Body() dto: RecordSalePaymentDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.salesService.recordPayment(tenantId, id, dto.amount);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const tenantId = await this.getDefaultTenantId();
    return this.salesService.voidSale(tenantId, id);
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({ data: { name: 'Main Business', slug: 'main-business' } });
    return created.id;
  }
}
