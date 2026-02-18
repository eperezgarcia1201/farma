import { BadRequestException, Injectable } from '@nestjs/common';
import { CreditTermDays, DocumentStatus, LotStatus, PaymentMethod, Prisma } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { PrismaService } from '../prisma.service';

const termDaysMap: Record<CreditTermDays, number> = {
  DAYS_15: 15,
  DAYS_30: 30,
  DAYS_45: 45,
  DAYS_60: 60
};

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService
  ) {}

  async createSale(input: {
    tenantId: string;
    customerId?: string;
    employeeId?: string;
    paymentMethod: PaymentMethod;
    creditTermDays?: CreditTermDays;
    amountPaid: number;
    tax?: number;
    discount?: number;
    items: Array<{ productId: string; quantity: number }>;
  }) {
    if (input.paymentMethod === PaymentMethod.CREDIT && !input.customerId) {
      throw new BadRequestException('Customer is required for credit sales');
    }

    return this.prisma.$transaction(async (tx) => {
      const saleNumber = `SAL-${Date.now()}`;
      let subtotal = 0;
      const lineItems: Array<{
        productId: string;
        lotId: string;
        quantity: number;
        unitCost: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const item of input.items) {
        const consumed = await this.inventoryService.consumeProduct(
          input.tenantId,
          item.productId,
          item.quantity,
          saleNumber,
          tx
        );

        const lineTotal = consumed.unitPrice * item.quantity;
        subtotal += lineTotal;

        lineItems.push({
          productId: item.productId,
          lotId: consumed.lotId,
          quantity: item.quantity,
          unitCost: consumed.unitCost,
          unitPrice: consumed.unitPrice,
          lineTotal
        });
      }

      const discount = input.discount ?? 0;
      const tax = input.tax ?? 0;
      const total = subtotal - discount + tax;
      const balanceDue = total - input.amountPaid;
      const dueDate =
        input.paymentMethod === PaymentMethod.CREDIT && input.creditTermDays
          ? this.calculateDueDate(input.creditTermDays)
          : null;

      const sale = await tx.sale.create({
        data: {
          tenantId: input.tenantId,
          saleNumber,
          customerId: input.customerId,
          employeeId: input.employeeId,
          paymentMethod: input.paymentMethod,
          creditTermDays: input.creditTermDays,
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(discount),
          tax: new Prisma.Decimal(tax),
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

      await tx.saleItem.createMany({
        data: lineItems.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          lotId: item.lotId,
          quantity: new Prisma.Decimal(item.quantity),
          unitCost: new Prisma.Decimal(item.unitCost),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          lineTotal: new Prisma.Decimal(item.lineTotal)
        }))
      });

      if (input.paymentMethod === PaymentMethod.CREDIT && balanceDue > 0 && input.customerId && dueDate) {
        await tx.accountReceivable.create({
          data: {
            tenantId: input.tenantId,
            customerId: input.customerId,
            saleId: sale.id,
            originalAmount: new Prisma.Decimal(total),
            balance: new Prisma.Decimal(balanceDue),
            dueDate,
            status: DocumentStatus.OPEN
          }
        });

        await tx.ledgerEntry.create({
          data: {
            tenantId: input.tenantId,
            partyType: 'CUSTOMER',
            partyId: input.customerId,
            documentType: 'SALE',
            documentId: sale.id,
            debit: new Prisma.Decimal(balanceDue),
            credit: new Prisma.Decimal(0),
            note: 'Credit sale generated receivable'
          }
        });
      }

      return sale;
    });
  }

  async updateSale(
    tenantId: string,
    saleId: string,
    dto: {
      saleNumber?: string;
      soldAt?: string;
      amountPaid?: number;
      customerId?: string;
      employeeId?: string;
      paymentMethod?: PaymentMethod;
      creditTermDays?: CreditTermDays;
      discount?: number;
      tax?: number;
      items?: Array<{
        id?: string;
        productId: string;
        lotId?: string;
        quantity: number;
        unitPrice?: number;
      }>;
    }
  ) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenantId },
        include: {
          items: true
        }
      });
      if (!sale) throw new BadRequestException('Sale not found');
      if (sale.status === DocumentStatus.VOID) {
        throw new BadRequestException('Cannot update a voided sale');
      }

      const paymentMethod = dto.paymentMethod ?? sale.paymentMethod;
      const customerId = dto.customerId !== undefined ? dto.customerId || null : sale.customerId;
      const employeeId = dto.employeeId !== undefined ? dto.employeeId || null : sale.employeeId;
      const creditTermDays =
        paymentMethod === PaymentMethod.CREDIT
          ? dto.creditTermDays ?? sale.creditTermDays ?? CreditTermDays.DAYS_30
          : null;
      if (paymentMethod === PaymentMethod.CREDIT && !customerId) {
        throw new BadRequestException('Customer is required for credit sales');
      }

      let subtotal = Number(sale.subtotal);
      const nextDiscount = dto.discount ?? Number(sale.discount);
      const nextTax = dto.tax ?? Number(sale.tax);
      const lineItems: Array<{
        productId: string;
        lotId: string;
        quantity: number;
        unitCost: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      if (dto.items) {
        if (dto.items.length === 0) {
          throw new BadRequestException('Sale requires at least one item');
        }

        subtotal = 0;
        for (const item of dto.items) {
          if (item.quantity <= 0) {
            throw new BadRequestException('Item quantity must be greater than zero');
          }

          const existing = item.id ? sale.items.find((saleItem) => saleItem.id === item.id) : null;
          const lot =
            item.lotId
              ? await tx.inventoryLot.findFirst({
                  where: {
                    id: item.lotId,
                    tenantId,
                    productId: item.productId,
                    status: LotStatus.ACTIVE
                  }
                })
              : await tx.inventoryLot.findFirst({
                  where: {
                    id: existing?.lotId,
                    tenantId,
                    productId: item.productId
                  }
                });
          const fallbackLot =
            lot ??
            (await tx.inventoryLot.findFirst({
              where: {
                tenantId,
                productId: item.productId,
                status: LotStatus.ACTIVE
              },
              orderBy: { createdAt: 'desc' }
            }));

          if (!fallbackLot) {
            throw new BadRequestException(`No active lot found for product ${item.productId}`);
          }

          const unitCost = existing ? Number(existing.unitCost) : Number(fallbackLot.purchaseCost);
          const unitPrice =
            item.unitPrice !== undefined
              ? item.unitPrice
              : existing
                ? Number(existing.unitPrice)
                : Number(fallbackLot.salePrice);
          const lineTotal = item.quantity * unitPrice;
          subtotal += lineTotal;

          lineItems.push({
            productId: item.productId,
            lotId: fallbackLot.id,
            quantity: item.quantity,
            unitCost,
            unitPrice,
            lineTotal
          });
        }
      }

      const total = Math.max(0, subtotal - nextDiscount + nextTax);
      const nextAmountPaid = dto.amountPaid ?? Number(sale.amountPaid);
      const nextBalance = Math.max(0, total - nextAmountPaid);
      const nextStatus =
        nextBalance <= 0
          ? DocumentStatus.PAID
          : nextAmountPaid > 0
            ? DocumentStatus.PARTIALLY_PAID
            : DocumentStatus.OPEN;
      const dueDate =
        paymentMethod === PaymentMethod.CREDIT && creditTermDays
          ? this.calculateDueDate(creditTermDays)
          : null;

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          saleNumber: dto.saleNumber ?? sale.saleNumber,
          soldAt: dto.soldAt ? new Date(dto.soldAt) : sale.soldAt,
          customerId,
          employeeId,
          paymentMethod,
          creditTermDays,
          subtotal: new Prisma.Decimal(subtotal),
          discount: new Prisma.Decimal(nextDiscount),
          tax: new Prisma.Decimal(nextTax),
          total: new Prisma.Decimal(total),
          amountPaid: new Prisma.Decimal(nextAmountPaid),
          balanceDue: new Prisma.Decimal(nextBalance),
          dueDate,
          status: nextStatus
        }
      });

      if (dto.items) {
        await tx.saleItem.deleteMany({
          where: { saleId: sale.id }
        });
        await tx.saleItem.createMany({
          data: lineItems.map((item) => ({
            saleId: sale.id,
            productId: item.productId,
            lotId: item.lotId,
            quantity: new Prisma.Decimal(item.quantity),
            unitCost: new Prisma.Decimal(item.unitCost),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            lineTotal: new Prisma.Decimal(item.lineTotal)
          }))
        });
      }

      const receivable = await tx.accountReceivable.findUnique({
        where: { saleId: sale.id }
      });

      if (paymentMethod === PaymentMethod.CREDIT && customerId && dueDate) {
        const recStatus =
          nextBalance <= 0
            ? DocumentStatus.PAID
            : nextAmountPaid > 0
              ? DocumentStatus.PARTIALLY_PAID
              : DocumentStatus.OPEN;
        if (receivable) {
          await tx.accountReceivable.update({
            where: { id: receivable.id },
            data: {
              customerId,
              originalAmount: new Prisma.Decimal(total),
              balance: new Prisma.Decimal(nextBalance),
              dueDate,
              status: recStatus
            }
          });
        } else if (nextBalance > 0) {
          await tx.accountReceivable.create({
            data: {
              tenantId,
              customerId,
              saleId: sale.id,
              originalAmount: new Prisma.Decimal(total),
              balance: new Prisma.Decimal(nextBalance),
              dueDate,
              status: recStatus
            }
          });
        }
      } else if (receivable) {
        await tx.accountReceivable.delete({
          where: { id: receivable.id }
        });
      }

      return updatedSale;
    });
  }

  async recordPayment(tenantId: string, saleId: string, paymentAmount: number) {
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({
        where: { id: saleId, tenantId }
      });
      if (!sale) throw new BadRequestException('Sale not found');
      if (sale.status === DocumentStatus.VOID) {
        throw new BadRequestException('Cannot record payment for a voided sale');
      }

      const total = Number(sale.total);
      const currentPaid = Number(sale.amountPaid);
      const nextAmountPaid = Math.min(total, currentPaid + paymentAmount);
      const nextBalance = Math.max(0, total - nextAmountPaid);
      const nextStatus =
        nextBalance <= 0
          ? DocumentStatus.PAID
          : nextAmountPaid > 0
            ? DocumentStatus.PARTIALLY_PAID
            : DocumentStatus.OPEN;

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          amountPaid: new Prisma.Decimal(nextAmountPaid),
          balanceDue: new Prisma.Decimal(nextBalance),
          status: nextStatus
        }
      });

      const receivable = await tx.accountReceivable.findUnique({
        where: { saleId: sale.id }
      });

      if (receivable) {
        const receivableStatus =
          nextBalance <= 0
            ? DocumentStatus.PAID
            : nextAmountPaid > 0
              ? DocumentStatus.PARTIALLY_PAID
              : DocumentStatus.OPEN;
        await tx.accountReceivable.update({
          where: { id: receivable.id },
          data: {
            balance: new Prisma.Decimal(nextBalance),
            status: receivableStatus
          }
        });
      } else if (
        sale.paymentMethod === PaymentMethod.CREDIT &&
        sale.customerId &&
        sale.dueDate &&
        nextBalance > 0
      ) {
        await tx.accountReceivable.create({
          data: {
            tenantId,
            customerId: sale.customerId,
            saleId: sale.id,
            originalAmount: sale.total,
            balance: new Prisma.Decimal(nextBalance),
            dueDate: sale.dueDate,
            status: nextStatus
          }
        });
      }

      return updatedSale;
    });
  }

  async voidSale(tenantId: string, saleId: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findFirst({ where: { id: saleId, tenantId } });
      if (!sale) throw new BadRequestException('Sale not found');

      const updatedSale = await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: DocumentStatus.VOID,
          balanceDue: new Prisma.Decimal(0)
        }
      });

      const receivable = await tx.accountReceivable.findUnique({
        where: { saleId: sale.id }
      });
      if (receivable) {
        await tx.accountReceivable.update({
          where: { id: receivable.id },
          data: {
            status: DocumentStatus.VOID,
            balance: new Prisma.Decimal(0)
          }
        });
      }

      return updatedSale;
    });
  }

  private calculateDueDate(term: CreditTermDays) {
    const days = termDaysMap[term];
    const due = new Date();
    due.setDate(due.getDate() + days);
    return due;
  }
}
