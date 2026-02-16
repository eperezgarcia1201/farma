import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CompanyController } from './company.controller';

@Module({
  controllers: [CompanyController],
  providers: [PrismaService]
})
export class CompanyModule {}
