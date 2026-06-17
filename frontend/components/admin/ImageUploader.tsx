import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function ImageUploader({
  name,
  preview,
  onChange,
}: {
  name: string;
  preview?: string | null;
  onChange?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(preview || null);

  useEffect(() => {
    if (!selected) {
      setLocalPreview(preview || null);
    }
  }, [preview, selected]);

  const handleFile = (file: File | null) => {
    setSelected(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setLocalPreview(url);
    } else {
      setLocalPreview(preview || null);
    }
    onChange?.(file);
  };

  const handleRemove = () => {
    handleFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
      />
      {localPreview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={localPreview}
            alt="Preview"
            className={cn('h-40 w-auto rounded-lg border border-gray-200 object-cover')}
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Carregar imagem
        </Button>
      )}
    </div>
  );
}
