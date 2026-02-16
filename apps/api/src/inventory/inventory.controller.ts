import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { SchedulePriceDto } from './dto/schedule-price.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService
  ) {}

  @Get('catalog')
  async catalog() {
    const tenantId = await this.getDefaultTenantId();
    return this.inventoryService.catalog(tenantId);
  }

  @Post('products')
  async createProduct(@Body() dto: CreateProductDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.inventoryService.createProduct({ ...dto, tenantId });
  }

  @Post('lots/schedule')
  async scheduleLot(@Body() dto: SchedulePriceDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.inventoryService.registerPurchaseLot({
      tenantId,
      productId: dto.productId,
      batchNumber: dto.batchNumber,
      quantity: dto.quantity,
      purchaseCost: dto.purchaseCost,
      salePrice: dto.salePrice
    });
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({
      data: { name: 'Main Business', slug: 'main-business' }
    });
    return created.id;
  }
}
