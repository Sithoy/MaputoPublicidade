import { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export function ImageUploader({
  name,
  preview,
  frame = 'square',
  onChange,
}: {
  name: string;
  preview?: string | null;
  frame?: 'square' | 'landscape';
  onChange?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(preview || null);

  useEffect(() => {
    setRemoved(false);
  }, [preview]);

  useEffect(() => {
    if (!selected && !removed) {
      setLocalPreview(preview || null);
    }
  }, [preview, selected, removed]);

  const objectUrlRef = useRef<string | null>(null);
  const previewClassName =
    frame === 'landscape'
      ? 'h-[168px] w-56 rounded-lg border border-gray-200 bg-white object-contain p-3'
      : 'h-40 w-40 rounded-lg border border-gray-200 bg-white object-contain p-3';

  const handleFile = (file: File | null) => {
    setSelected(file);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (file) {
      setRemoved(false);
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
      setLocalPreview(url);
    } else {
      setLocalPreview(removed ? null : preview || null);
    }
    onChange?.(file);
  };

  const handleRemove = () => {
    setRemoved(true);
    setSelected(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setLocalPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    onChange?.(null);
  };

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

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
            className={cn(previewClassName)}
            onError={() => setLocalPreview(null)}
          />
          <button
            type="button"
            onClick={handleRemove}
            aria-label="Remover imagem"
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
          aria-label="Carregar imagem"
          className="gap-2"
        >
          <Upload className="h-4 w-4" />
          Carregar imagem
        </Button>
      )}
    </div>
  );
}
