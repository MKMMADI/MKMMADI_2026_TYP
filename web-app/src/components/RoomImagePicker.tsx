import { useEffect, useState } from "react";
import { roomImageValidationMessage } from "@/lib/roomImages";

interface RoomImagePickerProps {
  imageUrl?: string | null;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  disabled?: boolean;
}

export default function RoomImagePicker({
  imageUrl,
  selectedFile,
  onFileChange,
  disabled = false,
}: RoomImagePickerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    if (typeof URL.createObjectURL !== "function") return;

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL?.(url);
  }, [selectedFile]);

  function handleFileChange(file: File | undefined) {
    setError(null);
    if (!file) return;

    const validationMessage = roomImageValidationMessage(file);
    if (validationMessage) {
      onFileChange(null);
      setError(validationMessage);
      return;
    }
    onFileChange(file);
  }

  return (
    <div className="mf-photo-picker">
      {(previewUrl || imageUrl) && (
        <img
          className="mf-photo-preview"
          src={previewUrl || imageUrl || undefined}
          alt={selectedFile ? `Preview of ${selectedFile.name}` : "Current room photo"}
        />
      )}
      <label className="mf-field">
        <span>{imageUrl ? "Choose a replacement photo" : "Room photo (optional)"}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={(event) => {
            handleFileChange(event.currentTarget.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </label>
      <p className="mf-hint">JPEG, PNG, or WebP; maximum 5 MiB.</p>
      {selectedFile && <p className="mf-hint">Selected: {selectedFile.name}</p>}
      {error && <p className="mf-form-error" role="alert">{error}</p>}
    </div>
  );
}
