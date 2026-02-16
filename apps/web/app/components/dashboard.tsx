'use client';

import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type Stats = {
  inventoryUnits?: string | number;
  receivablesBalance?: string | number;
  payablesBalance?: string | number;
  expensesTotal?: string | number;
};

type CatalogLot = {
  id: string;
  batchNumber?: string;
  remainingQty?: string | number;
  salePrice?: string | number;
  purchaseCost?: string | number;
  expirationDate?: string | null;
  receivedAt?: string;
  status?: string;
};

type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  unit?: string;
  reorderPoint?: string | number;
  currentStock?: string | number;
  currentCost?: string | number;
  currentSalePrice?: string | number;
  activeLot?: CatalogLot | null;
  lots?: CatalogLot[];
};

type Customer = { id: string; firstName: string; lastName: string; phone?: string | null };
type Supplier = { id: string; name: string; contactName?: string | null; phone?: string | null };
type Employee = { id: string; firstName: string; lastName: string; role: string };
type Receivable = { id: string; balance?: string | number; dueDate?: string; status?: string; customer?: { firstName?: string; lastName?: string } | null };
type Payable = { id: string; balance?: string | number; dueDate?: string; status?: string; supplier?: { name?: string } | null };
type Expense = { id: string; category: string; description?: string; amount?: string | number; paymentMethod?: string; expenseDate?: string };
type TopProduct = { productId: string; _sum?: { quantity?: string | number; lineTotal?: string | number } };
type SaleCreated = {
  id: string;
  saleNumber?: string;
  soldAt?: string;
  status?: string;
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
  paymentMethod?: string;
  amountPaid?: string | number;
  balanceDue?: string | number;
};
type CompanyProfile = {
  companyName: string;
  ownerName?: string;
  address?: string;
  country?: string;
  phone?: string;
  ruc?: string;
  ownerPhone?: string;
  defaultTaxRate?: string | number;
};
type SaleHistory = {
  id: string;
  saleNumber?: string;
  soldAt?: string;
  status?: string;
  dueDate?: string;
  creditTermDays?: CreditTermDays;
  subtotal?: string | number;
  discount?: string | number;
  tax?: string | number;
  total?: string | number;
  paymentMethod?: string;
  amountPaid?: string | number;
  balanceDue?: string | number;
  customer?: { id?: string; firstName?: string; lastName?: string } | null;
  employee?: { id?: string; firstName?: string; lastName?: string } | null;
  items?: Array<{
    id?: string;
    quantity?: string | number;
    unitPrice?: string | number;
    lineTotal?: string | number;
    product?: { id?: string; name?: string } | null;
  }>;
};

type PurchaseHistory = {
  id: string;
  purchaseNumber?: string;
  purchasedAt?: string;
  status?: string;
  paymentMethod?: string;
  subtotal?: string | number;
  tax?: string | number;
  total?: string | number;
  amountPaid?: string | number;
  balanceDue?: string | number;
  dueDate?: string;
  supplier?: { id?: string; name?: string } | null;
  employee?: { id?: string; firstName?: string; lastName?: string } | null;
  items?: Array<{
    id?: string;
    quantity?: string | number;
    unitCost?: string | number;
    lineTotal?: string | number;
    product?: { id?: string; name?: string } | null;
  }>;
};

type Lang = 'en' | 'es';
type Theme = 'light' | 'dark';
type Tab = 'product' | 'lot' | 'customer' | 'supplier';
type MenuKey =
  | 'dashboard'
  | 'inventory'
  | 'invoices'
  | 'customers'
  | 'suppliers'
  | 'receivables'
  | 'payables'
  | 'expenses'
  | 'reports'
  | 'settings';
type InvoiceSection = 'current' | 'open' | 'past' | 'detail' | 'edit' | 'quotes';
type InvoiceStatusFilter = 'ALL' | 'OPEN' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE';

type PaymentMethod = 'CASH' | 'CREDIT';
type CreditTermDays = 'DAYS_15' | 'DAYS_30' | 'DAYS_45' | 'DAYS_60';
type Dict = Record<string, string>;
type EditInvoiceItem = {
  id?: string;
  productId: string;
  quantity: string;
  unitPrice: string;
};
type CurrencyCode = 'NIO' | 'USD';
type ExchangeRate = {
  base: 'USD';
  quote: 'NIO';
  rate: number;
  fetchedAt: string;
  source: string;
  stale: boolean;
};

type QuoteLine = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type QuoteRecord = {
  id: string;
  quoteNumber: string;
  customer: string;
  customerId?: string;
  employeeName: string;
  employeeId?: string;
  paymentMethod: PaymentMethod;
  creditTermDays?: CreditTermDays;
  quoteDate: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: CurrencyCode;
  createdAt: string;
  items: QuoteLine[];
};

const text: Record<Lang, Dict> = {
  en: {
    app: 'Haytazentavo',
    welcome: 'Welcome to the Farma Control Center!',
    subtitle: 'Inventory, sales, debts, receivables and payables in one place.',
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    invoices: 'Invoices',
    sales: 'Sales',
    customers: 'Customers',
    suppliers: 'Suppliers',
    receivables: 'Receivables',
    payables: 'Payables',
    expenses: 'Expenses',
    reports: 'Reports',
    settings: 'Settings',
    companyConfig: 'Company Configuration',
    employees: 'Employees',
    menu: 'Menu',
    search: 'Search...',
    english: 'English',
    spanish: 'Spanish',
    light: 'Light',
    dark: 'Dark',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
    inventoryUnits: 'Inventory Units',
    receivablesCard: 'Receivables',
    payablesCard: 'Payables',
    expensesCard: 'Expenses',
    stockHealthy: 'Stock healthy',
    overdueInvoices: 'overdue invoices',
    upcomingBills: 'upcoming bills',
    last7days: 'Last 7 days',
    addProduct: 'Add Product',
    scheduleLot: 'Schedule Lot / Future Price',
    addCustomer: 'Add Customer',
    addSupplier: 'Add Supplier',
    addEmployee: 'Add Employee',
    registerSale: 'Register Sale',
    registerPurchase: 'Register Purchase',
    registerExpense: 'Register Expense',
    sku: 'SKU',
    name: 'Name',
    unit: 'Unit',
    reorderPoint: 'Reorder Point',
    product: 'Product',
    productId: 'Product ID',
    batch: 'Batch',
    quantity: 'Quantity',
    cost: 'Cost',
    salePrice: 'Sale Price',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    contact: 'Contact',
    role: 'Role',
    address: 'Address',
    ownerName: 'Owner Name',
    ownerPhone: 'Owner Phone',
    country: 'Country',
    ruc: 'RUC',
    taxRate: 'Tax %',
    tax: 'Tax',
    discount: 'Discount',
    total: 'Total',
    category: 'Category',
    description: 'Description',
    paymentMethod: 'Payment Method',
    currency: 'Currency',
    nicaraguanCordoba: 'Nicaraguan Cordoba (NIO)',
    usDollar: 'US Dollar (USD)',
    fxToday: 'Today rate',
    cash: 'Cash',
    credit: 'Credit',
    creditTerm: 'Credit Term',
    days15: '15 days',
    days30: '30 days',
    days45: '45 days',
    days60: '60 days',
    amountPaid: 'Amount Paid',
    supplier: 'Supplier',
    customer: 'Customer',
    customerSearch: 'Find customer (name / last name)',
    employee: 'Employee',
    itemLines: 'Invoice Items',
    addItem: 'Add Item',
    remove: 'Remove',
    unitPrice: 'Unit Price',
    lineTotal: 'Line Total',
    subtotal: 'Subtotal',
    saveProduct: 'Save Product',
    saveLot: 'Save Lot',
    saveCustomer: 'Save Customer',
    saveSupplier: 'Save Supplier',
    saveEmployee: 'Save Employee',
    saveCompanyConfig: 'Save Company Configuration',
    saveSale: 'Save Sale',
    savePurchase: 'Save Purchase',
    saveExpense: 'Save Expense',
    catalog: 'Virtual Catalog',
    noData: 'No data available',
    exportCsv: 'Export CSV',
    exportExcel: 'Export Excel',
    reportPeriod: 'Period',
    update: 'Update',
    currentPeriod: 'Current period',
    invoicePreview: 'Invoice Preview',
    currentInvoice: 'Current Invoice',
    openInvoices: 'Open Invoices',
    pastInvoices: 'Past Invoices',
    quotes: 'Quotes',
    back: 'Back',
    actions: 'Actions',
    view: 'View',
    edit: 'Edit',
    delete: 'Delete',
    newInvoice: 'New Invoice',
    customerName: 'Customer',
    status: 'Status',
    invoiceNo: 'Invoice',
    printInvoice: 'Print Invoice',
    downloadPdf: 'Download PDF',
    noInvoiceYet: 'No invoice yet. Save a sale to generate one.',
    logout: 'Logout',
    failed: 'failed',
    dataRefreshed: 'Data refreshed',
    invalidCreditSale: 'Credit sale requires a customer.',
    invalidCreditPurchase: 'Credit purchase requires a supplier.',
    noCustomerMatches: 'No matching customers.',
    recentInvoices: 'Recent Invoices',
    invoiceSummary: 'Invoice Summary',
    all: 'All',
    markPaid: 'Mark Paid',
    paidStamp: 'PAID',
    lowStockAlerts: 'Low Stock Alerts',
    expiringLots: 'Expiring Lots',
    daysLeft: 'Days Left',
    agingReceivables: 'Receivables Aging',
    agingPayables: 'Payables Aging',
    current: 'Current',
    days1to30: '1-30 days',
    days31to60: '31-60 days',
    days61plus: '61+ days',
    topCustomers: 'Top Customers',
    topSuppliers: 'Top Suppliers',
    employeePerformance: 'Employee Performance',
    activityTimeline: 'Activity Timeline',
    salesAmount: 'Sales',
    purchasesAmount: 'Purchases',
    invoicesCount: 'Invoices',
    receiptsCount: 'Receipts',
    netFlow: 'Net Flow',
    activitySale: 'Sale',
    activityPurchase: 'Purchase',
    activityExpense: 'Expense',
    overviewKpis: 'Overview KPIs',
    overdue: 'Overdue',
    dueSoon: 'Due Soon',
    createQuote: 'Create Quote',
    quoteItems: 'Quote Items',
    items: 'Items',
    quoteNo: 'Quote',
    quotePreview: 'Quote Preview'
  },
  es: {
    app: 'Haytazentavo',
    welcome: 'Bienvenido al Centro de Control Farma!',
    subtitle: 'Inventario, ventas, deudas, cuentas por cobrar y pagar en un solo lugar.',
    dashboard: 'Tablero',
    inventory: 'Inventario',
    invoices: 'Facturas',
    sales: 'Ventas',
    customers: 'Clientes',
    suppliers: 'Proveedores',
    receivables: 'Por Cobrar',
    payables: 'Por Pagar',
    expenses: 'Gastos',
    reports: 'Reportes',
    settings: 'Configuracion',
    companyConfig: 'Configuracion de Empresa',
    employees: 'Empleados',
    menu: 'Menu',
    search: 'Buscar...',
    english: 'Ingles',
    spanish: 'Espanol',
    light: 'Claro',
    dark: 'Oscuro',
    refresh: 'Actualizar',
    refreshing: 'Actualizando...',
    inventoryUnits: 'Unidades Inventario',
    receivablesCard: 'Cuentas por Cobrar',
    payablesCard: 'Cuentas por Pagar',
    expensesCard: 'Gastos',
    stockHealthy: 'Stock saludable',
    overdueInvoices: 'facturas vencidas',
    upcomingBills: 'pagos pendientes',
    last7days: 'Ultimos 7 dias',
    addProduct: 'Agregar Producto',
    scheduleLot: 'Programar Lote / Precio Futuro',
    addCustomer: 'Agregar Cliente',
    addSupplier: 'Agregar Proveedor',
    addEmployee: 'Agregar Empleado',
    registerSale: 'Registrar Venta',
    registerPurchase: 'Registrar Compra',
    registerExpense: 'Registrar Gasto',
    sku: 'SKU',
    name: 'Nombre',
    unit: 'Unidad',
    reorderPoint: 'Punto de Reorden',
    product: 'Producto',
    productId: 'ID Producto',
    batch: 'Lote',
    quantity: 'Cantidad',
    cost: 'Costo',
    salePrice: 'Precio Venta',
    firstName: 'Nombre',
    lastName: 'Apellido',
    phone: 'Telefono',
    contact: 'Contacto',
    role: 'Cargo',
    address: 'Direccion',
    ownerName: 'Nombre del Propietario',
    ownerPhone: 'Telefono del Propietario',
    country: 'Pais',
    ruc: 'RUC',
    taxRate: 'Impuesto %',
    tax: 'Impuesto',
    discount: 'Descuento',
    total: 'Total',
    category: 'Categoria',
    description: 'Descripcion',
    paymentMethod: 'Metodo de Pago',
    currency: 'Moneda',
    nicaraguanCordoba: 'Cordoba Nicaraguense (NIO)',
    usDollar: 'Dolar Estadounidense (USD)',
    fxToday: 'Tipo de cambio hoy',
    cash: 'Contado',
    credit: 'Credito',
    creditTerm: 'Plazo de Credito',
    days15: '15 dias',
    days30: '30 dias',
    days45: '45 dias',
    days60: '60 dias',
    amountPaid: 'Monto Pagado',
    supplier: 'Proveedor',
    customer: 'Cliente',
    customerSearch: 'Buscar cliente (nombre / apellido)',
    employee: 'Empleado',
    itemLines: 'Items de Factura',
    addItem: 'Agregar Item',
    remove: 'Quitar',
    unitPrice: 'Precio Unitario',
    lineTotal: 'Total Linea',
    subtotal: 'Subtotal',
    saveProduct: 'Guardar Producto',
    saveLot: 'Guardar Lote',
    saveCustomer: 'Guardar Cliente',
    saveSupplier: 'Guardar Proveedor',
    saveEmployee: 'Guardar Empleado',
    saveCompanyConfig: 'Guardar Configuracion',
    saveSale: 'Guardar Venta',
    savePurchase: 'Guardar Compra',
    saveExpense: 'Guardar Gasto',
    catalog: 'Catalogo Virtual',
    noData: 'Sin datos',
    exportCsv: 'Exportar CSV',
    exportExcel: 'Exportar Excel',
    reportPeriod: 'Periodo',
    update: 'Actualizar',
    currentPeriod: 'Periodo actual',
    invoicePreview: 'Vista Previa de Factura',
    currentInvoice: 'Factura Actual',
    openInvoices: 'Facturas Abiertas',
    pastInvoices: 'Facturas Anteriores',
    quotes: 'Cotizaciones',
    back: 'Volver',
    actions: 'Acciones',
    view: 'Ver',
    edit: 'Editar',
    delete: 'Eliminar',
    newInvoice: 'Nueva Factura',
    customerName: 'Cliente',
    status: 'Estado',
    invoiceNo: 'Factura',
    printInvoice: 'Imprimir Factura',
    downloadPdf: 'Descargar PDF',
    noInvoiceYet: 'Aun no hay factura. Guarda una venta para generarla.',
    logout: 'Salir',
    failed: 'fallo',
    dataRefreshed: 'Datos actualizados',
    invalidCreditSale: 'La venta a credito requiere cliente.',
    invalidCreditPurchase: 'La compra a credito requiere proveedor.',
    noCustomerMatches: 'No hay clientes coincidentes.',
    recentInvoices: 'Facturas Recientes',
    invoiceSummary: 'Resumen de Factura',
    all: 'Todo',
    markPaid: 'Marcar Pagada',
    paidStamp: 'PAGADO',
    lowStockAlerts: 'Alertas de Stock Bajo',
    expiringLots: 'Lotes por Vencer',
    daysLeft: 'Dias Restantes',
    agingReceivables: 'Antiguedad por Cobrar',
    agingPayables: 'Antiguedad por Pagar',
    current: 'Vigente',
    days1to30: '1-30 dias',
    days31to60: '31-60 dias',
    days61plus: '61+ dias',
    topCustomers: 'Mejores Clientes',
    topSuppliers: 'Mejores Proveedores',
    employeePerformance: 'Rendimiento de Empleados',
    activityTimeline: 'Linea de Actividad',
    salesAmount: 'Ventas',
    purchasesAmount: 'Compras',
    invoicesCount: 'Facturas',
    receiptsCount: 'Comprobantes',
    netFlow: 'Flujo Neto',
    activitySale: 'Venta',
    activityPurchase: 'Compra',
    activityExpense: 'Gasto',
    overviewKpis: 'KPIs Generales',
    overdue: 'Vencido',
    dueSoon: 'Por vencer',
    createQuote: 'Crear Cotizacion',
    quoteItems: 'Items de Cotizacion',
    items: 'Items',
    quoteNo: 'Cotizacion',
    quotePreview: 'Vista de Cotizacion'
  }
};

const menuIcons: Record<MenuKey, string> = {
  dashboard: '◉',
  inventory: '▦',
  invoices: '◍',
  customers: '◎',
  suppliers: '◈',
  receivables: '↗',
  payables: '↙',
  expenses: '◍',
  reports: '◔',
  settings: '⚙'
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api-proxy/${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api-proxy/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`/api-proxy/${path}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`/api-proxy/${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

const money = (v: string | number | undefined) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : '0';
};

const dateShort = (v: string | undefined) => (v ? new Date(v).toLocaleDateString() : '-');

const daysDiffFromToday = (v: string | undefined) => {
  if (!v) return 0;
  const dayMs = 86_400_000;
  const target = new Date(v);
  const now = new Date();
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((targetStart - todayStart) / dayMs);
};

const n = (v: string) => {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
};

const num = (v: string | number | undefined) => {
  const parsed = Number(v ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fullCustomerName = (customer: Customer) =>
  `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.replace(/\s+/g, ' ').trim();

const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
const asMoneyInput = (value: number) => value.toFixed(2);

type InvoiceLike = { id: string; saleNumber?: string; soldAt?: string };

const rawInvoiceNumber = (invoice: InvoiceLike | null | undefined) =>
  invoice ? (invoice.saleNumber ?? invoice.id) : '-';

const humanInvoiceNumber = (invoice: InvoiceLike | null | undefined) => {
  const raw = rawInvoiceNumber(invoice);
  if (raw === '-') return raw;
  const prefixMatch = raw.match(/^([A-Za-z]{2,5})/);
  const prefix = (prefixMatch?.[1] ?? 'INV').toUpperCase();
  const tailDigits = raw.match(/(\d{4,})$/);
  if (!tailDigits) return raw;
  return `${prefix}-${tailDigits[1].slice(-4)}`;
};

const buildQuoteNumber = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const serial = String(Date.now()).slice(-4);
  return `QTE-${y}${m}${d}-${serial}`;
};

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [tab, setTab] = useState<Tab>('product');
  const [activeMenu, setActiveMenu] = useState<MenuKey>('dashboard');
  const [invoiceSubmenuOpen, setInvoiceSubmenuOpen] = useState(false);
  const [invoiceSection, setInvoiceSection] = useState<InvoiceSection>('open');
  const [saleCurrency, setSaleCurrency] = useState<CurrencyCode>('NIO');
  const [editCurrency, setEditCurrency] = useState<CurrencyCode>('NIO');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [query, setQuery] = useState('');
  const [reportPeriod, setReportPeriod] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [stats, setStats] = useState<Stats>({});
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [payables, setPayables] = useState<Payable[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [salesHistory, setSalesHistory] = useState<SaleHistory[]>([]);
  const [purchasesHistory, setPurchasesHistory] = useState<PurchaseHistory[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [editInvoiceForm, setEditInvoiceForm] = useState<{
    saleNumber: string;
    soldAt: string;
    customerId: string;
    employeeId: string;
    paymentMethod: PaymentMethod;
    creditTermDays: CreditTermDays;
    discount: string;
    tax: string;
    amountPaid: string;
    items: EditInvoiceItem[];
  }>({
    saleNumber: '',
    soldAt: '',
    customerId: '',
    employeeId: '',
    paymentMethod: 'CASH',
    creditTermDays: 'DAYS_30',
    discount: '0',
    tax: '0',
    amountPaid: '0',
    items: [{ productId: '', quantity: '1', unitPrice: '0' }]
  });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    companyName: 'Haytazentavo',
    ownerName: '',
    address: '',
    country: 'Nicaragua',
    phone: '',
    ruc: '',
    ownerPhone: '',
    defaultTaxRate: 15
  });
  const [lastSale, setLastSale] = useState<SaleCreated | null>(null);

  const [productForm, setProductForm] = useState({ sku: '', name: '', unit: 'box', reorderPoint: '10' });
  const [lotForm, setLotForm] = useState({ productId: '', batchNumber: '', quantity: '0', purchaseCost: '0', salePrice: '0' });
  const [customerForm, setCustomerForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', phone: '' });
  const [employeeForm, setEmployeeForm] = useState({ firstName: '', lastName: '', role: '', phone: '' });
  const [saleForm, setSaleForm] = useState({ customerId: '', employeeId: '', paymentMethod: 'CASH' as PaymentMethod, creditTermDays: 'DAYS_30' as CreditTermDays, amountPaid: '0', discount: '0', taxRate: '15' });
  const [saleItems, setSaleItems] = useState<Array<{ productId: string; quantity: string }>>([{ productId: '', quantity: '1' }]);
  const [saleCustomerQuery, setSaleCustomerQuery] = useState('');
  const [quoteForm, setQuoteForm] = useState({
    customerId: '',
    employeeId: '',
    paymentMethod: 'CASH' as PaymentMethod,
    creditTermDays: 'DAYS_30' as CreditTermDays,
    amountPaid: '0',
    discount: '0',
    taxRate: '15',
    quoteDate: new Date().toISOString().slice(0, 10)
  });
  const [quoteItems, setQuoteItems] = useState<Array<{ productId: string; quantity: string }>>([
    { productId: '', quantity: '1' }
  ]);
  const [quoteCustomerQuery, setQuoteCustomerQuery] = useState('');
  const [quoteCurrency, setQuoteCurrency] = useState<CurrencyCode>('NIO');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<InvoiceStatusFilter>('ALL');
  const [invoiceViewReturnSection, setInvoiceViewReturnSection] = useState<'open' | 'past'>('past');
  const [lastInvoiceItems, setLastInvoiceItems] = useState<Array<{ productName: string; quantity: number; unitPrice: number; lineTotal: number }>>([]);
  const [purchaseForm, setPurchaseForm] = useState({ supplierId: '', productId: '', batchNumber: '', quantity: '1', unitCost: '0', unitPrice: '0', employeeId: '', paymentMethod: 'CASH' as PaymentMethod, creditTermDays: 'DAYS_30' as CreditTermDays, amountPaid: '0' });
  const [expenseForm, setExpenseForm] = useState({ category: '', description: '', amount: '0', paymentMethod: 'CASH' as PaymentMethod });
  const [companyForm, setCompanyForm] = useState<CompanyProfile>({
    companyName: 'Haytazentavo',
    ownerName: '',
    address: '',
    country: 'Nicaragua',
    phone: '',
    ruc: '',
    ownerPhone: '',
    defaultTaxRate: 15
  });
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [viewQuoteId, setViewQuoteId] = useState('');
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate>({
    base: 'USD',
    quote: 'NIO',
    rate: 36.5,
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
    stale: true
  });

  const t = useMemo(() => text[lang], [lang]);

  useEffect(() => {
    const savedLang = (localStorage.getItem('farma_lang') as Lang | null) ?? 'en';
    const savedTheme = (localStorage.getItem('farma_theme') as Theme | null) ?? 'dark';
    setLang(savedLang);
    setTheme(savedTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-dark');
    document.documentElement.classList.add(theme === 'dark' ? 'theme-dark' : 'theme-light');
    localStorage.setItem('farma_lang', lang);
    localStorage.setItem('farma_theme', theme);
  }, [theme, lang]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('farma_quotes_v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as QuoteRecord[];
      if (Array.isArray(parsed)) {
        setQuotes(parsed);
      }
    } catch {
      // ignore invalid local storage values
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('farma_quotes_v1', JSON.stringify(quotes));
  }, [quotes]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!selectedInvoiceId && salesHistory.length > 0) {
      setSelectedInvoiceId(salesHistory[0].id);
    }
  }, [salesHistory, selectedInvoiceId]);

  useEffect(() => {
    if (!selectedQuoteId && quotes.length > 0) {
      setSelectedQuoteId(quotes[0].id);
    }
  }, [quotes, selectedQuoteId]);

  async function refresh() {
    setLoading(true);
    try {
      const [a, b, c, d, e, f, g, h, i, j, k, l, m] = await Promise.allSettled([
        apiGet<Stats>('stats/dashboard'),
        apiGet<CatalogProduct[]>('inventory/catalog'),
        apiGet<Customer[]>('masters/customers'),
        apiGet<Supplier[]>('masters/suppliers'),
        apiGet<Employee[]>('masters/employees'),
        apiGet<Receivable[]>('finance/receivables'),
        apiGet<Payable[]>('finance/payables'),
        apiGet<Expense[]>('finance/expenses'),
        apiGet<TopProduct[]>('stats/top-products'),
        apiGet<CompanyProfile>('company/profile'),
        apiGet<SaleHistory[]>('sales'),
        apiGet<ExchangeRate>('finance/exchange-rate'),
        apiGet<PurchaseHistory[]>('purchases')
      ]);

      if (a.status === 'fulfilled') setStats(a.value);
      if (b.status === 'fulfilled') setCatalog(b.value);
      if (c.status === 'fulfilled') setCustomers(c.value);
      if (d.status === 'fulfilled') setSuppliers(d.value);
      if (e.status === 'fulfilled') setEmployees(e.value);
      if (f.status === 'fulfilled') setReceivables(f.value);
      if (g.status === 'fulfilled') setPayables(g.value);
      if (h.status === 'fulfilled') setExpenses(h.value);
      if (i.status === 'fulfilled') setTopProducts(i.value);
      if (j.status === 'fulfilled') {
        setCompanyProfile(j.value);
        setCompanyForm(j.value);
        setSaleForm((prev) => ({ ...prev, taxRate: String(num(j.value.defaultTaxRate) || 0) }));
      }
      if (k.status === 'fulfilled') setSalesHistory(k.value);
      if (l.status === 'fulfilled') setExchangeRate(l.value);
      if (m.status === 'fulfilled') setPurchasesHistory(m.value);

      setNote(t.dataRefreshed);
    } catch (err) {
      setNote(`Refresh ${t.failed}: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function saveProduct() {
    try {
      await apiPost('inventory/products', { ...productForm, reorderPoint: n(productForm.reorderPoint) });
      setProductForm({ sku: '', name: '', unit: 'box', reorderPoint: '10' });
      await refresh();
      setNote(t.saveProduct);
    } catch (err) {
      setNote(`${t.saveProduct} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveLot() {
    try {
      await apiPost('inventory/lots/schedule', {
        ...lotForm,
        quantity: n(lotForm.quantity),
        purchaseCost: n(lotForm.purchaseCost),
        salePrice: n(lotForm.salePrice)
      });
      setLotForm({ productId: '', batchNumber: '', quantity: '0', purchaseCost: '0', salePrice: '0' });
      await refresh();
      setNote(t.saveLot);
    } catch (err) {
      setNote(`${t.saveLot} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveCustomer() {
    try {
      await apiPost('masters/customers', customerForm);
      setCustomerForm({ firstName: '', lastName: '', phone: '' });
      await refresh();
      setNote(t.saveCustomer);
    } catch (err) {
      setNote(`${t.saveCustomer} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveSupplier() {
    try {
      await apiPost('masters/suppliers', supplierForm);
      setSupplierForm({ name: '', contactName: '', phone: '' });
      await refresh();
      setNote(t.saveSupplier);
    } catch (err) {
      setNote(`${t.saveSupplier} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveEmployee() {
    try {
      await apiPost('masters/employees', employeeForm);
      setEmployeeForm({ firstName: '', lastName: '', role: '', phone: '' });
      await refresh();
      setNote(t.saveEmployee);
    } catch (err) {
      setNote(`${t.saveEmployee} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveSale() {
    if (saleForm.paymentMethod === 'CREDIT' && !saleForm.customerId) {
      setNote(t.invalidCreditSale);
      return;
    }

    const validItems = saleSummary.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity
    }));
    if (validItems.length === 0) {
      setNote(`${t.saveSale} ${t.failed}: ${t.itemLines}`);
      return;
    }

    try {
      const created = await apiPost<SaleCreated>('sales', {
        customerId: saleForm.customerId || undefined,
        employeeId: saleForm.employeeId || undefined,
        paymentMethod: saleForm.paymentMethod,
        creditTermDays: saleForm.paymentMethod === 'CREDIT' ? saleForm.creditTermDays : undefined,
        amountPaid: toNio(n(saleForm.amountPaid), saleCurrency),
        discount: saleDiscountNio,
        tax: saleTaxNio,
        items: validItems
      });
      setLastSale(created);
      setSelectedInvoiceId(created.id);
      setLastInvoiceItems(saleSummary.items.map((i) => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })));
      setSaleForm({ customerId: '', employeeId: '', paymentMethod: 'CASH', creditTermDays: 'DAYS_30', amountPaid: '0', discount: '0', taxRate: String(num(companyProfile.defaultTaxRate) || 0) });
      setSaleCurrency('NIO');
      setSaleItems([{ productId: '', quantity: '1' }]);
      setSaleCustomerQuery('');
      await refresh();
      setInvoiceViewReturnSection('open');
      setInvoiceSection('detail');
      setNote(t.saveSale);
    } catch (err) {
      setNote(`${t.saveSale} ${t.failed}: ${String(err)}`);
    }
  }

  async function savePurchase() {
    if (purchaseForm.paymentMethod === 'CREDIT' && !purchaseForm.supplierId) {
      setNote(t.invalidCreditPurchase);
      return;
    }

    try {
      await apiPost('purchases', {
        supplierId: purchaseForm.supplierId,
        employeeId: purchaseForm.employeeId || undefined,
        paymentMethod: purchaseForm.paymentMethod,
        creditTermDays: purchaseForm.paymentMethod === 'CREDIT' ? purchaseForm.creditTermDays : undefined,
        amountPaid: n(purchaseForm.amountPaid),
        items: [
          {
            productId: purchaseForm.productId,
            batchNumber: purchaseForm.batchNumber,
            quantity: n(purchaseForm.quantity),
            unitCost: n(purchaseForm.unitCost),
            unitPrice: n(purchaseForm.unitPrice)
          }
        ]
      });
      setPurchaseForm({ supplierId: '', productId: '', batchNumber: '', quantity: '1', unitCost: '0', unitPrice: '0', employeeId: '', paymentMethod: 'CASH', creditTermDays: 'DAYS_30', amountPaid: '0' });
      await refresh();
      setNote(t.savePurchase);
    } catch (err) {
      setNote(`${t.savePurchase} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveExpense() {
    try {
      await apiPost('finance/expenses', {
        category: expenseForm.category,
        description: expenseForm.description,
        amount: n(expenseForm.amount),
        paymentMethod: expenseForm.paymentMethod
      });
      setExpenseForm({ category: '', description: '', amount: '0', paymentMethod: 'CASH' });
      await refresh();
      setNote(t.saveExpense);
    } catch (err) {
      setNote(`${t.saveExpense} ${t.failed}: ${String(err)}`);
    }
  }

  async function saveCompanyConfig() {
    try {
      const payload = {
        ...companyForm,
        defaultTaxRate: num(companyForm.defaultTaxRate)
      } as Record<string, unknown>;
      const saved = await apiPost<CompanyProfile>('company/profile', payload);
      setCompanyProfile(saved);
      setCompanyForm(saved);
      setSaleForm((prev) => ({ ...prev, taxRate: String(num(saved.defaultTaxRate) || 0) }));
      setNote(t.saveCompanyConfig);
    } catch (err) {
      setNote(`${t.saveCompanyConfig} ${t.failed}: ${String(err)}`);
    }
  }

  const reportRows = useMemo(
    () =>
      topProducts.map((r) => ({
        productId: r.productId,
        quantity: money(r._sum?.quantity),
        total: money(r._sum?.lineTotal)
      })),
    [topProducts]
  );

  const filteredReceivables = useMemo(
    () => receivables.filter((r) => (r.dueDate ?? '').startsWith(reportPeriod)),
    [receivables, reportPeriod]
  );
  const filteredPayables = useMemo(
    () => payables.filter((p) => (p.dueDate ?? '').startsWith(reportPeriod)),
    [payables, reportPeriod]
  );
  const filteredExpenses = useMemo(
    () => expenses.filter((e) => (e.expenseDate ?? '').startsWith(reportPeriod)),
    [expenses, reportPeriod]
  );
  const isOpenDocument = (status?: string) =>
    ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'].includes((status ?? '').toUpperCase());
  const lowStockAlerts = useMemo(
    () =>
      catalog
        .map((product) => ({
          id: product.id,
          sku: product.sku,
          name: product.name,
          stock: num(product.currentStock),
          reorderPoint: num(product.reorderPoint)
        }))
        .filter((row) => row.stock <= row.reorderPoint)
        .sort((a, b) => a.stock - b.stock),
    [catalog]
  );
  const lotExpiryAlerts = useMemo(() => {
    return catalog
      .flatMap((product) =>
        (product.lots ?? []).map((lot) => ({
          productName: product.name,
          sku: product.sku,
          batchNumber: lot.batchNumber ?? '-',
          expirationDate: lot.expirationDate ?? undefined,
          remainingQty: num(lot.remainingQty),
          daysLeft: daysDiffFromToday(lot.expirationDate ?? undefined)
        }))
      )
      .filter(
        (row) =>
          !!row.expirationDate &&
          row.remainingQty > 0 &&
          row.daysLeft <= 60
      )
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [catalog]);
  const receivableAging = useMemo(() => {
    const buckets = { current: 0, days1to30: 0, days31to60: 0, days61plus: 0 };
    receivables.forEach((row) => {
      if (!isOpenDocument(row.status) || num(row.balance) <= 0) return;
      const daysUntilDue = daysDiffFromToday(row.dueDate);
      if (daysUntilDue >= 0) buckets.current += num(row.balance);
      else if (daysUntilDue >= -30) buckets.days1to30 += num(row.balance);
      else if (daysUntilDue >= -60) buckets.days31to60 += num(row.balance);
      else buckets.days61plus += num(row.balance);
    });
    return buckets;
  }, [receivables]);
  const payableAging = useMemo(() => {
    const buckets = { current: 0, days1to30: 0, days31to60: 0, days61plus: 0 };
    payables.forEach((row) => {
      if (!isOpenDocument(row.status) || num(row.balance) <= 0) return;
      const daysUntilDue = daysDiffFromToday(row.dueDate);
      if (daysUntilDue >= 0) buckets.current += num(row.balance);
      else if (daysUntilDue >= -30) buckets.days1to30 += num(row.balance);
      else if (daysUntilDue >= -60) buckets.days31to60 += num(row.balance);
      else buckets.days61plus += num(row.balance);
    });
    return buckets;
  }, [payables]);
  const topCustomersReport = useMemo(() => {
    const byCustomer = new Map<
      string,
      { customer: string; total: number; invoices: number; balance: number }
    >();
    salesHistory.forEach((sale) => {
      if ((sale.status ?? '').toUpperCase() === 'VOID') return;
      const customer = `${sale.customer?.firstName ?? '-'} ${sale.customer?.lastName ?? ''}`.trim();
      const key = `${sale.customer?.id ?? 'na'}-${customer}`;
      const prev = byCustomer.get(key) ?? {
        customer,
        total: 0,
        invoices: 0,
        balance: 0
      };
      prev.total += num(sale.total);
      prev.invoices += 1;
      prev.balance += num(sale.balanceDue);
      byCustomer.set(key, prev);
    });
    return [...byCustomer.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [salesHistory]);
  const topSuppliersReport = useMemo(() => {
    const bySupplier = new Map<
      string,
      { supplier: string; total: number; receipts: number; balance: number }
    >();
    purchasesHistory.forEach((purchase) => {
      if ((purchase.status ?? '').toUpperCase() === 'VOID') return;
      const supplier = purchase.supplier?.name ?? '-';
      const key = `${purchase.supplier?.id ?? 'na'}-${supplier}`;
      const prev = bySupplier.get(key) ?? {
        supplier,
        total: 0,
        receipts: 0,
        balance: 0
      };
      prev.total += num(purchase.total);
      prev.receipts += 1;
      prev.balance += num(purchase.balanceDue);
      bySupplier.set(key, prev);
    });
    return [...bySupplier.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [purchasesHistory]);
  const employeePerformanceRows = useMemo(() => {
    const byEmployee = new Map<
      string,
      { employee: string; sales: number; invoices: number; collected: number }
    >();
    salesHistory.forEach((sale) => {
      if ((sale.status ?? '').toUpperCase() === 'VOID') return;
      const employee = `${sale.employee?.firstName ?? '-'} ${sale.employee?.lastName ?? ''}`.trim();
      const key = `${sale.employee?.id ?? 'na'}-${employee}`;
      const prev = byEmployee.get(key) ?? {
        employee,
        sales: 0,
        invoices: 0,
        collected: 0
      };
      prev.sales += num(sale.total);
      prev.invoices += 1;
      prev.collected += num(sale.amountPaid);
      byEmployee.set(key, prev);
    });
    return [...byEmployee.values()].sort((a, b) => b.sales - a.sales).slice(0, 6);
  }, [salesHistory]);
  const activityTimeline = useMemo(() => {
    const salesEvents = salesHistory.map((sale) => ({
      id: `sale-${sale.id}`,
      type: t.activitySale,
      ref: humanInvoiceNumber(sale),
      title: `${sale.customer?.firstName ?? '-'} ${sale.customer?.lastName ?? ''}`.trim(),
      date: sale.soldAt ?? '',
      amount: num(sale.total)
    }));
    const purchaseEvents = purchasesHistory.map((purchase) => ({
      id: `purchase-${purchase.id}`,
      type: t.activityPurchase,
      ref: purchase.purchaseNumber ?? purchase.id,
      title: purchase.supplier?.name ?? '-',
      date: purchase.purchasedAt ?? '',
      amount: num(purchase.total)
    }));
    const expenseEvents = expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: t.activityExpense,
      ref: expense.category,
      title: expense.description || expense.category,
      date: expense.expenseDate ?? '',
      amount: num(expense.amount)
    }));
    return [...salesEvents, ...purchaseEvents, ...expenseEvents]
      .sort(
        (a, b) =>
          new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
      )
      .slice(0, 14);
  }, [salesHistory, purchasesHistory, expenses, t.activityExpense, t.activityPurchase, t.activitySale]);
  const periodSales = salesHistory.filter((row) =>
    (row.soldAt ?? '').startsWith(reportPeriod)
  );
  const periodPurchases = purchasesHistory.filter((row) =>
    (row.purchasedAt ?? '').startsWith(reportPeriod)
  );
  const periodSalesTotal = periodSales.reduce((sum, row) => sum + num(row.total), 0);
  const periodPurchasesTotal = periodPurchases.reduce(
    (sum, row) => sum + num(row.total),
    0
  );
  const periodExpensesTotal = filteredExpenses.reduce(
    (sum, row) => sum + num(row.amount),
    0
  );
  const periodNetFlow = periodSalesTotal - periodPurchasesTotal - periodExpensesTotal;
  const inventoryValue = catalog.reduce(
    (sum, row) => sum + num(row.currentStock) * num(row.currentCost),
    0
  );
  const openInvoicesCount = salesHistory.filter((sale) =>
    isOpenDocument(sale.status)
  ).length;
  const dueSoonInvoicesCount = salesHistory.filter((sale) => {
    if (!isOpenDocument(sale.status) || !sale.dueDate) return false;
    const daysLeft = daysDiffFromToday(sale.dueDate);
    return daysLeft >= 0 && daysLeft <= 7;
  }).length;
  const overdueInvoicesCount = salesHistory.filter((sale) => {
    if (!isOpenDocument(sale.status) || !sale.dueDate) return false;
    return daysDiffFromToday(sale.dueDate) < 0;
  }).length;

  function exportReportsCsv() {
    const rows: Array<[string, string, string, string, string]> = [];

    rows.push(['OVERVIEW', t.salesAmount, '', money(periodSalesTotal), reportPeriod]);
    rows.push(['OVERVIEW', t.purchasesAmount, '', money(periodPurchasesTotal), reportPeriod]);
    rows.push(['OVERVIEW', t.expenses, '', money(periodExpensesTotal), reportPeriod]);
    rows.push(['OVERVIEW', t.netFlow, '', money(periodNetFlow), reportPeriod]);
    rows.push(['OVERVIEW', t.overdue, '', String(overdueInvoicesCount), t.invoices]);
    rows.push(['OVERVIEW', t.dueSoon, '', String(dueSoonInvoicesCount), t.invoices]);

    reportRows.forEach((r) => rows.push(['TOP_PRODUCTS', r.productId, r.quantity, r.total, '']));
    lowStockAlerts.forEach((r) =>
      rows.push([
        'LOW_STOCK',
        `${r.name} (${r.sku})`,
        String(r.stock),
        String(r.reorderPoint),
        ''
      ])
    );
    lotExpiryAlerts.forEach((r) =>
      rows.push([
        'LOT_EXPIRY',
        `${r.productName} (${r.sku})`,
        r.batchNumber,
        String(r.remainingQty),
        r.expirationDate ?? '-'
      ])
    );
    topCustomersReport.forEach((row) =>
      rows.push([
        'TOP_CUSTOMERS',
        row.customer,
        String(row.invoices),
        money(row.total),
        money(row.balance)
      ])
    );
    topSuppliersReport.forEach((row) =>
      rows.push([
        'TOP_SUPPLIERS',
        row.supplier,
        String(row.receipts),
        money(row.total),
        money(row.balance)
      ])
    );
    employeePerformanceRows.forEach((row) =>
      rows.push([
        'EMPLOYEE_PERFORMANCE',
        row.employee,
        String(row.invoices),
        money(row.sales),
        money(row.collected)
      ])
    );
    filteredReceivables.forEach((r) =>
      rows.push([
        'RECEIVABLES',
        `${r.customer?.firstName ?? '-'} ${r.customer?.lastName ?? ''}`.trim(),
        '',
        money(r.balance),
        dateShort(r.dueDate)
      ])
    );
    filteredPayables.forEach((p) =>
      rows.push(['PAYABLES', p.supplier?.name ?? '-', '', money(p.balance), dateShort(p.dueDate)])
    );
    filteredExpenses.forEach((e) =>
      rows.push(['EXPENSES', e.category, '', money(e.amount), e.paymentMethod ?? '-'])
    );

    const header = ['section', 'item', 'metric_a', 'metric_b', 'metric_c'];
    const content = [header, ...rows]
      .map((line) => line.map((value) => csvCell(value)).join(','))
      .join('\n');

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farma_reports_${reportPeriod}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportReportsExcel() {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        {
          period: reportPeriod,
          sales: periodSalesTotal,
          purchases: periodPurchasesTotal,
          expenses: periodExpensesTotal,
          netFlow: periodNetFlow,
          inventoryValue,
          openInvoices: openInvoicesCount,
          dueSoonInvoices: dueSoonInvoicesCount,
          overdueInvoices: overdueInvoicesCount
        }
      ]),
      'Overview'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        lowStockAlerts.map((row) => ({
          sku: row.sku,
          name: row.name,
          stock: row.stock,
          reorderPoint: row.reorderPoint
        }))
      ),
      'LowStock'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        lotExpiryAlerts.map((row) => ({
          sku: row.sku,
          product: row.productName,
          batch: row.batchNumber,
          expirationDate: row.expirationDate ? dateShort(row.expirationDate) : '-',
          daysLeft: row.daysLeft,
          remainingQty: row.remainingQty
        }))
      ),
      'LotExpiry'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        topCustomersReport.map((row) => ({
          customer: row.customer,
          invoices: row.invoices,
          totalSales: row.total,
          balanceDue: row.balance
        }))
      ),
      'TopCustomers'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        topSuppliersReport.map((row) => ({
          supplier: row.supplier,
          receipts: row.receipts,
          totalPurchases: row.total,
          balanceDue: row.balance
        }))
      ),
      'TopSuppliers'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        employeePerformanceRows.map((row) => ({
          employee: row.employee,
          invoices: row.invoices,
          sales: row.sales,
          collected: row.collected
        }))
      ),
      'EmployeePerf'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        reportRows.map((r) => ({
          productId: r.productId,
          quantity: num(r.quantity),
          total: num(r.total)
        }))
      ),
      'TopProducts'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        filteredReceivables.map((r) => ({
          customer: `${r.customer?.firstName ?? '-'} ${r.customer?.lastName ?? ''}`.trim(),
          balance: num(r.balance),
          dueDate: dateShort(r.dueDate),
          status: r.status ?? '-'
        }))
      ),
      'Receivables'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        filteredPayables.map((p) => ({
          supplier: p.supplier?.name ?? '-',
          balance: num(p.balance),
          dueDate: dateShort(p.dueDate),
          status: p.status ?? '-'
        }))
      ),
      'Payables'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        filteredExpenses.map((e) => ({
          category: e.category,
          description: e.description ?? '-',
          amount: num(e.amount),
          paymentMethod: e.paymentMethod ?? '-',
          expenseDate: dateShort(e.expenseDate)
        }))
      ),
      'Expenses'
    );

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        catalog.map((c) => ({
          sku: c.sku,
          name: c.name,
          stock: num(c.currentStock),
          price: num(c.currentSalePrice),
          batch: c.activeLot?.batchNumber ?? '-'
        }))
      ),
      'Catalog'
    );

    XLSX.writeFile(workbook, `farma_reports_${reportPeriod}.xlsx`);
  }

  function printInvoice() {
    const activeInvoice = previewInvoice;
    if (!activeInvoice) return;
    window.print();
  }

  function downloadInvoicePdf() {
    const activeInvoice = previewInvoice;
    const activeItems = previewInvoiceItems;
    if (!activeInvoice) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const invoiceNoRaw = rawInvoiceNumber(activeInvoice);
    const invoiceNo = humanInvoiceNumber(activeInvoice);
    const soldDate = dateShort(activeInvoice.soldAt);
    const subtotal = num(activeInvoice.subtotal);
    const discount = num(activeInvoice.discount);
    const tax = num(activeInvoice.tax);
    const total = num(activeInvoice.total);
    const amountPaid = num(activeInvoice.amountPaid);
    const balance = num(activeInvoice.balanceDue);

    const fMoney = (value: number) =>
      value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const w = doc.internal.pageSize.getWidth();
    const left = 46;
    const right = w - 46;
    const colSplit = 345;
    const titleY = 62;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text((companyProfile.companyName || 'Haytazentavo').toUpperCase(), left, titleY);
    doc.setFontSize(17);
    doc.text('INVOICE', right, titleY, { align: 'right' });

    doc.setDrawColor(170);
    doc.line(left, 78, right, 78);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    let y = 102;
    const leftLines = [
      companyProfile.address || '-',
      companyProfile.country || '-',
      `Tel: ${companyProfile.phone || '-'}`,
      `RUC: ${companyProfile.ruc || '-'}`,
      `Propietario: ${companyProfile.ownerName || '-'}`,
      `Tel: ${companyProfile.ownerPhone || '-'}`
    ];
    leftLines.forEach((line) => {
      doc.text(line, left, y);
      y += 17;
    });

    const label = (k: string, v: string, yy: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(k, colSplit, yy);
      doc.setFont('helvetica', 'normal');
      doc.text(v, colSplit + 90, yy);
    };
    label('No:', invoiceNo, 102);
    label('Date:', soldDate, 127);
    label('Payment Method:', activeInvoice.paymentMethod || '-', 152);

    doc.line(left, 198, right, 198);

    autoTable(doc, {
      startY: 214,
      head: [['Producto', 'Cant.', 'Precio Unit.', 'Total']],
      body: activeItems.map((item) => [
        item.productName,
        String(item.quantity),
        `$${fMoney(item.unitPrice)}`,
        `$${fMoney(item.lineTotal)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: 20, lineColor: 190, lineWidth: 0.7 },
      bodyStyles: { lineColor: 190, lineWidth: 0.7, textColor: 20 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 250 },
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 110 },
        3: { halign: 'right', cellWidth: 90 }
      },
      margin: { left, right },
      styles: { fontSize: 10, cellPadding: 6, font: 'helvetica' }
    });

    const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 340;
    const boxLeft = right - 260;
    let by = tableEnd + 18;

    const row = (k: string, v: string, bold = false) => {
      if (bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(k, boxLeft + 8, by);
      doc.text(v, right - 18, by, { align: 'right' });
      by += 24;
    };

    doc.setDrawColor(170);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('Subtotal:', `$${fMoney(subtotal)}`, true);
    row('Descuento:', `$${fMoney(discount)}`);
    row('Impuesto:', `$${fMoney(tax)}`);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('TOTAL:', `$${fMoney(total)}`, true);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('Monto Pagado:', `$${fMoney(amountPaid)}`);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('Balance:', `$${fMoney(balance)}`, true);

    if (isPaidStatus((activeInvoice as { status?: string }).status)) {
      doc.setTextColor(72, 176, 145);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(56);
      doc.text(t.paidStamp, w / 2, 470, { align: 'center', angle: -28 });
      doc.setTextColor(20, 20, 20);
    }

    doc.save(`invoice_${invoiceNoRaw}.pdf`);
  }

  function downloadQuotePdf(quoteInput?: QuoteRecord | null) {
    const quote = quoteInput ?? selectedQuote;
    if (!quote) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const soldDate = dateShort(quote.quoteDate || quote.createdAt);

    const fMoney = (value: number) =>
      value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const w = doc.internal.pageSize.getWidth();
    const left = 46;
    const right = w - 46;
    const colSplit = 345;
    const titleY = 62;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text((companyProfile.companyName || 'Haytazentavo').toUpperCase(), left, titleY);
    doc.setFontSize(17);
    doc.text('QUOTE', right, titleY, { align: 'right' });

    doc.setDrawColor(170);
    doc.line(left, 78, right, 78);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    let y = 102;
    const leftLines = [
      companyProfile.address || '-',
      companyProfile.country || '-',
      `Tel: ${companyProfile.phone || '-'}`,
      `RUC: ${companyProfile.ruc || '-'}`,
      `Owner: ${companyProfile.ownerName || '-'}`,
      `Tel: ${companyProfile.ownerPhone || '-'}`
    ];
    leftLines.forEach((line) => {
      doc.text(line, left, y);
      y += 17;
    });

    const label = (k: string, v: string, yy: number) => {
      doc.setFont('helvetica', 'bold');
      doc.text(k, colSplit, yy);
      doc.setFont('helvetica', 'normal');
      doc.text(v, colSplit + 90, yy);
    };
    label('No:', quote.quoteNumber, 102);
    label('Date:', soldDate, 127);
    label('Customer:', quote.customer || '-', 152);
    label('Payment Method:', paymentMethodLabel(quote.paymentMethod), 177);

    doc.line(left, 216, right, 216);

    autoTable(doc, {
      startY: 232,
      head: [['Producto', 'Cant.', 'Precio Unit.', 'Total']],
      body: quote.items.map((item) => [
        item.productName,
        String(item.quantity),
        `${quote.currency === 'USD' ? '$' : 'C$'}${fMoney(item.unitPrice)}`,
        `${quote.currency === 'USD' ? '$' : 'C$'}${fMoney(item.lineTotal)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [245, 245, 245], textColor: 20, lineColor: 190, lineWidth: 0.7 },
      bodyStyles: { lineColor: 190, lineWidth: 0.7, textColor: 20 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 250 },
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 110 },
        3: { halign: 'right', cellWidth: 90 }
      },
      margin: { left, right },
      styles: { fontSize: 10, cellPadding: 6, font: 'helvetica' }
    });

    const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 340;
    const boxLeft = right - 260;
    let by = tableEnd + 18;
    const symbol = quote.currency === 'USD' ? '$' : 'C$';

    const row = (k: string, v: string, bold = false) => {
      if (bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(k, boxLeft + 8, by);
      doc.text(v, right - 18, by, { align: 'right' });
      by += 24;
    };

    doc.setDrawColor(170);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('Subtotal:', `${symbol}${fMoney(quote.subtotal)}`, true);
    row('Discount:', `${symbol}${fMoney(quote.discount)}`);
    row('Tax:', `${symbol}${fMoney(quote.tax)}`);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('TOTAL:', `${symbol}${fMoney(quote.total)}`, true);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('Amount Paid:', `${symbol}${fMoney(quote.amountPaid)}`);
    doc.line(boxLeft, by - 18, right - 8, by - 18);
    row('Balance:', `${symbol}${fMoney(quote.balanceDue)}`, true);

    doc.save(`quote_${quote.quoteNumber}.pdf`);
  }

  async function saveEditedInvoice(invoiceId: string) {
    const payload = {
      saleNumber: editInvoiceForm.saleNumber || undefined,
      soldAt: editInvoiceForm.soldAt || undefined,
      customerId: editInvoiceForm.customerId || undefined,
      employeeId: editInvoiceForm.employeeId || undefined,
      paymentMethod: editInvoiceForm.paymentMethod,
      creditTermDays:
        editInvoiceForm.paymentMethod === 'CREDIT'
          ? editInvoiceForm.creditTermDays
          : undefined,
      discount: toNio(n(editInvoiceForm.discount), editCurrency),
      tax: toNio(n(editInvoiceForm.tax), editCurrency),
      amountPaid: toNio(n(editInvoiceForm.amountPaid), editCurrency),
      items: editInvoiceForm.items
        .filter((item) => item.productId && n(item.quantity) > 0)
        .map((item) => ({
          id: item.id,
          productId: item.productId,
          quantity: n(item.quantity),
          unitPrice: toNio(n(item.unitPrice), editCurrency)
        }))
    };

    if (payload.items.length === 0) {
      setNote(`${t.edit} ${t.failed}: ${t.itemLines}`);
      return;
    }

    try {
      await apiPatch(`sales/${invoiceId}`, payload);
      await refresh();
      setSelectedInvoiceId(invoiceId);
      setInvoiceSection('detail');
      setNote(`${t.edit} ${t.invoiceNo}`);
    } catch (err) {
      setNote(`${t.edit} ${t.failed}: ${String(err)}`);
    }
  }

  async function deleteInvoice(sale: SaleHistory) {
    const ok = window.confirm(`${t.delete} ${humanInvoiceNumber(sale)}?`);
    if (!ok) return;
    try {
      await apiDelete(`sales/${sale.id}`);
      await refresh();
      setNote(`${t.delete} ${t.invoiceNo}`);
    } catch (err) {
      setNote(`${t.delete} ${t.failed}: ${String(err)}`);
    }
  }

  function deleteQuote(quoteId: string) {
    const quote = quotes.find((item) => item.id === quoteId);
    const ok = window.confirm(`${t.delete} ${quote?.quoteNumber ?? quoteId}?`);
    if (!ok) return;
    setQuotes((prev) => prev.filter((item) => item.id !== quoteId));
    setSelectedQuoteId((prev) => (prev === quoteId ? '' : prev));
    setViewQuoteId((prev) => (prev === quoteId ? '' : prev));
    setNote(`${t.delete} ${t.quoteNo}`);
  }

  function openQuoteView(quoteId: string) {
    setSelectedQuoteId(quoteId);
    setViewQuoteId(quoteId);
  }

  const menu: Array<{ key: MenuKey; label: string }> = [
    { key: 'dashboard', label: t.dashboard },
    { key: 'inventory', label: t.inventory },
    { key: 'invoices', label: t.invoices },
    { key: 'customers', label: t.customers },
    { key: 'suppliers', label: t.suppliers },
    { key: 'receivables', label: t.receivables },
    { key: 'payables', label: t.payables },
    { key: 'expenses', label: t.expenses },
    { key: 'reports', label: t.reports }
  ];

  const filteredProducts = catalog.filter((p) => `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()));
  const normalizedSaleCustomerQuery = saleCustomerQuery.trim().toLowerCase();
  const filteredSaleCustomers = normalizedSaleCustomerQuery
    ? customers
        .filter((customer) => {
          const displayName = fullCustomerName(customer).toLowerCase();
          const phone = customer.phone?.toLowerCase() || '';
          return displayName.includes(normalizedSaleCustomerQuery) || phone.includes(normalizedSaleCustomerQuery);
        })
        .slice(0, 8)
    : customers.slice(0, 8);
  const normalizedQuoteCustomerQuery = quoteCustomerQuery.trim().toLowerCase();
  const filteredQuoteCustomers = normalizedQuoteCustomerQuery
    ? customers
        .filter((customer) => {
          const displayName = fullCustomerName(customer).toLowerCase();
          const phone = customer.phone?.toLowerCase() || '';
          return displayName.includes(normalizedQuoteCustomerQuery) || phone.includes(normalizedQuoteCustomerQuery);
        })
        .slice(0, 8)
    : customers.slice(0, 8);
  const saleCustomerOptions = customers.map((customer) => ({
    value: customer.id,
    label: fullCustomerName(customer)
  }));
  const findSaleCustomerMatch = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return null;

    const exactMatch = customers.find((customer) => {
      const fullName = fullCustomerName(customer).toLowerCase();
      return (
        fullName === normalizedQuery ||
        customer.firstName.toLowerCase() === normalizedQuery ||
        customer.lastName.toLowerCase() === normalizedQuery
      );
    });
    if (exactMatch) return exactMatch;

    const partialMatches = customers.filter((customer) => {
      const fullName = fullCustomerName(customer).toLowerCase();
      const phone = customer.phone?.toLowerCase() || '';
      return fullName.includes(normalizedQuery) || phone.includes(normalizedQuery);
    });

    return partialMatches.length === 1 ? partialMatches[0] : null;
  };
  const onSaleCustomerQueryChange = (query: string) => {
    setSaleCustomerQuery(query);
    const matchedCustomer = findSaleCustomerMatch(query);
    setSaleForm((prev) => ({
      ...prev,
      customerId: matchedCustomer ? matchedCustomer.id : ''
    }));
  };
  const selectSaleCustomer = (customerId: string) => {
    const selected = customers.find((customer) => customer.id === customerId);
    setSaleForm((prev) => ({ ...prev, customerId }));
    setSaleCustomerQuery(selected ? fullCustomerName(selected) : '');
  };
  const findQuoteCustomerMatch = (query: string) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return null;

    const exactMatch = customers.find((customer) => {
      const fullName = fullCustomerName(customer).toLowerCase();
      return (
        fullName === normalizedQuery ||
        customer.firstName.toLowerCase() === normalizedQuery ||
        customer.lastName.toLowerCase() === normalizedQuery
      );
    });
    if (exactMatch) return exactMatch;

    const partialMatches = customers.filter((customer) => {
      const fullName = fullCustomerName(customer).toLowerCase();
      const phone = customer.phone?.toLowerCase() || '';
      return fullName.includes(normalizedQuery) || phone.includes(normalizedQuery);
    });

    return partialMatches.length === 1 ? partialMatches[0] : null;
  };
  const onQuoteCustomerQueryChange = (query: string) => {
    setQuoteCustomerQuery(query);
    const matchedCustomer = findQuoteCustomerMatch(query);
    setQuoteForm((prev) => ({
      ...prev,
      customerId: matchedCustomer ? matchedCustomer.id : ''
    }));
  };
  const selectQuoteCustomer = (customerId: string) => {
    const selected = customers.find((customer) => customer.id === customerId);
    setQuoteForm((prev) => ({ ...prev, customerId }));
    setQuoteCustomerQuery(selected ? fullCustomerName(selected) : '');
  };
  const saleSummary = saleItems.reduce(
    (acc, row) => {
      const product = catalog.find((p) => p.id === row.productId);
      const qty = n(row.quantity);
      const price = num(product?.currentSalePrice);
      const lineTotal = qty * price;
      acc.subtotal += lineTotal;
      if (product && qty > 0) {
        acc.items.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: price,
          lineTotal
        });
      }
      return acc;
    },
    { subtotal: 0, items: [] as Array<{ productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }> }
  );
  const quoteSummary = quoteItems.reduce(
    (acc, row) => {
      const product = catalog.find((p) => p.id === row.productId);
      const qty = n(row.quantity);
      const price = num(product?.currentSalePrice);
      const lineTotal = qty * price;
      acc.subtotal += lineTotal;
      if (product && qty > 0) {
        acc.items.push({
          productId: product.id,
          productName: product.name,
          quantity: qty,
          unitPrice: price,
          lineTotal
        });
      }
      return acc;
    },
    { subtotal: 0, items: [] as Array<{ productId: string; productName: string; quantity: number; unitPrice: number; lineTotal: number }> }
  );
  const nioPerUsd = num(exchangeRate.rate) > 0 ? num(exchangeRate.rate) : 36.5;
  const fromNio = (value: number, currency: CurrencyCode) =>
    currency === 'USD' ? value / nioPerUsd : value;
  const toNio = (value: number, currency: CurrencyCode) =>
    currency === 'USD' ? value * nioPerUsd : value;
  const currencySymbol = (currency: CurrencyCode) => (currency === 'USD' ? '$' : 'C$');
  const saleDiscountNio = Math.max(0, toNio(n(saleForm.discount), saleCurrency));
  const saleTaxNio = Math.max(0, saleSummary.subtotal * (n(saleForm.taxRate) / 100));
  const saleTotalNio = Math.max(0, saleSummary.subtotal - saleDiscountNio + saleTaxNio);
  const saleSubtotalDisplay = fromNio(saleSummary.subtotal, saleCurrency);
  const saleTaxDisplay = fromNio(saleTaxNio, saleCurrency);
  const saleTotalDisplay = fromNio(saleTotalNio, saleCurrency);
  const saleAmountPaidDisplay = Math.max(0, n(saleForm.amountPaid));
  const saleBalanceDisplay = Math.max(0, saleTotalDisplay - saleAmountPaidDisplay);
  const currentSaleStatus =
    saleBalanceDisplay <= 0
      ? 'PAID'
      : saleAmountPaidDisplay > 0
        ? 'PARTIALLY_PAID'
        : 'OPEN';
  const quoteDiscountNio = Math.max(0, toNio(n(quoteForm.discount), quoteCurrency));
  const quoteTaxNio = Math.max(0, quoteSummary.subtotal * (n(quoteForm.taxRate) / 100));
  const quoteTotalNio = Math.max(0, quoteSummary.subtotal - quoteDiscountNio + quoteTaxNio);
  const quoteSubtotalDisplay = fromNio(quoteSummary.subtotal, quoteCurrency);
  const quoteTaxDisplay = fromNio(quoteTaxNio, quoteCurrency);
  const quoteTotalDisplay = fromNio(quoteTotalNio, quoteCurrency);
  const quoteAmountPaidDisplay = Math.max(0, n(quoteForm.amountPaid));
  const quoteBalanceDisplay = Math.max(0, quoteTotalDisplay - quoteAmountPaidDisplay);
  const selectedSaleInvoice = salesHistory.find((s) => s.id === selectedInvoiceId) ?? null;
  const previewInvoice = selectedSaleInvoice ?? lastSale;
  const previewInvoiceItems = selectedSaleInvoice
    ? (selectedSaleInvoice.items ?? []).map((item) => ({
        productName: item.product?.name || '-',
        quantity: num(item.quantity),
        unitPrice: num(item.unitPrice),
        lineTotal: num(item.lineTotal)
      }))
    : lastInvoiceItems;
  const filteredHistory = salesHistory.filter((sale) => {
    const customerName = `${sale.customer?.firstName ?? ''} ${sale.customer?.lastName ?? ''}`.trim();
    const haystack = `${rawInvoiceNumber(sale)} ${humanInvoiceNumber(sale)} ${customerName}`.toLowerCase();
    return haystack.includes(invoiceSearch.toLowerCase());
  });
  const openInvoices = filteredHistory.filter((sale) => isOpenDocument(sale.status));
  const pastInvoices = filteredHistory.filter((sale) => !isOpenDocument(sale.status));
  const statusClass = (status?: string) => {
    const value = (status ?? '').toUpperCase();
    if (value === 'PAID') return 'farma-status-paid';
    if (value === 'PARTIALLY_PAID') return 'farma-status-partial';
    if (value === 'OPEN') return 'farma-status-open';
    if (value === 'OVERDUE') return 'farma-status-overdue';
    return 'farma-status-default';
  };
  const statusLabel = (status?: string) => {
    const value = (status ?? '').toUpperCase();
    return value ? value.replaceAll('_', ' ') : '-';
  };
  const paymentMethodLabel = (method?: string) => {
    const value = (method ?? '').toUpperCase();
    if (value === 'CREDIT') return t.credit;
    if (value === 'CASH') return t.cash;
    return '-';
  };
  const isPaidStatus = (status?: string) => (status ?? '').toUpperCase() === 'PAID';
  const boardSourceInvoices = invoiceSection === 'open' ? openInvoices : pastInvoices;
  const boardInvoices =
    invoiceStatusFilter === 'ALL'
      ? boardSourceInvoices
      : boardSourceInvoices.filter((sale) => (sale.status ?? '').toUpperCase() === invoiceStatusFilter);
  const boardPreviewInvoice = boardInvoices.find((sale) => sale.id === selectedInvoiceId) ?? boardInvoices[0] ?? null;
  const boardPreviewItems = (boardPreviewInvoice?.items ?? []).map((item) => ({
    productName: item.product?.name || '-',
    quantity: num(item.quantity),
    lineTotal: num(item.lineTotal)
  }));
  const quoteTotal = quoteTotalDisplay;
  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId) ?? quotes[0] ?? null;
  const viewQuote = quotes.find((quote) => quote.id === viewQuoteId) ?? null;
  const editSubtotal = editInvoiceForm.items.reduce(
    (sum, item) => sum + n(item.quantity) * n(item.unitPrice),
    0
  );
  const editTotal = Math.max(
    0,
    editSubtotal - n(editInvoiceForm.discount) + n(editInvoiceForm.tax)
  );
  const openViewInvoice = (saleId: string) => {
    if (invoiceSection === 'open' || invoiceSection === 'past') {
      setInvoiceViewReturnSection(invoiceSection);
    }
    setSelectedInvoiceId(saleId);
    setInvoiceSection('detail');
  };
  const startEditInvoice = (sale: SaleHistory) => {
    if (invoiceSection === 'open' || invoiceSection === 'past') {
      setInvoiceViewReturnSection(invoiceSection);
    }
    setSelectedInvoiceId(sale.id);
    setEditCurrency('NIO');
    setEditInvoiceForm({
      saleNumber: sale.saleNumber ?? '',
      soldAt: sale.soldAt ? new Date(sale.soldAt).toISOString().slice(0, 10) : '',
      customerId: sale.customer?.id ?? '',
      employeeId: sale.employee?.id ?? '',
      paymentMethod: (sale.paymentMethod as PaymentMethod) ?? 'CASH',
      creditTermDays: (sale.creditTermDays as CreditTermDays) ?? 'DAYS_30',
      discount: String(num(sale.discount)),
      tax: String(num(sale.tax)),
      amountPaid: String(num(sale.amountPaid)),
      items:
        (sale.items ?? []).map((item) => ({
          id: (item as { id?: string }).id,
          productId: (item.product as { id?: string } | null)?.id ?? '',
          quantity: String(num(item.quantity)),
          unitPrice: String(num(item.unitPrice))
        })) || [{ productId: '', quantity: '1', unitPrice: '0' }]
    });
    setInvoiceSection('edit');
  };
  const markInvoicePaid = async (sale: { id: string; total?: string | number }) => {
    try {
      await apiPatch(`sales/${sale.id}`, {
        amountPaid: num(sale.total)
      });
      await refresh();
      setSelectedInvoiceId(sale.id);
      setInvoiceViewReturnSection('past');
      setInvoiceSection('detail');
      setNote(`${t.markPaid} ${humanInvoiceNumber(sale as InvoiceLike)}`);
    } catch (err) {
      setNote(`${t.markPaid} ${t.failed}: ${String(err)}`);
    }
  };

  const setSaleItemField = (index: number, field: 'productId' | 'quantity', value: string) => {
    setSaleItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };
  const addSaleItem = () => setSaleItems((prev) => [...prev, { productId: '', quantity: '1' }]);
  const removeSaleItem = (index: number) =>
    setSaleItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  const setQuoteItemField = (index: number, field: 'productId' | 'quantity', value: string) => {
    setQuoteItems((prev) => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
  };
  const addQuoteItem = () =>
    setQuoteItems((prev) => [...prev, { productId: '', quantity: '1' }]);
  const removeQuoteItem = (index: number) =>
    setQuoteItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)
    );
  const convertSaleCurrency = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === saleCurrency) return;
    const multiplier = nextCurrency === 'USD' ? 1 / nioPerUsd : nioPerUsd;
    setSaleForm((prev) => ({
      ...prev,
      discount: asMoneyInput(n(prev.discount) * multiplier),
      amountPaid: asMoneyInput(n(prev.amountPaid) * multiplier)
    }));
    setSaleCurrency(nextCurrency);
  };
  const convertQuoteCurrency = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === quoteCurrency) return;
    const multiplier = nextCurrency === 'USD' ? 1 / nioPerUsd : nioPerUsd;
    setQuoteForm((prev) => ({
      ...prev,
      discount: asMoneyInput(n(prev.discount) * multiplier),
      amountPaid: asMoneyInput(n(prev.amountPaid) * multiplier)
    }));
    setQuoteCurrency(nextCurrency);
  };
  const setEditItemField = (
    index: number,
    field: keyof EditInvoiceItem,
    value: string
  ) => {
    setEditInvoiceForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    }));
  };
  const convertEditCurrency = (nextCurrency: CurrencyCode) => {
    if (nextCurrency === editCurrency) return;
    const multiplier = nextCurrency === 'USD' ? 1 / nioPerUsd : nioPerUsd;
    setEditInvoiceForm((prev) => ({
      ...prev,
      discount: asMoneyInput(n(prev.discount) * multiplier),
      tax: asMoneyInput(n(prev.tax) * multiplier),
      amountPaid: asMoneyInput(n(prev.amountPaid) * multiplier),
      items: prev.items.map((item) => ({
        ...item,
        unitPrice: asMoneyInput(n(item.unitPrice) * multiplier)
      }))
    }));
    setEditCurrency(nextCurrency);
  };
  const addEditItem = () =>
    setEditInvoiceForm((prev) => ({
      ...prev,
      items: [...prev.items, { productId: '', quantity: '1', unitPrice: '0' }]
    }));
  const removeEditItem = (index: number) =>
    setEditInvoiceForm((prev) => ({
      ...prev,
      items:
        prev.items.length === 1
          ? prev.items
          : prev.items.filter((_, idx) => idx !== index)
    }));
  const createQuote = () => {
    if (quoteSummary.items.length === 0) {
      setNote(`${t.createQuote} ${t.failed}: ${t.itemLines}`);
      return;
    }
    const customer = customers.find((c) => c.id === quoteForm.customerId);
    const employee = employees.find((e) => e.id === quoteForm.employeeId);
    const customerName = customer ? `${customer.firstName} ${customer.lastName}`.trim() : '-';
    const employeeName = employee ? `${employee.firstName} ${employee.lastName}`.trim() : '-';
    const quoteRows = quoteSummary.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: fromNio(item.unitPrice, quoteCurrency),
      lineTotal: fromNio(item.lineTotal, quoteCurrency)
    }));
    const quote: QuoteRecord = {
      id: `Q-${Date.now()}`,
      quoteNumber: buildQuoteNumber(),
      customer: customerName || '-',
      customerId: customer?.id,
      employeeName: employeeName || '-',
      employeeId: employee?.id,
      paymentMethod: quoteForm.paymentMethod,
      creditTermDays:
        quoteForm.paymentMethod === 'CREDIT' ? quoteForm.creditTermDays : undefined,
      quoteDate: quoteForm.quoteDate,
      subtotal: quoteSubtotalDisplay,
      discount: Math.max(0, n(quoteForm.discount)),
      tax: quoteTaxDisplay,
      total: quoteTotal,
      amountPaid: quoteAmountPaidDisplay,
      balanceDue: quoteBalanceDisplay,
      currency: quoteCurrency,
      createdAt: new Date().toISOString(),
      items: quoteRows
    };
    setQuotes((prev) => [quote, ...prev]);
    setSelectedQuoteId(quote.id);
    setNote(`${t.createQuote} ${t.update}`);
  };

  const changeMenu = (section: MenuKey) => {
    if (section === 'invoices') {
      setActiveMenu('invoices');
      setInvoiceSubmenuOpen(true);
      setInvoiceStatusFilter('ALL');
      setInvoiceViewReturnSection('open');
      setInvoiceSection('open');
      setMenuOpen(false);
      return;
    }

    setActiveMenu(section);
    setInvoiceSubmenuOpen(false);
    setMenuOpen(false);
  };
  const changeInvoiceSection = (section: InvoiceSection) => {
    setActiveMenu('invoices');
    setInvoiceSubmenuOpen(true);
    if (section === 'open' || section === 'past') {
      setInvoiceStatusFilter('ALL');
      setInvoiceViewReturnSection(section);
    }
    setInvoiceSection(section);
    setMenuOpen(false);
  };

  return (
    <div className="farma-app">
      {menuOpen ? <button type="button" className="farma-backdrop d-lg-none" onClick={() => setMenuOpen(false)} aria-label="close" /> : null}
      <div className="container-fluid px-2 px-lg-3">
        <div className="row g-3 py-2 py-lg-3">
          <aside className={`col-lg-2 col-xl-2 d-none d-lg-block`}>
            <Sidebar menu={menu} activeMenu={activeMenu} invoiceSubmenuOpen={invoiceSubmenuOpen} invoiceSection={invoiceSection} t={t} onChange={changeMenu} onInvoiceSection={changeInvoiceSection} onSettings={() => changeMenu('settings')} />
          </aside>

          <aside className={`farma-mobile-menu d-lg-none ${menuOpen ? 'open' : ''}`}>
            <Sidebar menu={menu} activeMenu={activeMenu} invoiceSubmenuOpen={invoiceSubmenuOpen} invoiceSection={invoiceSection} t={t} onChange={changeMenu} onInvoiceSection={changeInvoiceSection} onSettings={() => changeMenu('settings')} />
          </aside>

          <main className="col-12 col-lg-10 col-xl-10">
            <div className="farma-shell p-3 p-xl-4">
              <div className="d-flex justify-content-between align-items-center d-lg-none mb-3">
                <button type="button" className="btn btn-sm farma-btn-ghost" onClick={() => setMenuOpen((v) => !v)}>{t.menu}</button>
              </div>

              <div className="farma-topbar p-3 mb-3">
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-xl-5">
                    <h1 className="farma-title mb-0">{t.app}</h1>
                  </div>
                  <div className="col-12 col-xl-7">
                    <div className="d-flex flex-wrap justify-content-xl-end gap-2 farma-top-actions">
                      <div className="input-group input-group-sm farma-search">
                        <span className="input-group-text">⌕</span>
                        <input type="text" className="form-control" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} />
                      </div>
                      <select className="form-select form-select-sm farma-select farma-top-select" value={lang} onChange={(e) => setLang(e.target.value as Lang)}>
                        <option value="en">{t.english}</option>
                        <option value="es">{t.spanish}</option>
                      </select>
                      <button type="button" className="btn btn-sm farma-btn-ghost farma-top-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                        {theme === 'dark' ? t.light : t.dark}
                      </button>
                      <button type="button" className="btn btn-sm farma-btn-ghost farma-top-btn" onClick={refresh}>
                        {loading ? t.refreshing : t.refresh}
                      </button>
                      <button type="button" className="btn btn-sm farma-btn-ghost farma-top-btn farma-top-btn-danger" onClick={onLogout}>
                        {t.logout}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="farma-content p-3 p-xl-4">
                {activeMenu === 'dashboard' ? (
                  <>
                    <h2 className="farma-hero mb-2">{t.welcome}</h2>
                    <p className="farma-sub mb-3">{t.subtitle}</p>

                    <div className="row g-3 row-cols-1 row-cols-md-2 row-cols-xl-4 mb-3">
                      <Metric title={t.inventoryUnits} value={money(stats.inventoryUnits)} note={t.stockHealthy} />
                      <Metric title={t.receivablesCard} value={`$${money(stats.receivablesBalance)}`} note={`12 ${t.overdueInvoices}`} />
                      <Metric title={t.payablesCard} value={`$${money(stats.payablesBalance)}`} note={`5 ${t.upcomingBills}`} />
                      <Metric title={t.expensesCard} value={`$${money(stats.expensesTotal)}`} note={t.last7days} />
                    </div>

                    <ul className="nav nav-tabs farma-tabs mb-3">
                      <li className="nav-item"><button type="button" className={`nav-link ${tab === 'product' ? 'active' : ''}`} onClick={() => setTab('product')}>{t.addProduct}</button></li>
                      <li className="nav-item"><button type="button" className={`nav-link ${tab === 'lot' ? 'active' : ''}`} onClick={() => setTab('lot')}>{t.scheduleLot}</button></li>
                      <li className="nav-item"><button type="button" className={`nav-link ${tab === 'customer' ? 'active' : ''}`} onClick={() => setTab('customer')}>{t.addCustomer}</button></li>
                      <li className="nav-item"><button type="button" className={`nav-link ${tab === 'supplier' ? 'active' : ''}`} onClick={() => setTab('supplier')}>{t.addSupplier}</button></li>
                    </ul>

                    <div className="row g-3 row-cols-1 row-cols-md-2 row-cols-xl-4">
                      <div className={`col ${tab !== 'product' ? 'd-none d-xl-block' : ''}`}>
                        <FormCard title={t.addProduct}>
                          <Field label={t.sku} value={productForm.sku} onChange={(v) => setProductForm({ ...productForm, sku: v })} />
                          <Field label={t.name} value={productForm.name} onChange={(v) => setProductForm({ ...productForm, name: v })} />
                          <SelectField label={t.unit} value={productForm.unit} onChange={(v) => setProductForm({ ...productForm, unit: v })} options={[{ value: 'box', label: 'box' }, { value: 'unit', label: 'unit' }, { value: 'pack', label: 'pack' }]} />
                          <Field label={t.reorderPoint} value={productForm.reorderPoint} onChange={(v) => setProductForm({ ...productForm, reorderPoint: v })} />
                          <button type="button" className="btn farma-btn w-100" onClick={saveProduct}>{t.saveProduct}</button>
                        </FormCard>
                      </div>

                      <div className={`col ${tab !== 'lot' ? 'd-none d-xl-block' : ''}`}>
                        <FormCard title={t.scheduleLot}>
                          <SelectField
                            label={t.product}
                            value={lotForm.productId}
                            onChange={(v) => setLotForm({ ...lotForm, productId: v })}
                            options={catalog.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))}
                          />
                          <Field label={t.batch} value={lotForm.batchNumber} onChange={(v) => setLotForm({ ...lotForm, batchNumber: v })} />
                          <Field label={t.quantity} value={lotForm.quantity} onChange={(v) => setLotForm({ ...lotForm, quantity: v })} />
                          <Field label={t.cost} value={lotForm.purchaseCost} onChange={(v) => setLotForm({ ...lotForm, purchaseCost: v })} />
                          <Field label={t.salePrice} value={lotForm.salePrice} onChange={(v) => setLotForm({ ...lotForm, salePrice: v })} />
                          <button type="button" className="btn farma-btn w-100" onClick={saveLot}>{t.saveLot}</button>
                        </FormCard>
                      </div>

                      <div className={`col ${tab !== 'customer' ? 'd-none d-xl-block' : ''}`}>
                        <FormCard title={t.addCustomer}>
                          <Field label={t.firstName} value={customerForm.firstName} onChange={(v) => setCustomerForm({ ...customerForm, firstName: v })} />
                          <Field label={t.lastName} value={customerForm.lastName} onChange={(v) => setCustomerForm({ ...customerForm, lastName: v })} />
                          <Field label={t.phone} value={customerForm.phone} onChange={(v) => setCustomerForm({ ...customerForm, phone: v })} />
                          <button type="button" className="btn farma-btn w-100" onClick={saveCustomer}>{t.saveCustomer}</button>
                        </FormCard>
                      </div>

                      <div className={`col ${tab !== 'supplier' ? 'd-none d-xl-block' : ''}`}>
                        <FormCard title={t.addSupplier}>
                          <Field label={t.name} value={supplierForm.name} onChange={(v) => setSupplierForm({ ...supplierForm, name: v })} />
                          <Field label={t.contact} value={supplierForm.contactName} onChange={(v) => setSupplierForm({ ...supplierForm, contactName: v })} />
                          <Field label={t.phone} value={supplierForm.phone} onChange={(v) => setSupplierForm({ ...supplierForm, phone: v })} />
                          <button type="button" className="btn farma-btn w-100" onClick={saveSupplier}>{t.saveSupplier}</button>
                        </FormCard>
                      </div>
                    </div>

                    <div className="row g-3 mt-1">
                      <div className="col-12 col-xxl-3">
                        <div className="farma-card h-100">
                          <h3 className="farma-form-title mb-2">{t.overviewKpis}</h3>
                          <div className="farma-mini-list">
                            <div className="farma-mini-row"><span>{t.salesAmount}</span><b>C${money(periodSalesTotal)}</b></div>
                            <div className="farma-mini-row"><span>{t.purchasesAmount}</span><b>C${money(periodPurchasesTotal)}</b></div>
                            <div className="farma-mini-row"><span>{t.netFlow}</span><b>C${money(periodNetFlow)}</b></div>
                            <div className="farma-mini-row"><span>{t.overdue}</span><b>{overdueInvoicesCount}</b></div>
                            <div className="farma-mini-row"><span>{t.dueSoon}</span><b>{dueSoonInvoicesCount}</b></div>
                            <div className="farma-mini-row"><span>{t.inventory}</span><b>C${money(inventoryValue)}</b></div>
                            <div className="farma-mini-row"><span>{t.openInvoices}</span><b>{openInvoicesCount}</b></div>
                          </div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6 col-xxl-3">
                        <TableCard
                          title={t.topCustomers}
                          headers={[t.customer, t.salesAmount, t.invoicesCount, 'Balance']}
                          rows={topCustomersReport.map((row) => [
                            row.customer,
                            `C$${money(row.total)}`,
                            String(row.invoices),
                            `C$${money(row.balance)}`
                          ])}
                          empty={t.noData}
                        />
                      </div>
                      <div className="col-12 col-md-6 col-xxl-3">
                        <TableCard
                          title={t.topSuppliers}
                          headers={[t.supplier, t.purchasesAmount, t.receiptsCount, 'Balance']}
                          rows={topSuppliersReport.map((row) => [
                            row.supplier,
                            `C$${money(row.total)}`,
                            String(row.receipts),
                            `C$${money(row.balance)}`
                          ])}
                          empty={t.noData}
                        />
                      </div>
                      <div className="col-12 col-xxl-3">
                        <div className="farma-card h-100">
                          <h3 className="farma-form-title mb-2">{t.activityTimeline}</h3>
                          <div className="farma-mini-list">
                            {activityTimeline.length === 0 ? (
                              <div className="farma-mini-row">{t.noData}</div>
                            ) : (
                              activityTimeline.map((event) => (
                                <div key={event.id} className="farma-mini-row">
                                  <span>{event.type} · {event.ref} · {dateShort(event.date)}</span>
                                  <b>C${money(event.amount)}</b>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {activeMenu === 'inventory' ? (
                  <div className="row g-3">
                    <div className="col-12">
                      <h2 className="farma-section-title">{t.catalog}</h2>
                    </div>
                    <div className="col-12">
                      <div className="farma-card p-0 overflow-auto">
                        <table className="table table-sm mb-0 farma-table">
                          <thead>
                            <tr>
                              <th>{t.sku}</th>
                              <th>{t.name}</th>
                              <th>{t.quantity}</th>
                              <th>{t.salePrice}</th>
                              <th>{t.batch}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(query ? filteredProducts : catalog).map((p) => (
                              <tr key={p.id}>
                                <td>{p.sku}</td>
                                <td>{p.name}</td>
                                <td>{money(p.currentStock)}</td>
                                <td>${money(p.currentSalePrice)}</td>
                                <td>{p.activeLot?.batchNumber ?? '-'}</td>
                              </tr>
                            ))}
                            {(query ? filteredProducts : catalog).length === 0 ? (
                              <tr><td colSpan={5}>{t.noData}</td></tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="col-12 col-xl-6">
                      <TableCard
                        title={t.lowStockAlerts}
                        headers={[t.sku, t.product, t.quantity, t.reorderPoint]}
                        rows={lowStockAlerts.map((row) => [
                          row.sku,
                          row.name,
                          String(row.stock),
                          String(row.reorderPoint)
                        ])}
                        empty={t.noData}
                      />
                    </div>
                    <div className="col-12 col-xl-6">
                      <TableCard
                        title={t.expiringLots}
                        headers={[t.product, t.batch, t.daysLeft, t.quantity]}
                        rows={lotExpiryAlerts.map((row) => [
                          `${row.productName} (${row.sku})`,
                          row.batchNumber,
                          String(row.daysLeft),
                          String(row.remainingQty)
                        ])}
                        empty={t.noData}
                      />
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'invoices' ? (
                  <div className="row g-3">
                    <div className="col-12">
                      <div className="farma-card p-0 overflow-hidden farma-invoice-toolbar-card">
                        <div className="farma-table-toolbar">
                          <div className="d-flex align-items-center gap-2">
                            <h4 className="farma-form-title mb-0">{t.invoices}</h4>
                          </div>
                          <div className="d-flex flex-wrap gap-2">
                            <div className="input-group input-group-sm farma-search">
                              <span className="input-group-text">⌕</span>
                              <input type="text" className="form-control" value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} placeholder={t.search} />
                            </div>
                            <button type="button" className="btn btn-sm farma-invoice-new-btn" onClick={() => setInvoiceSection('current')}>{t.newInvoice}</button>
                          </div>
                        </div>
                        <div className="farma-invoice-sections px-3 pb-2">
                          <button type="button" className={`farma-invoice-section-btn ${invoiceSection === 'current' ? 'active' : ''}`} onClick={() => setInvoiceSection('current')}>{t.currentInvoice}</button>
                          <button
                            type="button"
                            className={`farma-invoice-section-btn ${invoiceSection === 'open' ? 'active' : ''}`}
                            onClick={() => {
                              setInvoiceStatusFilter('ALL');
                              setInvoiceViewReturnSection('open');
                              setInvoiceSection('open');
                            }}
                          >
                            {t.openInvoices}
                          </button>
                          <button
                            type="button"
                            className={`farma-invoice-section-btn ${invoiceSection === 'past' ? 'active' : ''}`}
                            onClick={() => {
                              setInvoiceStatusFilter('ALL');
                              setInvoiceViewReturnSection('past');
                              setInvoiceSection('past');
                            }}
                          >
                            {t.pastInvoices}
                          </button>
                          <button type="button" className={`farma-invoice-section-btn ${invoiceSection === 'quotes' ? 'active' : ''}`} onClick={() => setInvoiceSection('quotes')}>{t.quotes}</button>
                        </div>
                      </div>
                    </div>

                    {invoiceSection === 'current' ? (
                      <>
                        <div className="col-12 col-xxl-8">
                          <div className="farma-card farma-invoice-form-card h-100">
                            <div className="farma-invoice-form-head">
                              <h3 className="farma-invoice-form-title mb-0">{t.registerSale}</h3>
                              <div className="farma-invoice-head-controls">
                                <div className="farma-invoice-head-chip">
                                  <span>{t.invoiceNo}:</span>
                                  <b>{lastSale ? humanInvoiceNumber(lastSale as InvoiceLike) : 'AUTO'}</b>
                                </div>
                                <div className="farma-invoice-head-chip">
                                  <span>{t.status}:</span>
                                  <b>{currentSaleStatus}</b>
                                </div>
                              </div>
                            </div>

                            <div className="row g-3">
                              <div className="col-12">
                                <CustomerAutocompleteField
                                  label={t.customerSearch}
                                  value={saleCustomerQuery}
                                  onChange={onSaleCustomerQueryChange}
                                  options={filteredSaleCustomers.map((customer) => ({
                                    value: customer.id,
                                    label: fullCustomerName(customer),
                                    meta: customer.phone || undefined
                                  }))}
                                  emptyText={t.noCustomerMatches}
                                  onSelect={selectSaleCustomer}
                                />
                              </div>
                              <div className="col-12 col-lg-8">
                                <SelectField label={t.customer} value={saleForm.customerId} onChange={selectSaleCustomer} options={saleCustomerOptions} />
                              </div>
                              <div className="col-12 col-lg-4">
                                <SelectField
                                  label={t.currency}
                                  value={saleCurrency}
                                  onChange={(v) => convertSaleCurrency(v as CurrencyCode)}
                                  options={[
                                    { value: 'NIO', label: t.nicaraguanCordoba },
                                    { value: 'USD', label: t.usDollar }
                                  ]}
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <label className="form-label farma-label">Date</label>
                                <input type="date" className="form-control form-control-sm farma-input" value={new Date().toISOString().slice(0, 10)} readOnly />
                              </div>
                              <div className="col-12 col-lg-6">
                                <SelectField label={t.employee} value={saleForm.employeeId} onChange={(v) => setSaleForm({ ...saleForm, employeeId: v })} options={[{ value: '', label: '-' }, ...employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))]} />
                              </div>
                              <div className="col-12">
                                <div className="farma-rate-pill small">{t.fxToday}: 1 USD = C${money(nioPerUsd)} NIO</div>
                              </div>
                            </div>

                            <div className="farma-invoice-items-wrap mt-3">
                              <div className="d-flex justify-content-between align-items-center">
                                <h4 className="farma-form-title mb-0">{t.itemLines}</h4>
                                <button type="button" className="btn btn-sm farma-invoice-add-btn" onClick={addSaleItem}>{t.addItem}</button>
                              </div>
                              <div className="table-responsive mt-2">
                                <table className="table table-sm mb-0 farma-table farma-invoice-items-table">
                                  <thead>
                                    <tr>
                                      <th>{t.product}</th>
                                      <th>{t.quantity}</th>
                                      <th>{t.unitPrice}</th>
                                      <th>{t.lineTotal}</th>
                                      <th>{t.actions}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {saleItems.map((item, index) => {
                                      const product = catalog.find((p) => p.id === item.productId);
                                      const unitPriceDisplay = fromNio(num(product?.currentSalePrice), saleCurrency);
                                      const lineTotalDisplay = n(item.quantity) * unitPriceDisplay;
                                      return (
                                        <tr key={`sale-item-${index}`}>
                                          <td>
                                            <select
                                              className="form-select form-select-sm farma-input"
                                              value={item.productId}
                                              onChange={(e) => setSaleItemField(index, 'productId', e.target.value)}
                                            >
                                              <option value="">-</option>
                                              {catalog.map((p) => (
                                                <option key={p.id} value={p.id}>{`${p.name} (${p.sku})`}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <input className="form-control form-control-sm farma-input" value={item.quantity} onChange={(e) => setSaleItemField(index, 'quantity', e.target.value)} />
                                          </td>
                                          <td>{currencySymbol(saleCurrency)}{money(unitPriceDisplay)}</td>
                                          <td>{currencySymbol(saleCurrency)}{money(lineTotalDisplay)}</td>
                                          <td>
                                            <button type="button" className="btn btn-sm farma-action-delete" onClick={() => removeSaleItem(index)}>
                                              {t.remove}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="row g-3 mt-1">
                              <div className="col-12 col-lg-6">
                                <Field label={t.discount} value={saleForm.discount} onChange={(v) => setSaleForm({ ...saleForm, discount: v })} />
                              </div>
                              <div className="col-12 col-lg-6">
                                <Field label={t.taxRate} value={saleForm.taxRate} onChange={(v) => setSaleForm({ ...saleForm, taxRate: v })} />
                              </div>
                              <div className="col-12 col-lg-6">
                                <SelectField label={t.paymentMethod} value={saleForm.paymentMethod} onChange={(v) => setSaleForm({ ...saleForm, paymentMethod: v as PaymentMethod })} options={[{ value: 'CASH', label: t.cash }, { value: 'CREDIT', label: t.credit }]} />
                              </div>
                              <div className="col-12 col-lg-6">
                                {saleForm.paymentMethod === 'CREDIT' ? (
                                  <SelectField label={t.creditTerm} value={saleForm.creditTermDays} onChange={(v) => setSaleForm({ ...saleForm, creditTermDays: v as CreditTermDays })} options={[{ value: 'DAYS_15', label: t.days15 }, { value: 'DAYS_30', label: t.days30 }, { value: 'DAYS_45', label: t.days45 }, { value: 'DAYS_60', label: t.days60 }]} />
                                ) : (
                                  <Field label={t.amountPaid} value={saleForm.amountPaid} onChange={(v) => setSaleForm({ ...saleForm, amountPaid: v })} />
                                )}
                              </div>
                              {saleForm.paymentMethod === 'CREDIT' ? (
                                <div className="col-12 col-lg-6">
                                  <Field label={t.amountPaid} value={saleForm.amountPaid} onChange={(v) => setSaleForm({ ...saleForm, amountPaid: v })} />
                                </div>
                              ) : null}
                              <div className="col-12 d-flex gap-2 justify-content-end">
                                <button type="button" className="btn btn-sm farma-btn-ghost" onClick={createQuote}>{t.quotes}</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="col-12 col-xxl-4">
                          <div className="farma-card farma-invoice-totals-card h-100">
                            <h3 className="farma-form-title mb-2">{t.itemLines}</h3>
                            <div className="farma-summary-list">
                              <div className="farma-summary-row"><span>{t.subtotal}:</span><b>{currencySymbol(saleCurrency)}{money(saleSubtotalDisplay)}</b></div>
                              <div className="farma-summary-row"><span>{t.discount}:</span><b>{currencySymbol(saleCurrency)}{money(fromNio(saleDiscountNio, saleCurrency))}</b></div>
                              <div className="farma-summary-row"><span>{t.tax} ({n(saleForm.taxRate)}%):</span><b>{currencySymbol(saleCurrency)}{money(saleTaxDisplay)}</b></div>
                            </div>
                            <div className="farma-summary-total">
                              <span>{t.total}:</span>
                              <strong>{currencySymbol(saleCurrency)}{money(saleTotalDisplay)}</strong>
                            </div>
                            <div className="farma-summary-row"><span>{t.amountPaid}:</span><b>{currencySymbol(saleCurrency)}{money(saleAmountPaidDisplay)}</b></div>
                            <div className="farma-summary-balance">
                              <span>Balance Due:</span>
                              <strong>{currencySymbol(saleCurrency)}{money(saleBalanceDisplay)}</strong>
                            </div>
                            <button type="button" className="btn farma-btn farma-create-invoice-main w-100" onClick={saveSale}>
                              {t.saveSale}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}

                    {(invoiceSection === 'open' || invoiceSection === 'past') ? (
                      <div className="col-12">
                        <div className="row g-3 farma-invoice-board">
                          <div className="col-12 col-xxl-7">
                            <div className="farma-card farma-invoice-list-card farma-invoice-recent-panel h-100">
                              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
                                <h3 className="farma-form-title mb-0">{t.recentInvoices}</h3>
                                <span className="small farma-muted">{boardInvoices.length} {t.invoices}</span>
                              </div>
                              <div className="farma-invoice-status-filters mb-3">
                                {([
                                  { key: 'ALL', label: t.all },
                                  { key: 'OPEN', label: 'OPEN' },
                                  { key: 'PARTIALLY_PAID', label: 'PARTIAL' },
                                  { key: 'PAID', label: 'PAID' },
                                  { key: 'OVERDUE', label: 'OVERDUE' }
                                ] as Array<{ key: InvoiceStatusFilter; label: string }>).map((filter) => (
                                  <button
                                    key={filter.key}
                                    type="button"
                                    className={`farma-status-filter-btn ${invoiceStatusFilter === filter.key ? 'active' : ''}`}
                                    onClick={() => setInvoiceStatusFilter(filter.key)}
                                  >
                                    {filter.label}
                                  </button>
                                ))}
                              </div>
                              <div className="farma-invoice-card-grid">
                                {boardInvoices.length === 0 ? (
                                  <div className="small farma-muted">{t.noData}</div>
                                ) : (
                                  boardInvoices.slice(0, 40).map((sale) => (
                                    <article
                                      key={sale.id}
                                      className={`farma-invoice-feed-card ${boardPreviewInvoice?.id === sale.id ? 'active' : ''}`}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => setSelectedInvoiceId(sale.id)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                          event.preventDefault();
                                          setSelectedInvoiceId(sale.id);
                                        }
                                      }}
                                    >
                                      <div className="farma-invoice-feed-head">
                                        <strong>{humanInvoiceNumber(sale)}</strong>
                                        <span className={`farma-status-pill ${statusClass(sale.status)}`}>{statusLabel(sale.status)}</span>
                                      </div>
                                      <div className="farma-invoice-feed-meta">{`${sale.customer?.firstName ?? '-'} ${sale.customer?.lastName ?? ''}`.trim()}</div>
                                      <div className="farma-invoice-feed-meta">{dateShort(sale.soldAt)}</div>
                                      <div className="farma-invoice-feed-method">
                                        <span>{t.paymentMethod}</span>
                                        <strong>{paymentMethodLabel(sale.paymentMethod)}</strong>
                                      </div>
                                      <div className="farma-invoice-feed-foot">
                                        <strong>C${money(sale.total)}</strong>
                                        <span>Balance C${money(sale.balanceDue)}</span>
                                      </div>
                                      <div className="farma-invoice-feed-actions mt-2">
                                        <button
                                          type="button"
                                          className="btn btn-sm farma-btn-ghost farma-action-view"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            openViewInvoice(sale.id);
                                          }}
                                        >
                                          {t.view}
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-sm farma-btn-ghost farma-action-edit"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            startEditInvoice(sale);
                                          }}
                                        >
                                          {t.edit}
                                        </button>
                                        {invoiceSection === 'open' ? (
                                          <button
                                            type="button"
                                            className="btn btn-sm farma-btn-ghost farma-action-paid"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              void markInvoicePaid(sale);
                                            }}
                                          >
                                            {t.markPaid}
                                          </button>
                                        ) : null}
                                        <button
                                          type="button"
                                          className="btn btn-sm farma-btn-ghost farma-action-delete"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void deleteInvoice(sale);
                                          }}
                                        >
                                          {t.delete}
                                        </button>
                                      </div>
                                    </article>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="col-12 col-xxl-5">
                            <div className="farma-card farma-invoice-summary-panel h-100">
                              <div className="d-flex justify-content-between align-items-center mb-2">
                                <h3 className="farma-form-title mb-0">{t.invoiceSummary}</h3>
                                {boardPreviewInvoice ? (
                                  <div className="d-flex gap-1">
                                    <button type="button" className="btn btn-sm farma-btn-ghost farma-action-view" onClick={() => openViewInvoice(boardPreviewInvoice.id)}>{t.view}</button>
                                    <button type="button" className="btn btn-sm farma-btn-ghost farma-action-edit" onClick={() => startEditInvoice(boardPreviewInvoice)}>{t.edit}</button>
                                    {invoiceSection === 'open' ? (
                                      <button type="button" className="btn btn-sm farma-btn-ghost farma-action-paid" onClick={() => void markInvoicePaid(boardPreviewInvoice)}>{t.markPaid}</button>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                              {boardPreviewInvoice ? (
                                <div className="farma-invoice farma-board-preview">
                                  {isPaidStatus(boardPreviewInvoice.status) ? <div className="farma-paid-watermark">{t.paidStamp}</div> : null}
                                  <div className="fw-semibold">{companyProfile.companyName || 'Haytazentavo'}</div>
                                  <div className="small farma-muted">{companyProfile.address || '-'}, {companyProfile.country || '-'}</div>
                                  <div className="small farma-muted">{t.phone}: {companyProfile.phone || '-'}</div>
                                  <div className="small farma-muted">{t.ruc}: {companyProfile.ruc || '-'}</div>
                                  <hr className="my-2" />
                                  <div className="small"><b>{t.invoiceNo}:</b> {humanInvoiceNumber(boardPreviewInvoice as InvoiceLike)}</div>
                                  <div className="small"><b>Date:</b> {dateShort(boardPreviewInvoice.soldAt)}</div>
                                  <div className="small"><b>{t.paymentMethod}:</b> {paymentMethodLabel(boardPreviewInvoice.paymentMethod)}</div>
                                  <div className="small"><b>{t.subtotal}:</b> C${money(boardPreviewInvoice.subtotal)}</div>
                                  <div className="small"><b>{t.discount}:</b> C${money(boardPreviewInvoice.discount)}</div>
                                  <div className="small"><b>{t.tax}:</b> C${money(boardPreviewInvoice.tax)}</div>
                                  <div className="small"><b>{t.total}:</b> C${money(boardPreviewInvoice.total)}</div>
                                  <div className="small"><b>{t.amountPaid}:</b> C${money(boardPreviewInvoice.amountPaid)}</div>
                                  <div className="small"><b>Balance:</b> C${money(boardPreviewInvoice.balanceDue)}</div>
                                  <div className="small mt-2 mb-1"><b>{t.itemLines}</b></div>
                                  <div className="farma-mini-list mb-2">
                                    {boardPreviewItems.length === 0 ? (
                                      <div className="farma-mini-row">{t.noData}</div>
                                    ) : (
                                      boardPreviewItems.slice(0, 8).map((item, idx) => (
                                        <div key={`${item.productName}-${idx}`} className="farma-mini-row">
                                          <span>{item.productName} x {item.quantity}</span>
                                          <span>C${money(item.lineTotal)}</span>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="small farma-muted">{t.noData}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {invoiceSection === 'detail' ? (
                      <div className="col-12">
                        <div className="farma-card h-100">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h3 className="farma-form-title mb-0">{t.invoicePreview}</h3>
                            <div className="d-flex gap-2">
                              <button type="button" className="btn btn-sm farma-btn-ghost" onClick={() => setInvoiceSection(invoiceViewReturnSection)}>{t.back}</button>
                              {previewInvoice && !isPaidStatus((previewInvoice as { status?: string }).status) ? (
                                <button type="button" className="btn btn-sm farma-btn-ghost farma-action-paid" onClick={() => void markInvoicePaid(previewInvoice as { id: string; total?: string | number })}>{t.markPaid}</button>
                              ) : null}
                              <button type="button" className="btn btn-sm farma-btn-ghost" onClick={downloadInvoicePdf}>{t.downloadPdf}</button>
                              <button type="button" className="btn btn-sm farma-btn-ghost" onClick={printInvoice}>{t.printInvoice}</button>
                            </div>
                          </div>
                          {previewInvoice ? (
                            <div className="farma-invoice">
                              {isPaidStatus((previewInvoice as { status?: string }).status) ? <div className="farma-paid-watermark">{t.paidStamp}</div> : null}
                              <div className="fw-semibold">{companyProfile.companyName || 'Haytazentavo'}</div>
                              <div className="small farma-muted">{companyProfile.address || '-'}, {companyProfile.country || '-'}</div>
                              <div className="small farma-muted">{t.phone}: {companyProfile.phone || '-'}</div>
                              <div className="small farma-muted">{t.ruc}: {companyProfile.ruc || '-'}</div>
                              <hr className="my-2" />
                              <div className="small"><b>{t.invoiceNo}:</b> {humanInvoiceNumber(previewInvoice as InvoiceLike)}</div>
                              <div className="small"><b>Date:</b> {dateShort(previewInvoice.soldAt)}</div>
                              <div className="small"><b>{t.paymentMethod}:</b> {paymentMethodLabel(previewInvoice.paymentMethod)}</div>
                              <div className="small"><b>{t.subtotal}:</b> C${money(previewInvoice.subtotal)}</div>
                              <div className="small"><b>{t.discount}:</b> C${money(previewInvoice.discount)}</div>
                              <div className="small"><b>{t.tax}:</b> C${money(previewInvoice.tax)}</div>
                              <div className="small"><b>{t.total}:</b> C${money(previewInvoice.total)}</div>
                              <div className="small"><b>{t.amountPaid}:</b> C${money(previewInvoice.amountPaid)}</div>
                              <div className="small"><b>Balance:</b> C${money(previewInvoice.balanceDue)}</div>
                              <div className="small mt-2 mb-1"><b>{t.itemLines}</b></div>
                              <div className="farma-mini-list mb-2">
                                {previewInvoiceItems.map((item, idx) => (
                                  <div key={`${item.productName}-${idx}`} className="farma-mini-row">
                                    <span>{item.productName} x {item.quantity}</span>
                                    <span>C${money(item.lineTotal)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="small farma-muted">{t.noInvoiceYet}</div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {invoiceSection === 'edit' ? (
                      <div className="col-12">
                        <div className="farma-card h-100 farma-edit-shell">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <h3 className="farma-form-title mb-0">{t.edit} {t.invoiceNo} · {humanInvoiceNumber(selectedSaleInvoice)}</h3>
                            <button type="button" className="btn btn-sm farma-btn-ghost" onClick={() => setInvoiceSection(invoiceViewReturnSection)}>
                              {t.back}
                            </button>
                          </div>
                          {selectedSaleInvoice ? (
                            <div className="row g-3 farma-edit-grid">
                              <div className="col-md-4">
                                <Field label={t.invoiceNo} value={editInvoiceForm.saleNumber} onChange={(v) => setEditInvoiceForm((prev) => ({ ...prev, saleNumber: v }))} />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label farma-label">Date</label>
                                <input
                                  type="date"
                                  className="form-control form-control-sm farma-input"
                                  value={editInvoiceForm.soldAt}
                                  onChange={(e) => setEditInvoiceForm((prev) => ({ ...prev, soldAt: e.target.value }))}
                                />
                              </div>
                              <div className="col-md-4">
                                <label className="form-label farma-label">{t.customer}</label>
                                <select
                                  className="form-select form-select-sm farma-input"
                                  value={editInvoiceForm.customerId}
                                  onChange={(e) => setEditInvoiceForm((prev) => ({ ...prev, customerId: e.target.value }))}
                                >
                                  <option value="">-</option>
                                  {customers.map((c) => (
                                    <option key={c.id} value={c.id}>{`${c.firstName} ${c.lastName}`}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label farma-label">{t.currency}</label>
                                <select
                                  className="form-select form-select-sm farma-input"
                                  value={editCurrency}
                                  onChange={(e) => convertEditCurrency(e.target.value as CurrencyCode)}
                                >
                                  <option value="NIO">{t.nicaraguanCordoba}</option>
                                  <option value="USD">{t.usDollar}</option>
                                </select>
                              </div>
                              <div className="col-md-4 d-flex align-items-end">
                                <div className="small farma-muted">
                                  {t.fxToday}: 1 USD = C${money(nioPerUsd)} NIO
                                </div>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label farma-label">{t.employee}</label>
                                <select
                                  className="form-select form-select-sm farma-input"
                                  value={editInvoiceForm.employeeId}
                                  onChange={(e) => setEditInvoiceForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                                >
                                  <option value="">-</option>
                                  {employees.map((emp) => (
                                    <option key={emp.id} value={emp.id}>{`${emp.firstName} ${emp.lastName}`}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-md-4">
                                <label className="form-label farma-label">{t.paymentMethod}</label>
                                <select
                                  className="form-select form-select-sm farma-input"
                                  value={editInvoiceForm.paymentMethod}
                                  onChange={(e) =>
                                    setEditInvoiceForm((prev) => ({
                                      ...prev,
                                      paymentMethod: e.target.value as PaymentMethod
                                    }))
                                  }
                                >
                                  <option value="CASH">{t.cash}</option>
                                  <option value="CREDIT">{t.credit}</option>
                                </select>
                              </div>
                              {editInvoiceForm.paymentMethod === 'CREDIT' ? (
                                <div className="col-md-4">
                                  <label className="form-label farma-label">{t.creditTerm}</label>
                                  <select
                                    className="form-select form-select-sm farma-input"
                                    value={editInvoiceForm.creditTermDays}
                                    onChange={(e) =>
                                      setEditInvoiceForm((prev) => ({
                                        ...prev,
                                        creditTermDays: e.target.value as CreditTermDays
                                      }))
                                    }
                                  >
                                    <option value="DAYS_15">{t.days15}</option>
                                    <option value="DAYS_30">{t.days30}</option>
                                    <option value="DAYS_45">{t.days45}</option>
                                    <option value="DAYS_60">{t.days60}</option>
                                  </select>
                                </div>
                              ) : null}
                              <div className="col-md-4">
                                <Field label={t.discount} value={editInvoiceForm.discount} onChange={(v) => setEditInvoiceForm((prev) => ({ ...prev, discount: v }))} />
                              </div>
                              <div className="col-md-4">
                                <Field label={t.tax} value={editInvoiceForm.tax} onChange={(v) => setEditInvoiceForm((prev) => ({ ...prev, tax: v }))} />
                              </div>
                              <div className="col-md-4">
                                <Field label={t.amountPaid} value={editInvoiceForm.amountPaid} onChange={(v) => setEditInvoiceForm((prev) => ({ ...prev, amountPaid: v }))} />
                              </div>
                              <div className="col-md-8">
                                <div className="farma-edit-summary">
                                  <span>{t.subtotal}: {currencySymbol(editCurrency)}{money(editSubtotal)}</span>
                                  <span>{t.total}: {currencySymbol(editCurrency)}{money(editTotal)}</span>
                                </div>
                              </div>
                              <div className="col-12 d-flex justify-content-between align-items-center">
                                <h4 className="farma-form-title mb-0">{t.itemLines}</h4>
                                <button type="button" className="btn btn-sm farma-invoice-add-btn" onClick={addEditItem}>
                                  {t.addItem}
                                </button>
                              </div>
                              <div className="col-12">
                                <div className="table-responsive">
                                  <table className="table table-sm mb-0 farma-table">
                                    <thead>
                                      <tr>
                                        <th>{t.product}</th>
                                        <th>{t.quantity}</th>
                                        <th>{t.unitPrice}</th>
                                        <th>{t.lineTotal}</th>
                                        <th>{t.actions}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {editInvoiceForm.items.map((item, idx) => (
                                        <tr key={`edit-item-${idx}`}>
                                          <td>
                                            <select
                                              className="form-select form-select-sm farma-input"
                                              value={item.productId}
                                              onChange={(e) => setEditItemField(idx, 'productId', e.target.value)}
                                            >
                                              <option value="">-</option>
                                              {catalog.map((p) => (
                                                <option key={p.id} value={p.id}>{`${p.name} (${p.sku})`}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <input
                                              className="form-control form-control-sm farma-input"
                                              value={item.quantity}
                                              onChange={(e) => setEditItemField(idx, 'quantity', e.target.value)}
                                            />
                                          </td>
                                          <td>
                                            <input
                                              className="form-control form-control-sm farma-input"
                                              value={item.unitPrice}
                                              onChange={(e) => setEditItemField(idx, 'unitPrice', e.target.value)}
                                            />
                                          </td>
                                          <td>{currencySymbol(editCurrency)}{money(n(item.quantity) * n(item.unitPrice))}</td>
                                          <td>
                                            <button type="button" className="btn btn-sm farma-btn-ghost farma-action-delete" onClick={() => removeEditItem(idx)}>
                                              {t.remove}
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                              <div className="col-12 d-flex gap-2 justify-content-end">
                                <button type="button" className="btn btn-sm farma-btn-ghost" onClick={() => setInvoiceSection(invoiceViewReturnSection)}>
                                  {t.back}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm farma-btn"
                                  onClick={async () => saveEditedInvoice(selectedSaleInvoice.id)}
                                >
                                  {t.saveSale}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="small farma-muted">{t.noInvoiceYet}</div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {invoiceSection === 'quotes' ? (
                      <>
                        <div className="col-12 col-xxl-8">
                          <div className="farma-card farma-invoice-form-card h-100">
                            <div className="farma-invoice-form-head">
                              <h3 className="farma-invoice-form-title mb-0">{t.createQuote}</h3>
                              <div className="farma-invoice-head-controls">
                                <div className="farma-invoice-head-chip">
                                  <span>{t.quoteNo}:</span>
                                  <b>{selectedQuote?.quoteNumber ?? 'AUTO'}</b>
                                </div>
                                <div className="farma-invoice-head-chip">
                                  <span>{t.status}:</span>
                                  <b>
                                    {quoteBalanceDisplay <= 0
                                      ? 'PAID'
                                      : quoteAmountPaidDisplay > 0
                                        ? 'PARTIALLY_PAID'
                                        : 'OPEN'}
                                  </b>
                                </div>
                              </div>
                            </div>

                            <div className="row g-3">
                              <div className="col-12">
                                <CustomerAutocompleteField
                                  label={t.customerSearch}
                                  value={quoteCustomerQuery}
                                  onChange={onQuoteCustomerQueryChange}
                                  options={filteredQuoteCustomers.map((customer) => ({
                                    value: customer.id,
                                    label: fullCustomerName(customer),
                                    meta: customer.phone || undefined
                                  }))}
                                  emptyText={t.noCustomerMatches}
                                  onSelect={selectQuoteCustomer}
                                />
                              </div>
                              <div className="col-12 col-lg-8">
                                <SelectField
                                  label={t.customer}
                                  value={quoteForm.customerId}
                                  onChange={selectQuoteCustomer}
                                  options={saleCustomerOptions}
                                />
                              </div>
                              <div className="col-12 col-lg-4">
                                <SelectField
                                  label={t.currency}
                                  value={quoteCurrency}
                                  onChange={(v) => convertQuoteCurrency(v as CurrencyCode)}
                                  options={[
                                    { value: 'NIO', label: t.nicaraguanCordoba },
                                    { value: 'USD', label: t.usDollar }
                                  ]}
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <label className="form-label farma-label">Date</label>
                                <input
                                  type="date"
                                  className="form-control form-control-sm farma-input"
                                  value={quoteForm.quoteDate}
                                  onChange={(e) =>
                                    setQuoteForm((prev) => ({
                                      ...prev,
                                      quoteDate: e.target.value
                                    }))
                                  }
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <SelectField
                                  label={t.employee}
                                  value={quoteForm.employeeId}
                                  onChange={(v) =>
                                    setQuoteForm((prev) => ({ ...prev, employeeId: v }))
                                  }
                                  options={[
                                    { value: '', label: '-' },
                                    ...employees.map((e) => ({
                                      value: e.id,
                                      label: `${e.firstName} ${e.lastName}`
                                    }))
                                  ]}
                                />
                              </div>
                              <div className="col-12">
                                <div className="farma-rate-pill small">
                                  {t.fxToday}: 1 USD = C${money(nioPerUsd)} NIO
                                </div>
                              </div>
                            </div>

                            <div className="farma-invoice-items-wrap mt-3">
                              <div className="d-flex justify-content-between align-items-center">
                                <h4 className="farma-form-title mb-0">{t.itemLines}</h4>
                                <button
                                  type="button"
                                  className="btn btn-sm farma-invoice-add-btn"
                                  onClick={addQuoteItem}
                                >
                                  {t.addItem}
                                </button>
                              </div>
                              <div className="table-responsive mt-2">
                                <table className="table table-sm mb-0 farma-table farma-invoice-items-table">
                                  <thead>
                                    <tr>
                                      <th>{t.product}</th>
                                      <th>{t.quantity}</th>
                                      <th>{t.unitPrice}</th>
                                      <th>{t.lineTotal}</th>
                                      <th>{t.actions}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {quoteItems.map((item, index) => {
                                      const product = catalog.find((p) => p.id === item.productId);
                                      const unitPriceDisplay = fromNio(num(product?.currentSalePrice), quoteCurrency);
                                      const lineTotalDisplay = n(item.quantity) * unitPriceDisplay;
                                      return (
                                        <tr key={`quote-form-item-${index}`}>
                                          <td>
                                            <select
                                              className="form-select form-select-sm farma-input"
                                              value={item.productId}
                                              onChange={(e) => setQuoteItemField(index, 'productId', e.target.value)}
                                            >
                                              <option value="">-</option>
                                              {catalog.map((p) => (
                                                <option key={p.id} value={p.id}>{`${p.name} (${p.sku})`}</option>
                                              ))}
                                            </select>
                                          </td>
                                          <td>
                                            <input
                                              className="form-control form-control-sm farma-input"
                                              value={item.quantity}
                                              onChange={(e) => setQuoteItemField(index, 'quantity', e.target.value)}
                                            />
                                          </td>
                                          <td>{currencySymbol(quoteCurrency)}{money(unitPriceDisplay)}</td>
                                          <td>{currencySymbol(quoteCurrency)}{money(lineTotalDisplay)}</td>
                                          <td>
                                            <button
                                              type="button"
                                              className="btn btn-sm farma-action-delete"
                                              onClick={() => removeQuoteItem(index)}
                                            >
                                              {t.remove}
                                            </button>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="row g-3 mt-1">
                              <div className="col-12 col-lg-6">
                                <Field
                                  label={t.discount}
                                  value={quoteForm.discount}
                                  onChange={(v) =>
                                    setQuoteForm((prev) => ({ ...prev, discount: v }))
                                  }
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <Field
                                  label={t.taxRate}
                                  value={quoteForm.taxRate}
                                  onChange={(v) =>
                                    setQuoteForm((prev) => ({ ...prev, taxRate: v }))
                                  }
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                <SelectField
                                  label={t.paymentMethod}
                                  value={quoteForm.paymentMethod}
                                  onChange={(v) =>
                                    setQuoteForm((prev) => ({
                                      ...prev,
                                      paymentMethod: v as PaymentMethod
                                    }))
                                  }
                                  options={[
                                    { value: 'CASH', label: t.cash },
                                    { value: 'CREDIT', label: t.credit }
                                  ]}
                                />
                              </div>
                              <div className="col-12 col-lg-6">
                                {quoteForm.paymentMethod === 'CREDIT' ? (
                                  <SelectField
                                    label={t.creditTerm}
                                    value={quoteForm.creditTermDays}
                                    onChange={(v) =>
                                      setQuoteForm((prev) => ({
                                        ...prev,
                                        creditTermDays: v as CreditTermDays
                                      }))
                                    }
                                    options={[
                                      { value: 'DAYS_15', label: t.days15 },
                                      { value: 'DAYS_30', label: t.days30 },
                                      { value: 'DAYS_45', label: t.days45 },
                                      { value: 'DAYS_60', label: t.days60 }
                                    ]}
                                  />
                                ) : (
                                  <Field
                                    label={t.amountPaid}
                                    value={quoteForm.amountPaid}
                                    onChange={(v) =>
                                      setQuoteForm((prev) => ({ ...prev, amountPaid: v }))
                                    }
                                  />
                                )}
                              </div>
                              {quoteForm.paymentMethod === 'CREDIT' ? (
                                <div className="col-12 col-lg-6">
                                  <Field
                                    label={t.amountPaid}
                                    value={quoteForm.amountPaid}
                                    onChange={(v) =>
                                      setQuoteForm((prev) => ({ ...prev, amountPaid: v }))
                                    }
                                  />
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-xxl-4">
                          <div className="farma-card farma-invoice-totals-card h-100">
                            <h3 className="farma-form-title mb-2">{t.quoteItems}</h3>
                            <div className="farma-summary-list">
                              <div className="farma-summary-row"><span>{t.subtotal}:</span><b>{currencySymbol(quoteCurrency)}{money(quoteSubtotalDisplay)}</b></div>
                              <div className="farma-summary-row"><span>{t.discount}:</span><b>{currencySymbol(quoteCurrency)}{money(n(quoteForm.discount))}</b></div>
                              <div className="farma-summary-row"><span>{t.tax} ({n(quoteForm.taxRate)}%):</span><b>{currencySymbol(quoteCurrency)}{money(quoteTaxDisplay)}</b></div>
                            </div>
                            <div className="farma-summary-total">
                              <span>{t.total}:</span>
                              <strong>{currencySymbol(quoteCurrency)}{money(quoteTotalDisplay)}</strong>
                            </div>
                            <div className="farma-summary-row"><span>{t.amountPaid}:</span><b>{currencySymbol(quoteCurrency)}{money(quoteAmountPaidDisplay)}</b></div>
                            <div className="farma-summary-balance">
                              <span>Balance Due:</span>
                              <strong>{currencySymbol(quoteCurrency)}{money(quoteBalanceDisplay)}</strong>
                            </div>
                            <button type="button" className="btn farma-btn farma-create-invoice-main w-100 mb-2" onClick={createQuote}>
                              {t.createQuote}
                            </button>
                            {selectedQuote ? (
                              <button
                                type="button"
                                className="btn btn-sm farma-btn-ghost w-100"
                                onClick={() => downloadQuotePdf(selectedQuote)}
                              >
                                {t.downloadPdf}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="farma-card p-0 overflow-auto">
                            <div className="px-3 pt-3"><h3 className="farma-form-title mb-2">{t.quotes}</h3></div>
                            <table className="table table-sm mb-0 farma-table">
                              <thead>
                                <tr>
                                  <th>{t.quoteNo}</th>
                                  <th>{t.customer}</th>
                                  <th>{t.total}</th>
                                  <th>{t.status}</th>
                                  <th>Date</th>
                                  <th>{t.actions}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {quotes.length === 0 ? (
                                  <tr><td colSpan={6}>{t.noData}</td></tr>
                                ) : (
                                  quotes.map((q) => {
                                    const qStatus =
                                      q.balanceDue <= 0
                                        ? 'PAID'
                                        : q.amountPaid > 0
                                          ? 'PARTIALLY_PAID'
                                          : 'OPEN';
                                    return (
                                      <tr key={q.id} className={selectedQuote?.id === q.id ? 'table-active' : ''}>
                                        <td>{q.quoteNumber}</td>
                                        <td>{q.customer}</td>
                                        <td>{currencySymbol(q.currency)}{money(q.total)}</td>
                                        <td><span className={`farma-status-pill ${statusClass(qStatus)}`}>{statusLabel(qStatus)}</span></td>
                                        <td>{dateShort(q.quoteDate || q.createdAt)}</td>
                                        <td className="d-flex gap-1">
                                          <button
                                            type="button"
                                            className="btn btn-sm farma-btn-ghost farma-action-view"
                                            onClick={() => openQuoteView(q.id)}
                                          >
                                            {t.view}
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-sm farma-btn-ghost"
                                            onClick={() => downloadQuotePdf(q)}
                                          >
                                            {t.downloadPdf}
                                          </button>
                                          <button
                                            type="button"
                                            className="btn btn-sm farma-btn-ghost farma-action-delete"
                                            onClick={() => deleteQuote(q.id)}
                                          >
                                            {t.delete}
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="col-12">
                          <div className="farma-card">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h3 className="farma-form-title mb-0">{t.quotePreview}</h3>
                              {selectedQuote ? (
                                <button
                                  type="button"
                                  className="btn btn-sm farma-btn-ghost"
                                  onClick={() => downloadQuotePdf(selectedQuote)}
                                >
                                  {t.downloadPdf}
                                </button>
                              ) : null}
                            </div>
                            {selectedQuote ? (
                              <div className="farma-invoice">
                                <div className="fw-semibold">{companyProfile.companyName || 'Haytazentavo'}</div>
                                <div className="small farma-muted">{companyProfile.address || '-'}, {companyProfile.country || '-'}</div>
                                <div className="small farma-muted">{t.phone}: {companyProfile.phone || '-'}</div>
                                <div className="small farma-muted">{t.ruc}: {companyProfile.ruc || '-'}</div>
                                <hr className="my-2" />
                                <div className="small"><b>{t.quoteNo}:</b> {selectedQuote.quoteNumber}</div>
                                <div className="small"><b>Date:</b> {dateShort(selectedQuote.quoteDate || selectedQuote.createdAt)}</div>
                                <div className="small"><b>{t.customer}:</b> {selectedQuote.customer}</div>
                                <div className="small"><b>{t.employee}:</b> {selectedQuote.employeeName || '-'}</div>
                                <div className="small"><b>{t.paymentMethod}:</b> {paymentMethodLabel(selectedQuote.paymentMethod)}</div>
                                <div className="small"><b>{t.subtotal}:</b> {currencySymbol(selectedQuote.currency)}{money(selectedQuote.subtotal)}</div>
                                <div className="small"><b>{t.discount}:</b> {currencySymbol(selectedQuote.currency)}{money(selectedQuote.discount)}</div>
                                <div className="small"><b>{t.tax}:</b> {currencySymbol(selectedQuote.currency)}{money(selectedQuote.tax)}</div>
                                <div className="small"><b>{t.total}:</b> {currencySymbol(selectedQuote.currency)}{money(selectedQuote.total)}</div>
                                <div className="small"><b>{t.amountPaid}:</b> {currencySymbol(selectedQuote.currency)}{money(selectedQuote.amountPaid)}</div>
                                <div className="small"><b>Balance:</b> {currencySymbol(selectedQuote.currency)}{money(selectedQuote.balanceDue)}</div>
                                <div className="small mt-2 mb-1"><b>{t.quoteItems}</b></div>
                                <div className="farma-mini-list mb-2">
                                  {selectedQuote.items.map((item, idx) => (
                                    <div key={`${item.productId}-${idx}`} className="farma-mini-row">
                                      <span>{item.productName} x {item.quantity}</span>
                                      <span>{currencySymbol(selectedQuote.currency)}{money(item.lineTotal)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="small farma-muted">{t.noData}</div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {activeMenu === 'customers' ? (
                  <div className="row g-3">
                    <div className="col-xl-5">
                      <FormCard title={t.addCustomer}>
                        <Field label={t.firstName} value={customerForm.firstName} onChange={(v) => setCustomerForm({ ...customerForm, firstName: v })} />
                        <Field label={t.lastName} value={customerForm.lastName} onChange={(v) => setCustomerForm({ ...customerForm, lastName: v })} />
                        <Field label={t.phone} value={customerForm.phone} onChange={(v) => setCustomerForm({ ...customerForm, phone: v })} />
                        <button type="button" className="btn farma-btn w-100" onClick={saveCustomer}>{t.saveCustomer}</button>
                      </FormCard>
                    </div>
                    <div className="col-xl-7">
                      <DataList title={t.customers} empty={t.noData} rows={customers.map((c) => `${c.firstName} ${c.lastName}${c.phone ? ` · ${c.phone}` : ''}`)} />
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'suppliers' ? (
                  <div className="row g-3">
                    <div className="col-xl-5">
                      <FormCard title={t.addSupplier}>
                        <Field label={t.name} value={supplierForm.name} onChange={(v) => setSupplierForm({ ...supplierForm, name: v })} />
                        <Field label={t.contact} value={supplierForm.contactName} onChange={(v) => setSupplierForm({ ...supplierForm, contactName: v })} />
                        <Field label={t.phone} value={supplierForm.phone} onChange={(v) => setSupplierForm({ ...supplierForm, phone: v })} />
                        <button type="button" className="btn farma-btn w-100" onClick={saveSupplier}>{t.saveSupplier}</button>
                      </FormCard>
                    </div>
                    <div className="col-xl-7">
                      <DataList title={t.suppliers} empty={t.noData} rows={suppliers.map((s) => `${s.name}${s.contactName ? ` · ${s.contactName}` : ''}${s.phone ? ` · ${s.phone}` : ''}`)} />
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'receivables' ? (
                  <div className="row g-3">
                    <div className="col-12 col-xl-4">
                      <div className="farma-card h-100">
                        <h3 className="farma-form-title mb-2">{t.agingReceivables}</h3>
                        <div className="farma-mini-list">
                          <div className="farma-mini-row"><span>{t.current}</span><b>C${money(receivableAging.current)}</b></div>
                          <div className="farma-mini-row"><span>{t.days1to30}</span><b>C${money(receivableAging.days1to30)}</b></div>
                          <div className="farma-mini-row"><span>{t.days31to60}</span><b>C${money(receivableAging.days31to60)}</b></div>
                          <div className="farma-mini-row"><span>{t.days61plus}</span><b>C${money(receivableAging.days61plus)}</b></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-xl-8">
                      <TableCard
                        title={t.receivables}
                        headers={[t.customer, 'Balance', t.creditTerm, 'Status']}
                        rows={receivables.map((r) => [
                          `${r.customer?.firstName ?? '-'} ${r.customer?.lastName ?? ''}`.trim(),
                          `C$${money(r.balance)}`,
                          dateShort(r.dueDate),
                          r.status ?? '-'
                        ])}
                        empty={t.noData}
                      />
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'payables' ? (
                  <div className="row g-3">
                    <div className="col-xl-5">
                      <FormCard title={t.registerPurchase}>
                        <SelectField label={t.supplier} value={purchaseForm.supplierId} onChange={(v) => setPurchaseForm({ ...purchaseForm, supplierId: v })} options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
                        <SelectField label={t.product} value={purchaseForm.productId} onChange={(v) => setPurchaseForm({ ...purchaseForm, productId: v })} options={catalog.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
                        <Field label={t.batch} value={purchaseForm.batchNumber} onChange={(v) => setPurchaseForm({ ...purchaseForm, batchNumber: v })} />
                        <Field label={t.quantity} value={purchaseForm.quantity} onChange={(v) => setPurchaseForm({ ...purchaseForm, quantity: v })} />
                        <Field label={t.cost} value={purchaseForm.unitCost} onChange={(v) => setPurchaseForm({ ...purchaseForm, unitCost: v })} />
                        <Field label={t.salePrice} value={purchaseForm.unitPrice} onChange={(v) => setPurchaseForm({ ...purchaseForm, unitPrice: v })} />
                        <SelectField label={t.employee} value={purchaseForm.employeeId} onChange={(v) => setPurchaseForm({ ...purchaseForm, employeeId: v })} options={[{ value: '', label: '-' }, ...employees.map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}` }))]} />
                        <SelectField label={t.paymentMethod} value={purchaseForm.paymentMethod} onChange={(v) => setPurchaseForm({ ...purchaseForm, paymentMethod: v as PaymentMethod })} options={[{ value: 'CASH', label: t.cash }, { value: 'CREDIT', label: t.credit }]} />
                        {purchaseForm.paymentMethod === 'CREDIT' ? <SelectField label={t.creditTerm} value={purchaseForm.creditTermDays} onChange={(v) => setPurchaseForm({ ...purchaseForm, creditTermDays: v as CreditTermDays })} options={[{ value: 'DAYS_15', label: t.days15 }, { value: 'DAYS_30', label: t.days30 }, { value: 'DAYS_45', label: t.days45 }, { value: 'DAYS_60', label: t.days60 }]} /> : null}
                        <Field label={t.amountPaid} value={purchaseForm.amountPaid} onChange={(v) => setPurchaseForm({ ...purchaseForm, amountPaid: v })} />
                        <button type="button" className="btn farma-btn w-100" onClick={savePurchase}>{t.savePurchase}</button>
                      </FormCard>
                    </div>
                    <div className="col-xl-7">
                      <TableCard
                        title={t.payables}
                        headers={[t.supplier, t.amountPaid, t.creditTerm, 'Status']}
                        rows={payables.map((p) => [p.supplier?.name ?? '-', `$${money(p.balance)}`, dateShort(p.dueDate), p.status ?? '-'])}
                        empty={t.noData}
                      />
                    </div>
                    <div className="col-12">
                      <div className="row g-3">
                        <div className="col-12 col-xl-5">
                          <div className="farma-card h-100">
                            <h3 className="farma-form-title mb-2">{t.agingPayables}</h3>
                            <div className="farma-mini-list">
                              <div className="farma-mini-row"><span>{t.current}</span><b>C${money(payableAging.current)}</b></div>
                              <div className="farma-mini-row"><span>{t.days1to30}</span><b>C${money(payableAging.days1to30)}</b></div>
                              <div className="farma-mini-row"><span>{t.days31to60}</span><b>C${money(payableAging.days31to60)}</b></div>
                              <div className="farma-mini-row"><span>{t.days61plus}</span><b>C${money(payableAging.days61plus)}</b></div>
                            </div>
                          </div>
                        </div>
                        <div className="col-12 col-xl-7">
                          <TableCard
                            title={t.topSuppliers}
                            headers={[t.supplier, t.purchasesAmount, t.receiptsCount, 'Balance']}
                            rows={topSuppliersReport.map((row) => [
                              row.supplier,
                              `C$${money(row.total)}`,
                              String(row.receipts),
                              `C$${money(row.balance)}`
                            ])}
                            empty={t.noData}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'expenses' ? (
                  <div className="row g-3">
                    <div className="col-xl-5">
                      <FormCard title={t.registerExpense}>
                        <Field label={t.category} value={expenseForm.category} onChange={(v) => setExpenseForm({ ...expenseForm, category: v })} />
                        <Field label={t.description} value={expenseForm.description} onChange={(v) => setExpenseForm({ ...expenseForm, description: v })} />
                        <Field label={t.cost} value={expenseForm.amount} onChange={(v) => setExpenseForm({ ...expenseForm, amount: v })} />
                        <SelectField label={t.paymentMethod} value={expenseForm.paymentMethod} onChange={(v) => setExpenseForm({ ...expenseForm, paymentMethod: v as PaymentMethod })} options={[{ value: 'CASH', label: t.cash }, { value: 'CREDIT', label: t.credit }]} />
                        <button type="button" className="btn farma-btn w-100" onClick={saveExpense}>{t.saveExpense}</button>
                      </FormCard>
                    </div>
                    <div className="col-xl-7">
                      <TableCard
                        title={t.expenses}
                        headers={[t.category, t.description, t.cost, t.paymentMethod]}
                        rows={expenses.map((e) => [e.category, e.description ?? '-', `$${money(e.amount)}`, e.paymentMethod ?? '-'])}
                        empty={t.noData}
                      />
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'reports' ? (
                  <div className="row g-3">
                    <div className="col-12 col-xl-4">
                      <label className="form-label farma-label">{t.reportPeriod}</label>
                      <input
                        type="month"
                        className="form-control form-control-sm farma-input"
                        value={reportPeriod}
                        onChange={(e) => setReportPeriod(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-xl-8 d-flex flex-wrap gap-2 align-items-end justify-content-xl-end">
                      <button type="button" className="btn btn-sm farma-btn-ghost" onClick={refresh}>
                        {t.update}
                      </button>
                      <div className="small farma-muted me-2">{t.currentPeriod}: {reportPeriod}</div>
                    </div>
                    <div className="col-12 d-flex flex-wrap gap-2 justify-content-end">
                      <button type="button" className="btn btn-sm farma-btn-ghost" onClick={exportReportsCsv}>{t.exportCsv}</button>
                      <button type="button" className="btn btn-sm farma-btn-ghost" onClick={exportReportsExcel}>{t.exportExcel}</button>
                    </div>
                    <div className="col-12">
                      <TableCard
                        title={t.reports}
                        headers={[t.productId, t.quantity, 'Total']}
                        rows={topProducts.map((r) => [r.productId, money(r._sum?.quantity), `$${money(r._sum?.lineTotal)}`])}
                        empty={t.noData}
                      />
                    </div>
                    <div className="col-12 col-xl-4">
                      <div className="farma-card h-100">
                        <h3 className="farma-form-title mb-2">{t.overviewKpis}</h3>
                        <div className="farma-mini-list">
                          <div className="farma-mini-row"><span>{t.salesAmount}</span><b>C${money(periodSalesTotal)}</b></div>
                          <div className="farma-mini-row"><span>{t.purchasesAmount}</span><b>C${money(periodPurchasesTotal)}</b></div>
                          <div className="farma-mini-row"><span>{t.expenses}</span><b>C${money(periodExpensesTotal)}</b></div>
                          <div className="farma-mini-row"><span>{t.netFlow}</span><b>C${money(periodNetFlow)}</b></div>
                        </div>
                      </div>
                    </div>
                    <div className="col-12 col-xl-8">
                      <TableCard
                        title={t.employeePerformance}
                        headers={[t.employee, t.salesAmount, t.invoicesCount, 'Collected']}
                        rows={employeePerformanceRows.map((row) => [
                          row.employee,
                          `C$${money(row.sales)}`,
                          String(row.invoices),
                          `C$${money(row.collected)}`
                        ])}
                        empty={t.noData}
                      />
                    </div>
                    <div className="col-12 col-xl-6">
                      <TableCard
                        title={t.lowStockAlerts}
                        headers={[t.sku, t.product, t.quantity, t.reorderPoint]}
                        rows={lowStockAlerts.map((row) => [
                          row.sku,
                          row.name,
                          String(row.stock),
                          String(row.reorderPoint)
                        ])}
                        empty={t.noData}
                      />
                    </div>
                    <div className="col-12 col-xl-6">
                      <TableCard
                        title={t.expiringLots}
                        headers={[t.product, t.batch, t.daysLeft, t.quantity]}
                        rows={lotExpiryAlerts.map((row) => [
                          `${row.productName} (${row.sku})`,
                          row.batchNumber,
                          String(row.daysLeft),
                          String(row.remainingQty)
                        ])}
                        empty={t.noData}
                      />
                    </div>
                  </div>
                ) : null}

                {activeMenu === 'settings' ? (
                  <div className="row g-3">
                    <div className="col-xl-4">
                      <FormCard title={t.companyConfig}>
                        <Field label={t.name} value={companyForm.companyName ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, companyName: v })} />
                        <Field label={t.ownerName} value={companyForm.ownerName ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, ownerName: v })} />
                        <Field label={t.address} value={companyForm.address ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, address: v })} />
                        <Field label={t.country} value={companyForm.country ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, country: v })} />
                        <Field label={t.phone} value={companyForm.phone ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, phone: v })} />
                        <Field label={t.ruc} value={companyForm.ruc ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, ruc: v })} />
                        <Field label={t.ownerPhone} value={companyForm.ownerPhone ?? ''} onChange={(v) => setCompanyForm({ ...companyForm, ownerPhone: v })} />
                        <Field label={t.taxRate} value={String(companyForm.defaultTaxRate ?? 0)} onChange={(v) => setCompanyForm({ ...companyForm, defaultTaxRate: v })} />
                        <button type="button" className="btn farma-btn w-100" onClick={saveCompanyConfig}>{t.saveCompanyConfig}</button>
                      </FormCard>
                    </div>
                    <div className="col-xl-4">
                      <FormCard title={t.addEmployee}>
                        <Field label={t.firstName} value={employeeForm.firstName} onChange={(v) => setEmployeeForm({ ...employeeForm, firstName: v })} />
                        <Field label={t.lastName} value={employeeForm.lastName} onChange={(v) => setEmployeeForm({ ...employeeForm, lastName: v })} />
                        <Field label={t.role} value={employeeForm.role} onChange={(v) => setEmployeeForm({ ...employeeForm, role: v })} />
                        <Field label={t.phone} value={employeeForm.phone} onChange={(v) => setEmployeeForm({ ...employeeForm, phone: v })} />
                        <button type="button" className="btn farma-btn w-100" onClick={saveEmployee}>{t.saveEmployee}</button>
                      </FormCard>
                    </div>
                    <div className="col-xl-4">
                      <DataList title={t.employees} empty={t.noData} rows={employees.map((e) => `${e.firstName} ${e.lastName} · ${e.role}`)} />
                    </div>
                  </div>
                ) : null}

                <div className="small mt-3 farma-muted">{note}</div>
              </div>
            </div>

            {viewQuote ? (
              <div className="farma-modal-overlay">
                <div className="farma-modal-card">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="farma-form-title mb-0">{t.quotePreview}</h3>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="btn btn-sm farma-btn-ghost"
                        onClick={() => downloadQuotePdf(viewQuote)}
                      >
                        {t.downloadPdf}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm farma-btn-ghost"
                        onClick={() => setViewQuoteId('')}
                      >
                        {t.back}
                      </button>
                    </div>
                  </div>
                  <div className="farma-invoice">
                    <div className="fw-semibold">{companyProfile.companyName || 'Haytazentavo'}</div>
                    <div className="small farma-muted">{companyProfile.address || '-'}, {companyProfile.country || '-'}</div>
                    <div className="small farma-muted">{t.phone}: {companyProfile.phone || '-'}</div>
                    <div className="small farma-muted">{t.ruc}: {companyProfile.ruc || '-'}</div>
                    <hr className="my-2" />
                    <div className="small"><b>{t.quoteNo}:</b> {viewQuote.quoteNumber}</div>
                    <div className="small"><b>Date:</b> {dateShort(viewQuote.quoteDate || viewQuote.createdAt)}</div>
                    <div className="small"><b>{t.customer}:</b> {viewQuote.customer}</div>
                    <div className="small"><b>{t.employee}:</b> {viewQuote.employeeName || '-'}</div>
                    <div className="small"><b>{t.paymentMethod}:</b> {paymentMethodLabel(viewQuote.paymentMethod)}</div>
                    <div className="small"><b>{t.subtotal}:</b> {currencySymbol(viewQuote.currency)}{money(viewQuote.subtotal)}</div>
                    <div className="small"><b>{t.discount}:</b> {currencySymbol(viewQuote.currency)}{money(viewQuote.discount)}</div>
                    <div className="small"><b>{t.tax}:</b> {currencySymbol(viewQuote.currency)}{money(viewQuote.tax)}</div>
                    <div className="small"><b>{t.total}:</b> {currencySymbol(viewQuote.currency)}{money(viewQuote.total)}</div>
                    <div className="small"><b>{t.amountPaid}:</b> {currencySymbol(viewQuote.currency)}{money(viewQuote.amountPaid)}</div>
                    <div className="small"><b>Balance:</b> {currencySymbol(viewQuote.currency)}{money(viewQuote.balanceDue)}</div>
                    <div className="small mt-2 mb-1"><b>{t.quoteItems}</b></div>
                    <div className="farma-mini-list mb-2">
                      {viewQuote.items.map((item, idx) => (
                        <div key={`${viewQuote.id}-${item.productId}-${idx}`} className="farma-mini-row">
                          <span>{item.productName} x {item.quantity}</span>
                          <span>{currencySymbol(viewQuote.currency)}{money(item.lineTotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}

function Sidebar({
  menu,
  activeMenu,
  invoiceSubmenuOpen,
  invoiceSection,
  t,
  onChange,
  onInvoiceSection,
  onSettings
}: {
  menu: Array<{ key: MenuKey; label: string }>;
  activeMenu: MenuKey;
  invoiceSubmenuOpen: boolean;
  invoiceSection: InvoiceSection;
  t: Dict;
  onChange: (k: MenuKey) => void;
  onInvoiceSection: (s: InvoiceSection) => void;
  onSettings: () => void;
}) {
  return (
    <div className="farma-sidebar h-100 p-3">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="farma-logo" />
        <span className="fw-semibold fs-5">Farma</span>
      </div>
      <div className="farma-menu d-flex flex-column gap-1">
        {menu.map((item) =>
          item.key === 'invoices' ? (
            <div key={item.key}>
              <button
                type="button"
                className={`farma-menu-item ${activeMenu === 'invoices' ? 'active' : ''}`}
                onClick={() => onChange('invoices')}
              >
                <span className="farma-menu-icon">{menuIcons[item.key]}</span>
                <span>{item.label}</span>
                <span className="ms-auto">{invoiceSubmenuOpen ? '▾' : '▸'}</span>
              </button>
              {invoiceSubmenuOpen ? (
                <>
                  <button type="button" className={`farma-menu-subitem ${invoiceSection === 'current' ? 'active' : ''}`} onClick={() => onInvoiceSection('current')}>
                    <span>{t.currentInvoice}</span>
                  </button>
                  <button type="button" className={`farma-menu-subitem ${invoiceSection === 'open' ? 'active' : ''}`} onClick={() => onInvoiceSection('open')}>
                    <span>{t.openInvoices}</span>
                  </button>
                  <button type="button" className={`farma-menu-subitem ${invoiceSection === 'past' ? 'active' : ''}`} onClick={() => onInvoiceSection('past')}>
                    <span>{t.pastInvoices}</span>
                  </button>
                  <button type="button" className={`farma-menu-subitem ${invoiceSection === 'quotes' ? 'active' : ''}`} onClick={() => onInvoiceSection('quotes')}>
                    <span>{t.quotes}</span>
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <button
              key={item.key}
              type="button"
              className={`farma-menu-item ${activeMenu === item.key ? 'active' : ''}`}
              onClick={() => onChange(item.key)}
            >
              <span className="farma-menu-icon">{menuIcons[item.key]}</span>
              <span>{item.label}</span>
            </button>
          )
        )}
      </div>
      <button type="button" className={`farma-menu-item mt-3 ${activeMenu === 'settings' ? 'active' : ''}`} onClick={onSettings}>
        <span className="farma-menu-icon">{menuIcons.settings}</span>
        <span>{t.settings}</span>
      </button>
    </div>
  );
}

function Metric({ title, value, note }: { title: string; value: string; note: string }) {
  return (
    <div className="col">
      <div className="farma-card h-100">
        <div className="farma-card-title">{title}</div>
        <div className="farma-card-value">{value}</div>
        <div className="farma-card-note">{note}</div>
      </div>
    </div>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="farma-card h-100">
      <h3 className="farma-form-title mb-2">{title}</h3>
      {children}
    </div>
  );
}

function DataList({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <div className="farma-card h-100">
      <h3 className="farma-form-title mb-2">{title}</h3>
      <div className="farma-mini-list">
        {rows.length === 0 ? <div className="farma-mini-row">{empty}</div> : rows.map((r) => <div key={r} className="farma-mini-row">{r}</div>)}
      </div>
    </div>
  );
}

function TableCard({ title, headers, rows, empty }: { title: string; headers: string[]; rows: string[][]; empty: string }) {
  return (
    <div className="farma-card p-0 overflow-auto">
      <div className="px-3 pt-3"><h3 className="farma-form-title mb-2">{title}</h3></div>
      <table className="table table-sm mb-0 farma-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? <tr><td colSpan={headers.length}>{empty}</td></tr> : rows.map((r, i) => <tr key={`${r.join('-')}-${i}`}>{r.map((c, idx) => <td key={`${i}-${idx}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="mb-2">
      <label className="form-label farma-label">{label}</label>
      <input className="form-control form-control-sm farma-input" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function CustomerAutocompleteField({
  label,
  value,
  onChange,
  options,
  onSelect,
  emptyText
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; meta?: string }>;
  onSelect: (value: string) => void;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const hasQuery = value.trim().length > 0;

  return (
    <div className="mb-2 position-relative farma-autocomplete">
      <label className="form-label farma-label">{label}</label>
      <input
        className="form-control form-control-sm farma-input"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && options[0]) {
            event.preventDefault();
            onSelect(options[0].value);
            setOpen(false);
          }
        }}
      />

      {open && hasQuery ? (
        <div className="farma-autocomplete-menu">
          {options.length === 0 ? (
            <div className="farma-autocomplete-empty">{emptyText}</div>
          ) : (
            options.map((option) => (
              <button
                key={`${option.value}-${option.label}`}
                type="button"
                className="farma-autocomplete-item"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.meta ? <small>{option.meta}</small> : null}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="mb-2">
      <label className="form-label farma-label">{label}</label>
      <select className="form-select form-select-sm farma-input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">-</option>
        {options.map((opt) => (
          <option key={`${opt.value}-${opt.label}`} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
