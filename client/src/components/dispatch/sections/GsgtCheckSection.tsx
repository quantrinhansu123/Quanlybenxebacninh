import { Home, Globe, AlertTriangle, MapPin } from "lucide-react";
import { GlassCard, SectionHeader } from "@/components/shared/styled-components";

export function GsgtCheckSection() {
  return (
    <GlassCard>
      <SectionHeader icon={Globe} title="Kiểm tra GSHT" />
      <div className="p-5 space-y-3">
        {[
          { icon: Home, label: "(Chưa đăng nhập)" },
          { icon: Globe, label: "(Chưa đăng nhập)" },
          { icon: AlertTriangle, label: "(Chưa đăng nhập)" },
          { icon: MapPin, label: "(Chưa đăng nhập)" },
        ].map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 text-sm text-gray-500">
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
