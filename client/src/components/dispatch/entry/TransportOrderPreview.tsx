import { Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface TransportOrderPreviewProps {
  signAndTransmit: boolean;
  printDisplay: boolean;
  transportOrderDisplay: string | null;
  onSignAndTransmitChange: (checked: boolean) => void;
  onPrintDisplayChange: (checked: boolean) => void;
}

export function TransportOrderPreview({
  signAndTransmit,
  printDisplay,
  transportOrderDisplay,
  onSignAndTransmitChange,
  onPrintDisplayChange,
}: TransportOrderPreviewProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-6 pb-3 border-b">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="signAndTransmit"
            checked={signAndTransmit}
            onChange={(e) => onSignAndTransmitChange(e.target.checked)}
          />
          <Label htmlFor="signAndTransmit" className="cursor-pointer text-sm font-medium">
            Ký lệnh và truyền tải
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="printDisplay"
            checked={printDisplay}
            onChange={(e) => onPrintDisplayChange(e.target.checked)}
          />
          <Label htmlFor="printDisplay" className="cursor-pointer text-sm font-medium">
            In bản thể hiện
          </Label>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg bg-gray-50 min-h-[500px] flex items-center justify-center relative">
        {transportOrderDisplay ? (
          <div className="p-6 text-sm text-gray-700 w-full h-full">
            {transportOrderDisplay}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p className="text-base">Không có bản thể hiện</p>
          </div>
        )}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <Search className="h-6 w-6 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
