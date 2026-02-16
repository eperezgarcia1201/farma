/* eslint-disable no-console */
const API_URL = process.env.API_URL || 'http://localhost:14000/api';

async function get(path) {
  const res = await fetch(`${API_URL}/${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(`${API_URL}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    console.warn(`POST ${path} failed: ${res.status} ${text}`);
    return null;
  }
  return res.json();
}

function pick(arr, idx) {
  return arr[idx % arr.length];
}

async function main() {
  await post('company/profile', {
    companyName: 'Haytazentavo',
    ownerName: 'Elmer Perez',
    address: 'Rotonda Ruben Dario, 2 cuadras al sur',
    country: 'Nicaragua',
    phone: '+505 2222-3344',
    ruc: 'J0310001234567',
    ownerPhone: '+505 8888-1122',
    defaultTaxRate: 15
  });

  const employeesSeed = [
    { firstName: 'Ana', lastName: 'Lopez', role: 'Manager', phone: '+505 8881-0001' },
    { firstName: 'Carlos', lastName: 'Mendez', role: 'Cashier', phone: '+505 8881-0002' },
    { firstName: 'Sofia', lastName: 'Rivas', role: 'Inventory', phone: '+505 8881-0003' }
  ];
  for (const e of employeesSeed) await post('masters/employees', e);

  const customersSeed = [
    { firstName: 'Maria', lastName: 'Gonzalez', phone: '+505 8811-2001' },
    { firstName: 'Jose', lastName: 'Hernandez', phone: '+505 8811-2002' },
    { firstName: 'Lucia', lastName: 'Perez', phone: '+505 8811-2003' },
    { firstName: 'Daniel', lastName: 'Sanchez', phone: '+505 8811-2004' },
    { firstName: 'Fatima', lastName: 'Reyes', phone: '+505 8811-2005' }
  ];
  for (const c of customersSeed) await post('masters/customers', c);

  const suppliersSeed = [
    { name: 'Distribuidora Central', contactName: 'Miguel Ruiz', phone: '+505 2255-1001' },
    { name: 'Farm Supply SA', contactName: 'Paola Diaz', phone: '+505 2255-1002' },
    { name: 'Medic Import', contactName: 'Brenda Castillo', phone: '+505 2255-1003' }
  ];
  for (const s of suppliersSeed) await post('masters/suppliers', s);

  const productsSeed = [
    { sku: 'PARA-500', name: 'Paracetamol 500mg', unit: 'box', reorderPoint: 20 },
    { sku: 'IBUP-400', name: 'Ibuprofeno 400mg', unit: 'box', reorderPoint: 20 },
    { sku: 'AMOX-500', name: 'Amoxicilina 500mg', unit: 'box', reorderPoint: 15 },
    { sku: 'OMEP-20', name: 'Omeprazol 20mg', unit: 'box', reorderPoint: 18 },
    { sku: 'LORA-10', name: 'Loratadina 10mg', unit: 'box', reorderPoint: 12 },
    { sku: 'SUERO-500', name: 'Suero Oral 500ml', unit: 'unit', reorderPoint: 25 }
  ];
  for (const p of productsSeed) await post('inventory/products', p);

  const catalog = await get('inventory/catalog');
  for (let i = 0; i < catalog.length; i += 1) {
    const product = catalog[i];
    await post('inventory/lots/schedule', {
      productId: product.id,
      batchNumber: `L-${Date.now()}-${i}`,
      quantity: 80 + i * 10,
      purchaseCost: 35 + i * 5,
      salePrice: 50 + i * 8
    });
  }

  const suppliers = await get('masters/suppliers');
  const employees = await get('masters/employees');
  const customers = await get('masters/customers');
  const refreshedCatalog = await get('inventory/catalog');

  for (let i = 0; i < 3; i += 1) {
    const product = pick(refreshedCatalog, i);
    await post('purchases', {
      supplierId: pick(suppliers, i).id,
      employeeId: pick(employees, i).id,
      paymentMethod: i % 2 === 0 ? 'CREDIT' : 'CASH',
      creditTermDays: 'DAYS_30',
      amountPaid: i % 2 === 0 ? 0 : 1200,
      items: [
        {
          productId: product.id,
          batchNumber: `PO-${Date.now()}-${i}`,
          quantity: 50,
          unitCost: 40 + i * 5,
          unitPrice: 62 + i * 8
        }
      ]
    });
  }

  for (let i = 0; i < 8; i += 1) {
    const productA = pick(refreshedCatalog, i);
    const productB = pick(refreshedCatalog, i + 1);
    await post('sales', {
      customerId: pick(customers, i).id,
      employeeId: pick(employees, i).id,
      paymentMethod: i % 3 === 0 ? 'CREDIT' : 'CASH',
      creditTermDays: 'DAYS_15',
      amountPaid: i % 3 === 0 ? 0 : 250,
      discount: 10,
      tax: 20,
      items: [
        { productId: productA.id, quantity: 2 + (i % 3) },
        { productId: productB.id, quantity: 1 + (i % 2) }
      ]
    });
  }

  const expensesSeed = [
    { category: 'Electricity', description: 'Monthly electricity bill', amount: 210, paymentMethod: 'CASH' },
    { category: 'Internet', description: 'Office internet', amount: 80, paymentMethod: 'CASH' },
    { category: 'Delivery', description: 'Local deliveries', amount: 145, paymentMethod: 'CREDIT' },
    { category: 'Maintenance', description: 'A/C maintenance', amount: 95, paymentMethod: 'CASH' }
  ];
  for (const e of expensesSeed) await post('finance/expenses', e);

  console.log('Sample data generation finished.');
  console.log(`API: ${API_URL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
