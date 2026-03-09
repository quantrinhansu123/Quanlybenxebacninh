import { Request, Response } from 'express'
import { z } from 'zod'
import { invoiceRepository } from '../modules/invoice/invoice.repository.js'

const invoiceSchema = z.object({
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  dispatchRecordId: z.string().uuid().optional(),
  operatorId: z.string().uuid('Invalid operator ID'),
  issueDate: z.string().min(1, 'Issue date is required'),
  dueDate: z.string().optional(),
  subtotal: z.number().nonnegative('Subtotal must be non-negative'),
  taxAmount: z.number().nonnegative('Tax amount must be non-negative').default(0),
  totalAmount: z.number().nonnegative('Total amount must be non-negative'),
  notes: z.string().optional(),
})

export const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const { operatorId, paymentStatus, startDate, endDate } = req.query

    const invoices = await invoiceRepository.findAllWithRelations({
      operatorId: operatorId as string | undefined,
      paymentStatus: paymentStatus as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
    })

    return res.json(invoices)
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return res.status(500).json({ error: 'Failed to fetch invoices' })
  }
}

export const getInvoiceById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const invoice = await invoiceRepository.findByIdWithRelations(id)

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    return res.json(invoice)
  } catch (error) {
    console.error('Error fetching invoice:', error)
    return res.status(500).json({ error: 'Failed to fetch invoice' })
  }
}

export const createInvoice = async (req: Request, res: Response) => {
  try {
    const validated = invoiceSchema.parse(req.body)

    const invoice = await invoiceRepository.createFromAPI({
      invoiceNumber: validated.invoiceNumber,
      dispatchRecordId: validated.dispatchRecordId,
      operatorId: validated.operatorId,
      issueDate: validated.issueDate,
      dueDate: validated.dueDate,
      subtotal: validated.subtotal,
      taxAmount: validated.taxAmount,
      totalAmount: validated.totalAmount,
      notes: validated.notes,
    })

    return res.status(201).json(invoice)
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Invoice with this number already exists' })
    }
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to create invoice' })
  }
}

export const updateInvoice = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const validated = invoiceSchema.partial().parse(req.body)

    const invoice = await invoiceRepository.updateById(id, validated)

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    return res.json(invoice)
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors[0].message })
    }
    return res.status(500).json({ error: error.message || 'Failed to update invoice' })
  }
}

export const updateInvoicePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { paymentStatus, paymentDate } = req.body

    if (!paymentStatus || !['pending', 'paid', 'overdue', 'cancelled'].includes(paymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status' })
    }

    const invoice = await invoiceRepository.updatePaymentStatus(
      id,
      paymentStatus,
      paymentDate
    )

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' })
    }

    return res.json(invoice)
  } catch (error: any) {
    console.error('Error updating invoice payment:', error)
    return res.status(500).json({ error: error.message || 'Failed to update invoice payment' })
  }
}
