import { MessageSquare } from "lucide-react";
import { GlassCard, SectionHeader } from "@/components/shared/styled-components";

export function NotesSection() {
  return (
    <GlassCard>
      <SectionHeader icon={MessageSquare} title="Ghi chú" />
      <div className="p-5">
        <textarea
          rows={4}
          className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none transition-all"
          placeholder="Nhập ghi chú..."
        />
      </div>
    </GlassCard>
  );
}
