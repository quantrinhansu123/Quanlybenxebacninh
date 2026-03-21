import { create } from 'zustand'
import type { DispatchRecord, ScheduleDataSource } from '@/types'

// Display status type for UI tabs (different from backend status)
type DisplayStatus = "in-station" | "permit-issued" | "paid" | "departed"

interface DispatchState {
  records: DispatchRecord[]
  selectedRecord: DispatchRecord | null
  activeTab: DisplayStatus | 'all'
  /** Nguồn biểu đồ giờ khi vào bến (Điều độ) — đồng bộ header + form */
  scheduleDataSource: ScheduleDataSource
  setRecords: (records: DispatchRecord[]) => void
  setSelectedRecord: (record: DispatchRecord | null) => void
  setActiveTab: (tab: DisplayStatus | 'all') => void
  setScheduleDataSource: (source: ScheduleDataSource) => void
  updateRecord: (id: string, updates: Partial<DispatchRecord>) => void
  addRecord: (record: DispatchRecord) => void
}

export const useDispatchStore = create<DispatchState>((set) => ({
  records: [],
  selectedRecord: null,
  activeTab: 'all',
  scheduleDataSource: 'database',

  setRecords: (records) => set({ records }),
  
  setSelectedRecord: (record) => set({ selectedRecord: record }),
  
  setActiveTab: (tab) => set({ activeTab: tab }),

  setScheduleDataSource: (scheduleDataSource) => set({ scheduleDataSource }),

  updateRecord: (id, updates) =>
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    })),
  
  addRecord: (record) =>
    set((state) => ({
      records: [record, ...state.records],
    })),
}))

