import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LotStatus, MovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async catalog(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      include: {
        activeLot: true,
        lots: {
          where: { status: { in: [LotStatus.ACTIVE, LotStatus.PENDING] } },
          orderBy: { receivedAt: 'asc' }
        }
      },
      orderBy: { name: 'asc' }
    });
  }

  async createProduct(input: {
    tenantId: string;
    sku: string;
    name: string;
    description?: string;
    barcode?: string;
    unit?: string;
    reorderPoint?: number;
  }) {
    return this.prisma.product.create({
      data: {
        tenantId: input.tenantId,
        sku: input.sku,
        name: input.name,
        description: input.description,
        barcode: input.barcode,
        unit: input.unit ?? 'unit',
        reorderPoint: new Prisma.Decimal(input.reorderPoint ?? 0)
      }
    });
  }

  async registerPurchaseLot(
    input: {
      tenantId: string;
      productId: string;
      batchNumber: string;
      quantity: number;
      purchaseCost: number;
      salePrice: number;
      expirationDate?: Date;
      referenceId?: string;
    },
    tx?: Prisma.TransactionClient
  ) {
    if (tx) {
      return this.registerPurchaseLotTx(tx, input);
    }

    return this.prisma.$transaction((trx) => this.registerPurchaseLotTx(trx, input));
  }

  async consumeProduct(
    tenantId: string,
    productId: string,
    quantity: number,
    referenceId: string,
    tx?: Prisma.TransactionClient
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    if (tx) {
      return this.consumeProductTx(tx, tenantId, productId, quantity, referenceId);
    }

    return this.prisma.$transaction((trx) =>
      this.consumeProductTx(trx, tenantId, productId, quantity, referenceId)
    );
  }

  private async registerPurchaseLotTx(
    tx: Prisma.TransactionClient,
    input: {
      tenantId: string;
      productId: string;
      batchNumber: string;
      quantity: number;
      purchaseCost: number;
      salePrice: number;
      expirationDate?: Date;
      referenceId?: string;
    }
  ) {
    const product = await tx.product.findFirst({
      where: { id: input.productId, tenantId: input.tenantId }
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const hasActiveStock = Number(product.currentStock) > 0;
    const lotStatus = hasActiveStock ? LotStatus.PENDING : LotStatus.ACTIVE;

    const lot = await tx.inventoryLot.create({
      data: {
        tenantId: input.tenantId,
        productId: input.productId,
        batchNumber: input.batchNumber,
        quantityIn: new Prisma.Decimal(input.quantity),
        remainingQty: new Prisma.Decimal(input.quantity),
        purchaseCost: new Prisma.Decimal(input.purchaseCost),
        salePrice: new Prisma.Decimal(input.salePrice),
        expirationDate: input.expirationDate,
        status: lotStatus,
        isPriceScheduled: hasActiveStock
      }
    });

    await tx.inventoryMovement.create({
      data: {
        tenantId: input.tenantId,
        productId: input.productId,
        lotId: lot.id,
        movementType: MovementType.PURCHASE_IN,
        quantity: new Prisma.Decimal(input.quantity),
        referenceId: input.referenceId
      }
    });

    const stockAfterUpdate = hasActiveStock
      ? Number(product.currentStock)
      : Number(product.currentStock) + input.quantity;

    await tx.product.update({
      where: { id: product.id },
      data: {
        currentStock: new Prisma.Decimal(stockAfterUpdate),
        ...(hasActiveStock
          ? {}
          : {
              currentCost: new Prisma.Decimal(input.purchaseCost),
              currentSalePrice: new Prisma.Decimal(input.salePrice),
              activeLotId: lot.id
            })
      }
    });

    return lot;
  }

  private async consumeProductTx(
    tx: Prisma.TransactionClient,
    tenantId: string,
    productId: string,
    quantity: number,
    referenceId: string
  ) {
    const product = await tx.product.findFirst({ where: { id: productId, tenantId } });
    if (!product) throw new NotFoundException('Product not found');

    const activeLot = await tx.inventoryLot.findFirst({
      where: {
        tenantId,
        productId,
        status: LotStatus.ACTIVE
      },
      orderBy: { receivedAt: 'asc' }
    });

    if (!activeLot || Number(activeLot.remainingQty) < quantity) {
      throw new BadRequestException('Insufficient stock in active lot');
    }

    const nextRemaining = Number(activeLot.remainingQty) - quantity;
    await tx.inventoryLot.update({
      where: { id: activeLot.id },
      data: {
        remainingQty: new Prisma.Decimal(nextRemaining),
        quantityOut: new Prisma.Decimal(Number(activeLot.quantityOut) + quantity),
        status: nextRemaining === 0 ? LotStatus.DEPLETED : LotStatus.ACTIVE
      }
    });

    await tx.inventoryMovement.create({
      data: {
        tenantId,
        productId,
        lotId: activeLot.id,
        movementType: MovementType.SALE_OUT,
        quantity: new Prisma.Decimal(quantity),
        referenceId
      }
    });

    const productNextStock = Number(product.currentStock) - quantity;
    await tx.product.update({
      where: { id: product.id },
      data: {
        currentStock: new Prisma.Decimal(productNextStock)
      }
    });

    if (nextRemaining === 0) {
      await this.activatePendingLot(tx, tenantId, productId);
    }

    return {
      lotId: activeLot.id,
      unitCost: Number(activeLot.purchaseCost),
      unitPrice: Number(activeLot.salePrice)
    };
  }

  private async activatePendingLot(tx: Prisma.TransactionClient, tenantId: string, productId: string) {
    const nextLot = await tx.inventoryLot.findFirst({
      where: {
        tenantId,
        productId,
        status: LotStatus.PENDING
      },
      orderBy: { receivedAt: 'asc' }
    });

    if (!nextLot) {
      await tx.product.update({
        where: { id: productId },
        data: { activeLotId: null }
      });
      return null;
    }

    await tx.inventoryLot.update({
      where: { id: nextLot.id },
      data: {
        status: LotStatus.ACTIVE,
        isPriceScheduled: false
      }
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        activeLotId: nextLot.id,
        currentCost: nextLot.purchaseCost,
        currentSalePrice: nextLot.salePrice,
        currentStock: nextLot.remainingQty
      }
    });

    return nextLot;
  }
}
