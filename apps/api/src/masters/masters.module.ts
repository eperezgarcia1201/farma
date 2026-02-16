import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { MastersController } from './masters.controller';

@Module({
  controllers: [MastersController],
  providers: [PrismaService]
})
export class MastersModule {}
