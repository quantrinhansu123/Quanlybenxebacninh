import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface FormHeaderProps {
  isEditMode: boolean;
  isLoading: boolean;
  performPermitAfterEntry: boolean;
  onPerformPermitChange: (checked: boolean) => void;
  onClose: () => void;
}

export const FormHeader = memo(function FormHeader({
  isEditMode,
  isLoading,
  performPermitAfterEntry,
  onPerformPermitChange,
  onClose,
}: FormHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-5 border-b">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? "Sửa thông tin điều độ" : "Cho xe vào bến"}
        </h1>
        {!isEditMode && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="performPermitAfterEntry"
              checked={performPermitAfterEntry}
              onChange={(e) => onPerformPermitChange(e.target.checked)}
            />
            <Label htmlFor="performPermitAfterEntry" className="cursor-pointer text-sm font-medium">
              Thực hiện Cấp phép lên nốt sau khi Cho xe vào bến
            </Label>
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
          className="text-blue-600 border-blue-600 hover:bg-blue-50 px-6"
        >
          HỦY
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 px-6"
        >
          {isLoading ? "Đang xử lý..." : "XÁC NHẬN"}
        </Button>
      </div>
    </div>
  );
});
