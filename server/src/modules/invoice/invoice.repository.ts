/**
 * Invoice Repository - Drizzle ORM Version
 * Handles all PostgreSQL operations for invoice records via Supabase
 */
import { invoices, operators } from '../../db/schema'
import { DrizzleRepository, eq, desc, and, gte, lte } from '../../shared/database/drizzle-repository'

// Infer types from schema
type Invoice = typeof invoices.$inferSelect
type NewInvoice = typeof invoices.$inferInsert

/**
 * Invoice API format (matching controller response format)
 */
export interface InvoiceAPI {
  id: string
  invoiceNumber: string | null
  dispatchRecordId: string | null
  operatorId: string | null
  operator?: {
    id: string
    name: string
    code: string
  }
  issueDate: string | null
  dueDate: string | null
  subtotal: number
  taxAmount: number
  totalAmount: number
  paymentStatus: string | null
  paymentDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Invoice Repository class - extends DrizzleRepository for common CRUD
 */
class DrizzleInvoiceRepository extends DrizzleRepository<
  typeof invoices,
  Invoice,
  NewInvoice
> {
  protected table = invoices
  protected idColumn = invoices.id

  /**
   * Map Drizzle Invoice to API format
   */
  private mapToAPI(
    invoice: Invoice,
    operator?: { id: string; name: string; code: string }
  ): InvoiceAPI {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      dispatchRecordId: invoice.dispatchRecordId,
      operatorId: invoice.operatorId,
      operator,
      issueDate: invoice.invoiceDate?.toISOString() ?? null,
      dueDate: null, // Not in schema, kept for API compatibility
      subtotal: parseFloat(invoice.subtotal ?? '0'),
      taxAmount: parseFloat(invoice.tax ?? '0'),
      totalAmount: parseFloat(invoice.totalAmount ?? '0'),
      paymentStatus: invoice.paymentStatus,
      paymentDate: invoice.paidAt?.toISOString() ?? null,
      notes: invoice.notes,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    }
  }

  /**
   * Find all invoices with related operator data
   */
  async findAllWithRelations(filters?: {
    operatorId?: string
    paymentStatus?: string
    startDate?: string
    endDate?: string
  }): Promise<InvoiceAPI[]> {
    const database = this.getDb()

    let query = database
      .select({
        // Invoice fields
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        dispatchRecordId: invoices.dispatchRecordId,
        operatorId: invoices.operatorId,
        invoiceDate: invoices.invoiceDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        totalAmount: invoices.totalAmount,
        paymentStatus: invoices.paymentStatus,
        paymentMethod: invoices.paymentMethod,
        paidAt: invoices.paidAt,
        notes: invoices.notes,
        status: invoices.status,
        isActive: invoices.isActive,
        metadata: invoices.metadata,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        // Operator fields
        operatorName: operators.name,
        operatorCode: operators.code,
      })
      .from(invoices)
      .leftJoin(operators, eq(invoices.operatorId, operators.id))
      .$dynamic()

    // Apply filters
    const conditions = []

    if (filters?.operatorId) {
      conditions.push(eq(invoices.operatorId, filters.operatorId))
    }

    if (filters?.paymentStatus) {
      conditions.push(eq(invoices.paymentStatus, filters.paymentStatus))
    }

    if (filters?.startDate) {
      conditions.push(gte(invoices.invoiceDate, new Date(filters.startDate)))
    }

    if (filters?.endDate) {
      conditions.push(lte(invoices.invoiceDate, new Date(filters.endDate)))
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any
    }

    const results = await query.orderBy(desc(invoices.invoiceDate))

    return results.map((row) => {
      const operator = row.operatorName
        ? {
            id: row.operatorId!,
            name: row.operatorName,
            code: row.operatorCode || '',
          }
        : undefined

      return this.mapToAPI(
        {
          id: row.id,
          firebaseId: null,
          dispatchRecordId: row.dispatchRecordId,
          operatorId: row.operatorId,
          invoiceNumber: row.invoiceNumber,
          invoiceDate: row.invoiceDate,
          subtotal: row.subtotal,
          tax: row.tax,
          totalAmount: row.totalAmount,
          paymentStatus: row.paymentStatus,
          paymentMethod: row.paymentMethod,
          paidAt: row.paidAt,
          notes: row.notes,
          status: row.status,
          isActive: row.isActive,
          metadata: row.metadata,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        operator
      )
    })
  }

  /**
   * Find invoice by ID with relations
   */
  async findByIdWithRelations(id: string): Promise<InvoiceAPI | null> {
    const database = this.getDb()

    const results = await database
      .select({
        // Invoice fields
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        dispatchRecordId: invoices.dispatchRecordId,
        operatorId: invoices.operatorId,
        invoiceDate: invoices.invoiceDate,
        subtotal: invoices.subtotal,
        tax: invoices.tax,
        totalAmount: invoices.totalAmount,
        paymentStatus: invoices.paymentStatus,
        paymentMethod: invoices.paymentMethod,
        paidAt: invoices.paidAt,
        notes: invoices.notes,
        status: invoices.status,
        isActive: invoices.isActive,
        metadata: invoices.metadata,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
        // Operator fields
        operatorName: operators.name,
        operatorCode: operators.code,
      })
      .from(invoices)
      .leftJoin(operators, eq(invoices.operatorId, operators.id))
      .where(eq(invoices.id, id))
      .limit(1)

    if (results.length === 0) return null

    const row = results[0]
    const operator = row.operatorName
      ? {
          id: row.operatorId!,
          name: row.operatorName,
          code: row.operatorCode || '',
        }
      : undefined

    return this.mapToAPI(
      {
        id: row.id,
        firebaseId: null,
        dispatchRecordId: row.dispatchRecordId,
        operatorId: row.operatorId,
        invoiceNumber: row.invoiceNumber,
        invoiceDate: row.invoiceDate,
        subtotal: row.subtotal,
        tax: row.tax,
        totalAmount: row.totalAmount,
        paymentStatus: row.paymentStatus,
        paymentMethod: row.paymentMethod,
        paidAt: row.paidAt,
        notes: row.notes,
        status: row.status,
        isActive: row.isActive,
        metadata: row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      operator
    )
  }

  /**
   * Find invoices by dispatch record ID
   */
  async findByDispatchId(dispatchRecordId: string): Promise<InvoiceAPI[]> {
    return this.findAllWithRelations({ dispatchRecordId } as any)
  }

  /**
   * Find invoices by operator ID
   */
  async findByOperator(operatorId: string): Promise<InvoiceAPI[]> {
    return this.findAllWithRelations({ operatorId })
  }

  /**
   * Find invoices by date range
   */
  async findByDateRange(startDate: string, endDate: string): Promise<InvoiceAPI[]> {
    return this.findAllWithRelations({ startDate, endDate })
  }

  /**
   * Create invoice with API data format
   */
  async createFromAPI(data: {
    invoiceNumber: string
    dispatchRecordId?: string
    operatorId: string
    issueDate: string
    dueDate?: string
    subtotal: number
    taxAmount: number
    totalAmount: number
    notes?: string
  }): Promise<InvoiceAPI> {
    const database = this.getDb()

    const [invoice] = await database
      .insert(invoices)
      .values({
        invoiceNumber: data.invoiceNumber,
        dispatchRecordId: data.dispatchRecordId || null,
        operatorId: data.operatorId,
        invoiceDate: new Date(data.issueDate),
        subtotal: data.subtotal.toString(),
        tax: data.taxAmount.toString(),
        totalAmount: data.totalAmount.toString(),
        paymentStatus: 'pending',
        notes: data.notes || null,
      })
      .returning()

    const result = await this.findByIdWithRelations(invoice.id)
    if (!result) {
      throw new Error('Failed to fetch created invoice')
    }

    return result
  }

  /**
   * Update invoice by ID with API data format
   */
  async updateById(
    id: string,
    data: {
      invoiceNumber?: string
      dispatchRecordId?: string
      operatorId?: string
      issueDate?: string
      dueDate?: string
      subtotal?: number
      taxAmount?: number
      totalAmount?: number
      notes?: string
    }
  ): Promise<InvoiceAPI | null> {
    const database = this.getDb()

    const updateData: Partial<NewInvoice> = {}

    if (data.invoiceNumber !== undefined) updateData.invoiceNumber = data.invoiceNumber
    if (data.dispatchRecordId !== undefined) updateData.dispatchRecordId = data.dispatchRecordId || null
    if (data.operatorId !== undefined) updateData.operatorId = data.operatorId
    if (data.issueDate !== undefined) updateData.invoiceDate = new Date(data.issueDate)
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal.toString()
    if (data.taxAmount !== undefined) updateData.tax = data.taxAmount.toString()
    if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount.toString()
    if (data.notes !== undefined) updateData.notes = data.notes || null

    await database
      .update(invoices)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))

    return this.findByIdWithRelations(id)
  }

  /**
   * Update invoice payment status
   */
  async updatePaymentStatus(
    id: string,
    paymentStatus: string,
    paymentDate?: string
  ): Promise<InvoiceAPI | null> {
    const database = this.getDb()

    const updateData: Partial<NewInvoice> = {
      paymentStatus,
      updatedAt: new Date(),
    }

    if (paymentStatus === 'paid' && paymentDate) {
      updateData.paidAt = new Date(paymentDate)
    } else if (paymentStatus !== 'paid') {
      updateData.paidAt = null
    }

    await database
      .update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))

    return this.findByIdWithRelations(id)
  }
}

// Export singleton instance
export const invoiceRepository = new DrizzleInvoiceRepository()

// Re-export types
export type { Invoice, NewInvoice }
export { DrizzleInvoiceRepository as InvoiceRepository }
