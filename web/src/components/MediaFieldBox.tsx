import React, { useState } from 'react';
import { Upload, Link2, Video, Image as ImageIcon, X, AlertCircle } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface MediaFieldBoxProps {
  tenantSlug: string;
  imageUrl: string;
  videoUrl: string;
  onChange: (next: { imageUrl: string; videoUrl: string }) => void;
}

const MAX_IMAGE_MB = 5;
const MAX_VIDEO_MB = 15;
const MAX_VIDEO_SECONDS = 60;

function extractMediaUrlFromTransfer(dt: DataTransfer): string | null {
  // 1. HTML arrastado de outra aba (ex: <img src="..."> ou <video><source src="..."></video>)
  const html = dt.getData('text/html') || '';
  if (html) {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) {
      return decodeHtmlEntities(imgMatch[1]);
    }
    const vidMatch = html.match(/<(?:video|source)[^>]+src=["']([^"']+)["']/i);
    if (vidMatch && vidMatch[1]) {
      return decodeHtmlEntities(vidMatch[1]);
    }
  }

  // 2. URI list / texto puro arrastado do navegador
  const uriList = (dt.getData('text/uri-list') || '')
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('#'));
  const plain = (dt.getData('text/plain') || '').trim();
  const candidate = uriList || plain;

  if (!candidate) return null;

  // Desembrulha links de redirecionamento do Google Imagens (?imgurl=...)
  try {
    const parsed = new URL(candidate);
    const imgUrlParam = parsed.searchParams.get('imgurl');
    if (imgUrlParam && /^https?:\/\//i.test(imgUrlParam)) {
      return imgUrlParam;
    }
  } catch {
    // Segue com o valor bruto (pode ser data:image/...)
  }

  if (/^(https?:\/\/|data:(image|video)\/)/i.test(candidate)) {
    return candidate;
  }

  return null;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export const MediaFieldBox: React.FC<MediaFieldBoxProps> = ({
  tenantSlug,
  imageUrl,
  videoUrl,
  onChange
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  function checkVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(video.duration || 0);
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  }

  async function uploadBase64DataUrl(dataUrl: string, fileName = 'midia-arrastada.jpg') {
    const mimeMatch = dataUrl.match(/^data:([^;]+);base64,/i);
    const mimeType = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
    setUploading(true);
    try {
      const res = await apiFetch(`/api/tenants/${tenantSlug}/media/upload`, {
        method: 'POST',
        body: JSON.stringify({
          fileName,
          mimeType,
          fileBase64: dataUrl
        })
      });
      if (res.mediaType === 'video') {
        onChange({ imageUrl, videoUrl: res.url });
      } else {
        onChange({ imageUrl: res.url, videoUrl });
      }
    } catch (err: any) {
      setMediaError(err.message || 'Falha ao salvar mídia arrastada.');
    } finally {
      setUploading(false);
    }
  }

  async function processFile(file: File) {
    setMediaError(null);
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/');

    if (!isImage && !isVideo) {
      setMediaError('Envie uma imagem (JPG, PNG, WebP) ou vídeo (MP4, WebM).');
      return;
    }

    const maxBytes = (isVideo ? MAX_VIDEO_MB : MAX_IMAGE_MB) * 1024 * 1024;
    if (file.size > maxBytes) {
      setMediaError(
        isVideo
          ? `Vídeo acima do limite de ${MAX_VIDEO_MB} MB.`
          : `Imagem acima do limite de ${MAX_IMAGE_MB} MB.`
      );
      return;
    }

    if (isVideo) {
      const duration = await checkVideoDuration(file);
      if (duration > MAX_VIDEO_SECONDS) {
        setMediaError(`Vídeo acima do limite de ${MAX_VIDEO_SECONDS} segundos.`);
        return;
      }
    }

    setUploading(true);
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Erro ao ler arquivo.'));
        reader.readAsDataURL(file);
      });

      const res = await apiFetch(`/api/tenants/${tenantSlug}/media/upload`, {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type,
          fileBase64
        })
      });

      if (res.mediaType === 'video') {
        onChange({ imageUrl, videoUrl: res.url });
      } else {
        onChange({ imageUrl: res.url, videoUrl });
      }
    } catch (err: any) {
      setMediaError(err.message || 'Falha ao enviar mídia.');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    await processFile(file);
  }

  async function applyUrl(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;
    setMediaError(null);

    if (/^data:(image|video)\//i.test(trimmed)) {
      const isVid = trimmed.toLowerCase().startsWith('data:video/');
      await uploadBase64DataUrl(trimmed, isVid ? 'video-arrastado.mp4' : 'foto-arrastada.jpg');
      return;
    }

    const isVideo = /\.(mp4|webm|mov|mkv)(\?|$)/i.test(trimmed);
    if (isVideo) {
      onChange({ imageUrl, videoUrl: trimmed });
    } else {
      onChange({ imageUrl: trimmed, videoUrl });
    }
  }

  function handleAddUrl() {
    if (!urlInput.trim()) return;
    applyUrl(urlInput);
    setUrlInput('');
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setMediaError(null);

    // Caso 1: Arquivo local arrastado do computador
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
      return;
    }

    // Caso 2: Imagem ou vídeo arrastado diretamente de outra aba do navegador (sem precisar baixar)
    const extractedUrl = extractMediaUrlFromTransfer(e.dataTransfer);
    if (extractedUrl) {
      await applyUrl(extractedUrl);
      return;
    }

    setMediaError('Não foi possível identificar uma imagem ou vídeo no item arrastado.');
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      e.preventDefault();
      await processFile(files[0]);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={`p-3.5 rounded-lg border-2 border-dashed transition-colors space-y-3 ${
        isDragging
          ? 'border-[var(--nx-primary)] bg-[var(--nx-primary-soft)]'
          : 'border-[var(--nx-border-strong)] bg-[var(--nx-bg)]'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--nx-text)]">Mídias</span>
          <span className="text-[11px] text-[var(--nx-muted)]">
            {isDragging
              ? 'Solte a imagem ou vídeo aqui agora'
              : 'Arraste direto da internet ou do PC (sem precisar baixar)'}
          </span>
        </div>
        <span className="text-[11px] text-[var(--nx-subtle)] tabular-data">
          Foto até {MAX_IMAGE_MB} MB / Vídeo até {MAX_VIDEO_MB} MB ({MAX_VIDEO_SECONDS}s)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5">
        <label className="inline-flex items-center justify-center gap-2 px-3.5 h-10 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] hover:border-[var(--nx-primary)] text-xs font-medium text-[var(--nx-text)] cursor-pointer transition-colors shrink-0">
          <Upload className="w-3.5 h-3.5 text-[var(--nx-primary)]" />
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
          <input
            type="file"
            accept="image/*,video/mp4,video/webm"
            disabled={uploading}
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        <div className="flex flex-1 gap-2">
          <div className="flex items-center gap-2 flex-1 h-10 px-3 rounded-lg border border-[var(--nx-border-strong)] bg-[var(--nx-surface)] focus-within:border-[var(--nx-primary)]">
            <Link2 className="w-3.5 h-3.5 text-[var(--nx-subtle)] shrink-0" />
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddUrl();
                }
              }}
              placeholder="Ou cole a URL da foto ou vídeo (.mp4)..."
              className="w-full bg-transparent text-xs text-[var(--nx-text)] outline-none"
            />
          </div>
          <button
            type="button"
            onClick={handleAddUrl}
            className="px-3.5 h-10 rounded-lg bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] hover:opacity-90 text-xs font-semibold shrink-0 transition-opacity"
          >
            Inserir
          </button>
        </div>
      </div>

      {mediaError && (
        <p className="nx-field-error">
          <AlertCircle className="w-3.5 h-3.5" />
          {mediaError}
        </p>
      )}

      {(imageUrl || videoUrl) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {imageUrl && (
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--nx-surface)] border border-[var(--nx-border)]">
              <img
                src={imageUrl}
                alt="Foto"
                className="w-10 h-10 rounded object-cover border border-[var(--nx-border)]"
              />
              <div className="text-[11px] max-w-[160px]">
                <div className="font-semibold text-[var(--nx-text)] inline-flex items-center gap-1">
                  <ImageIcon className="w-3 h-3 text-[var(--nx-primary)]" />
                  Foto
                </div>
                <div className="text-[10px] text-[var(--nx-subtle)] truncate">{imageUrl}</div>
              </div>
              <button
                type="button"
                onClick={() => onChange({ imageUrl: '', videoUrl })}
                className="p-1 text-[var(--nx-subtle)] hover:text-[var(--nx-error)]"
                title="Remover foto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {videoUrl && (
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--nx-surface)] border border-[var(--nx-border)]">
              <div className="w-10 h-10 rounded bg-[var(--nx-primary-soft)] text-[var(--nx-primary)] flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="text-[11px] max-w-[160px]">
                <div className="font-semibold text-[var(--nx-text)]">Vídeo</div>
                <div className="text-[10px] text-[var(--nx-subtle)] truncate">{videoUrl}</div>
              </div>
              <button
                type="button"
                onClick={() => onChange({ imageUrl, videoUrl: '' })}
                className="p-1 text-[var(--nx-subtle)] hover:text-[var(--nx-error)]"
                title="Remover vídeo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MediaFieldBox;
