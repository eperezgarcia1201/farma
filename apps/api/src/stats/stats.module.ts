import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { StatsController } from './stats.controller';

@Module({
  controllers: [StatsController],
  providers: [PrismaService]
})
export class StatsModule {}
