import { Body, Controller, Get, Post } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { UpsertCompanyProfileDto } from './dto/upsert-company-profile.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async getProfile() {
    const tenantId = await this.getDefaultTenantId();
    const profile = await this.prisma.companyProfile.findUnique({ where: { tenantId } });

    if (profile) return profile;

    return this.prisma.companyProfile.create({
      data: {
        tenantId,
        companyName: 'Haytazentavo',
        ownerName: '',
        address: '',
        country: 'Nicaragua',
        phone: '',
        ruc: '',
        ownerPhone: '',
        defaultTaxRate: new Prisma.Decimal(15)
      }
    });
  }

  @Post('profile')
  async upsertProfile(@Body() dto: UpsertCompanyProfileDto) {
    const tenantId = await this.getDefaultTenantId();

    return this.prisma.companyProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        companyName: dto.companyName?.trim() || 'Haytazentavo',
        ownerName: dto.ownerName,
        address: dto.address,
        country: dto.country,
        phone: dto.phone,
        ruc: dto.ruc,
        ownerPhone: dto.ownerPhone,
        defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate ?? 15)
      },
      update: {
        ...(dto.companyName !== undefined ? { companyName: dto.companyName.trim() || 'Haytazentavo' } : {}),
        ...(dto.ownerName !== undefined ? { ownerName: dto.ownerName } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.country !== undefined ? { country: dto.country } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.ruc !== undefined ? { ruc: dto.ruc } : {}),
        ...(dto.ownerPhone !== undefined ? { ownerPhone: dto.ownerPhone } : {}),
        ...(dto.defaultTaxRate !== undefined
          ? { defaultTaxRate: new Prisma.Decimal(dto.defaultTaxRate) }
          : {})
      }
    });
  }

  private async getDefaultTenantId() {
    const existing = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
    if (existing) return existing.id;
    const created = await this.prisma.tenant.create({ data: { name: 'Main Business', slug: 'main-business' } });
    return created.id;
  }
}
