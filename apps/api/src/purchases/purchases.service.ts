import { Injectable } from '@nestjs/common';
import { CreditTermDays, DocumentStatus, PaymentMethod, Prisma } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma.service';

const termDaysMap: Record<CreditTermDays, number> = {
  DAYS_15: 15,
  DAYS_30: 30,
  DAYS_45: 45,
  DAYS_60: 60
};

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService
  ) {}

  async listPurchases(tenantId: string) {
    return this.prisma.purchase.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        employee: true,
        items: {
          include: { product: true },
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { purchasedAt: 'desc' },
      take: 200
    });
  }

  async createPurchase(input: {
    tenantId: string;
    supplierId: string;
    employeeId?: string;
    paymentMethod: PaymentMethod;
    creditTermDays?: CreditTermDays;
    amountPaid: number;
    items: Array<{
      productId: string;
      batchNumber: string;
      expirationDate?: string;
      quantity: number;
      unitCost: number;
      unitPrice: number;
    }>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const purchaseNumber = `PUR-${Date.now()}`;
      let subtotal = 0;

      for (const item of input.items) {
        subtotal += item.quantity * item.unitCost;
      }

      const total = subtotal;
      const balanceDue = total - input.amountPaid;
      const dueDate =
        input.paymentMethod === PaymentMethod.CREDIT && input.creditTermDays
          ? this.calculateDueDate(input.creditTermDays)
          : null;

      const purchase = await tx.purchase.create({
        data: {
          tenantId: input.tenantId,
          purchaseNumber,
          supplierId: input.supplierId,
          employeeId: input.employeeId,
          paymentMethod: input.paymentMethod,
          creditTermDays: input.creditTermDays,
          subtotal: new Prisma.Decimal(subtotal),
          total: new Prisma.Decimal(total),
          amountPaid: new Prisma.Decimal(input.amountPaid),
          balanceDue: new Prisma.Decimal(balanceDue),
          dueDate,
          status:
            balanceDue <= 0
              ? DocumentStatus.PAID
              : input.amountPaid > 0
                ? DocumentStatus.PARTIALLY_PAID
                : DocumentStatus.OPEN
        }
      });

      await tx.purchaseItem.createMany({
        data: input.items.map((item) => ({
          purchaseId: purchase.id,
          productId: item.productId,
          batchNumber: item.batchNumber,
          quantity: new Prisma.Decimal(item.quantity),
          unitCost: new Prisma.Decimal(item.unitCost),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.quantity * item.unitCost)
        }))
      });

      for (const item of input.items) {
        await this.inventoryService.registerPurchaseLot({
          tenantId: input.tenantId,
          productId: item.productId,
          batchNumber: item.batchNumber,
          expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
          quantity: item.quantity,
          purchaseCost: item.unitCost,
          salePrice: item.unitPrice,
          referenceId: purchase.id
        }, tx);
      }

      if (input.paymentMethod === PaymentMethod.CREDIT && balanceDue > 0 && dueDate) {
        await tx.accountPayable.create({
          data: {
            tenantId: input.tenantId,
            supplierId: input.supplierId,
            purchaseId: purchase.id,
            originalAmount: new Prisma.Decimal(total),
            balance: new Prisma.Decimal(balanceDue),
            dueDate,
            status: DocumentStatus.OPEN
          }
        });

        await tx.ledgerEntry.create({
          data: {
            tenantId: input.tenantId,
            partyType: 'SUPPLIER',
            partyId: input.supplierId,
            documentType: 'PURCHASE',
            documentId: purchase.id,
            debit: new Prisma.Decimal(0),
            credit: new Prisma.Decimal(balanceDue),
            note: 'Credit purchase generated payable'
          }
        });
      }

      return purchase;
    });
  }

  private calculateDueDate(term: CreditTermDays) {
    const days = termDaysMap[term];
    const due = new Date();
    due.setDate(due.getDate() + days);
    return due;
  }
}
