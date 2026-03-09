import { useState, useRef } from "react";
import { Camera, Upload, Car, X, Loader2, Image } from "lucide-react";
import { toast } from "react-toastify";
import { GlassCard, SectionHeader } from "@/components/shared/styled-components";
import api from "@/lib/api";
import { prepareImageForUpload } from "@/lib/image-compression";

interface VehicleImageSectionProps {
  vehicleImageUrl?: string | null;
  entryImageUrl?: string | null;
  dispatchId: string;
  onEntryImageUpdated?: (newUrl: string) => void;
}

export function VehicleImageSection({
  vehicleImageUrl,
  entryImageUrl,
  dispatchId,
  onEntryImageUpdated,
}: VehicleImageSectionProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(entryImageUrl || null);
  const [activeTab, setActiveTab] = useState<"entry" | "vehicle">("entry");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh");
      return;
    }

    // Increased limit since compression will reduce size
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 10MB");
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Compress image client-side first
      setUploadStatus("Đang nén ảnh...");
      const { file: compressedFile, error } = await prepareImageForUpload(file);

      if (error) {
        toast.error(error);
        return;
      }

      // Step 2: Upload compressed image (server will further optimize)
      setUploadStatus("Đang tải lên...");
      const formData = new FormData();
      formData.append("image", compressedFile);

      const uploadResponse = await api.post<{ url: string }>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const imageUrl = uploadResponse.data.url;

      await api.patch(`/dispatch/${dispatchId}/entry-image`, {
        entryImageUrl: imageUrl,
      });

      setPreviewUrl(imageUrl);
      onEntryImageUpdated?.(imageUrl);
      toast.success("Đã cập nhật ảnh xe vào bến");
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error("Không thể upload ảnh. Vui lòng thử lại.");
    } finally {
      setIsUploading(false);
      setUploadStatus("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveEntryImage = async () => {
    if (!previewUrl) return;
    
    try {
      await api.patch(`/dispatch/${dispatchId}/entry-image`, {
        entryImageUrl: "",
      });
      setPreviewUrl(null);
      onEntryImageUpdated?.("");
      toast.success("Đã xóa ảnh xe vào bến");
    } catch (error) {
      console.error("Remove failed:", error);
      toast.error("Không thể xóa ảnh. Vui lòng thử lại.");
    }
  };

  const currentImage = activeTab === "entry" ? previewUrl : vehicleImageUrl;

  return (
    <GlassCard>
      <SectionHeader icon={Camera} title="Ảnh xe" />
      <div className="p-6">
        {/* Tab buttons - More prominent */}
        <div className="flex gap-3 mb-5">
          <button
            onClick={() => setActiveTab("entry")}
            className={`
              flex-1 px-5 py-3.5 rounded-xl font-bold text-base
              transition-all duration-200 flex items-center justify-center gap-3
              ${activeTab === "entry"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border-2 border-transparent"
              }
            `}
          >
            <Camera className="h-5 w-5" />
            Vào bến
          </button>
          <button
            onClick={() => setActiveTab("vehicle")}
            className={`
              flex-1 px-5 py-3.5 rounded-xl font-bold text-base
              transition-all duration-200 flex items-center justify-center gap-3
              ${activeTab === "vehicle"
                ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border-2 border-transparent"
              }
            `}
          >
            <Car className="h-5 w-5" />
            Đăng ký
          </button>
        </div>

        {/* Image display area - Enhanced */}
        <div className="relative aspect-video rounded-2xl bg-gradient-to-b from-gray-50 to-gray-100 border-2 border-dashed border-gray-300 overflow-hidden">
          {isUploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="p-4 rounded-2xl bg-blue-50 mb-4">
                <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-700 font-semibold text-lg">{uploadStatus || "Đang tải ảnh..."}</p>
            </div>
          ) : currentImage ? (
            <>
              <img
                src={currentImage}
                alt={activeTab === "entry" ? "Ảnh xe vào bến" : "Ảnh đăng ký xe"}
                className="w-full h-full object-cover"
              />
              {activeTab === "entry" && previewUrl && (
                <button
                  onClick={handleRemoveEntryImage}
                  className="
                    absolute top-3 right-3 p-2.5 
                    bg-gradient-to-r from-rose-500 to-red-500 text-white 
                    rounded-xl hover:from-rose-600 hover:to-red-600 
                    transition-all duration-200 shadow-xl shadow-rose-500/30
                    active:scale-95
                  "
                  title="Xóa ảnh"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="p-5 rounded-2xl bg-gray-200/50 mb-4">
                <Image className="h-14 w-14 text-gray-400" />
              </div>
              <p className="text-gray-500 font-semibold text-lg mb-2">
                {activeTab === "entry" ? "Chưa có ảnh vào bến" : "Chưa có ảnh đăng ký"}
              </p>
              <p className="text-gray-400 text-sm">
                {activeTab === "entry" ? "Tải ảnh lên để xác nhận xe vào bến" : "Ảnh đăng ký của xe"}
              </p>
            </div>
          )}
        </div>

        {/* Upload button (only for entry tab) - More prominent */}
        {activeTab === "entry" && (
          <div className="mt-5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="entry-image-upload"
            />
            <label
              htmlFor="entry-image-upload"
              className={`
                flex items-center justify-center gap-3 w-full px-6 py-4 rounded-xl 
                text-lg font-bold cursor-pointer transition-all duration-200
                ${isUploading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : previewUrl
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200"
                    : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40"
                }
              `}
            >
              <Upload className="h-6 w-6" />
              {previewUrl ? "Thay đổi ảnh" : "Tải ảnh lên"}
            </label>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
