// Dispatch Feature Store

import { create } from 'zustand'
import type { DispatchRecord, DisplayStatus } from '../types'

// Map backend status to display status for UI
export function getDisplayStatus(status: string): DisplayStatus {
  switch (status) {
    case 'entered':
    case 'passengers_dropped':
    case 'permit_rejected':
      return 'in-station'
    case 'permit_issued':
      return 'permit-issued'
    case 'paid':
      return 'paid'
    case 'departure_ordered':
    case 'departed':
      return 'departed'
    default:
      return 'in-station'
  }
}

interface DispatchState {
  records: DispatchRecord[]
  selectedRecord: DispatchRecord | null
  activeTab: DisplayStatus | 'all'

  // Actions
  setRecords: (records: DispatchRecord[]) => void
  setSelectedRecord: (record: DispatchRecord | null) => void
  setActiveTab: (tab: DisplayStatus | 'all') => void
  updateRecord: (id: string, updates: Partial<DispatchRecord>) => void
  replaceRecord: (record: DispatchRecord) => void
  addRecord: (record: DispatchRecord) => void
  removeRecord: (id: string) => void
}

export const useDispatchStore = create<DispatchState>((set) => ({
  records: [],
  selectedRecord: null,
  activeTab: 'all',

  setRecords: (records) => set({ records }),

  setSelectedRecord: (selectedRecord) => set({ selectedRecord }),

  setActiveTab: (activeTab) => set({ activeTab }),

  updateRecord: (id, updates) =>
    set((state) => ({
      records: state.records.map((record) =>
        record.id === id ? { ...record, ...updates } : record
      ),
      selectedRecord:
        state.selectedRecord?.id === id
          ? { ...state.selectedRecord, ...updates }
          : state.selectedRecord,
    })),

  replaceRecord: (updatedRecord) =>
    set((state) => ({
      records: state.records.map((record) =>
        record.id === updatedRecord.id ? updatedRecord : record
      ),
      selectedRecord:
        state.selectedRecord?.id === updatedRecord.id
          ? updatedRecord
          : state.selectedRecord,
    })),

  addRecord: (newRecord) =>
    set((state) => ({
      records: [newRecord, ...state.records],
    })),

  removeRecord: (id) =>
    set((state) => ({
      records: state.records.filter((record) => record.id !== id),
      selectedRecord:
        state.selectedRecord?.id === id ? null : state.selectedRecord,
    })),
}))
