// Dispatch Feature Hook
// Combines store state with API actions

import { useCallback } from 'react'
import { useDispatchStore, getDisplayStatus } from '../store/dispatchStore'
import { dispatchApi } from '../api/dispatchApi'
import type {
  DispatchInput,
  DispatchFilters,
  PassengerDropInput,
  PermitInput,
  PaymentInput,
  DepartureOrderInput,
  ExitInput,
  DisplayStatus,
} from '../types'

export function useDispatch() {
  const {
    records,
    selectedRecord,
    activeTab,
    setRecords,
    setSelectedRecord,
    setActiveTab,
    updateRecord,
    replaceRecord,
    addRecord,
    removeRecord,
  } = useDispatchStore()

  // Fetch all records
  const fetchRecords = useCallback(async (filters?: DispatchFilters) => {
    const data = await dispatchApi.getAll(filters)
    setRecords(data)
    return data
  }, [setRecords])

  // Fetch single record
  const fetchRecord = useCallback(async (id: string) => {
    const data = await dispatchApi.getById(id)
    replaceRecord(data)
    return data
  }, [replaceRecord])

  // Create new entry
  const createEntry = useCallback(async (input: DispatchInput) => {
    const record = await dispatchApi.create(input)
    addRecord(record)
    return record
  }, [addRecord])

  // Process passenger drop
  const processPassengerDrop = useCallback(async (id: string, input: PassengerDropInput) => {
    const record = await dispatchApi.recordPassengerDrop(id, input)
    replaceRecord(record)
    return record
  }, [replaceRecord])

  // Issue permit
  const issuePermit = useCallback(async (id: string, input: PermitInput) => {
    const record = await dispatchApi.issuePermit(id, input)
    replaceRecord(record)
    return record
  }, [replaceRecord])

  // Process payment
  const processPayment = useCallback(async (id: string, input: PaymentInput) => {
    const record = await dispatchApi.processPayment(id, input)
    replaceRecord(record)
    return record
  }, [replaceRecord])

  // Issue departure order
  const issueDepartureOrder = useCallback(async (id: string, input: DepartureOrderInput) => {
    const record = await dispatchApi.issueDepartureOrder(id, input)
    replaceRecord(record)
    return record
  }, [replaceRecord])

  // Process exit
  const processExit = useCallback(async (id: string, input?: ExitInput) => {
    const record = await dispatchApi.recordExit(id, input)
    replaceRecord(record)
    return record
  }, [replaceRecord])

  // Bulk exit
  const processBulkExit = useCallback(async (ids: string[], input?: ExitInput) => {
    const records = await dispatchApi.bulkExit(ids, input)
    records.forEach(replaceRecord)
    return records
  }, [replaceRecord])

  // Delete record
  const deleteRecord = useCallback(async (id: string) => {
    await dispatchApi.delete(id)
    removeRecord(id)
  }, [removeRecord])

  // Filter records by display status
  const getRecordsByStatus = useCallback((status: DisplayStatus) => {
    return records.filter((r) => getDisplayStatus(r.currentStatus) === status)
  }, [records])

  // Get filtered records based on active tab
  const getFilteredRecords = useCallback(() => {
    if (activeTab === 'all') return records
    return records.filter((r) => getDisplayStatus(r.currentStatus) === activeTab)
  }, [records, activeTab])

  return {
    // State
    records,
    selectedRecord,
    activeTab,

    // Setters
    setSelectedRecord,
    setActiveTab,
    updateRecord,

    // API Actions
    fetchRecords,
    fetchRecord,
    createEntry,
    processPassengerDrop,
    issuePermit,
    processPayment,
    issueDepartureOrder,
    processExit,
    processBulkExit,
    deleteRecord,

    // Utilities
    getRecordsByStatus,
    getFilteredRecords,
    getDisplayStatus,
  }
}
