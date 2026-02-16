import { Body, Controller, Get, Post } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Controller('masters')
export class MastersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('employees')
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.employee.create({ data: { ...dto, tenantId } });
  }

  @Post('suppliers')
  async createSupplier(@Body() dto: CreateSupplierDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.supplier.create({ data: { ...dto, tenantId } });
  }

  @Post('customers')
  async createCustomer(@Body() dto: CreateCustomerDto) {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.customer.create({ data: { ...dto, tenantId } });
  }

  @Get('employees')
  async listEmployees() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.employee.findMany({ where: { tenantId, active: true }, orderBy: { firstName: 'asc' } });
  }

  @Get('suppliers')
  async listSuppliers() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.supplier.findMany({ where: { tenantId, active: true }, orderBy: { name: 'asc' } });
  }

  @Get('customers')
  async listCustomers() {
    const tenantId = await this.getDefaultTenantId();
    return this.prisma.customer.findMany({ where: { tenantId, active: true }, orderBy: { firstName: 'asc' } });
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({ data: { name: 'Main Business', slug: 'main-business' } });
    return created.id;
  }
}
