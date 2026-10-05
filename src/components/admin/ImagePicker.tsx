'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Image upload controls for the admin forms.
 *
 * The server validates and re-encodes whatever it is sent (see FileManager), so
 * nothing here is a security boundary — these checks exist so an admin learns a
 * file is too large or the wrong type immediately, instead of after waiting for
 * a multi-megabyte upload to be rejected.
 *
 * Styling deliberately reuses the admin's existing Bootstrap classes rather
 * than introducing a new visual language.
 */

/** Extensions the backend's FileManager will accept, keyed by sniffed MIME. */
const ACCEPTED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ACCEPT_ATTR = 'image/jpeg,image/png,image/gif,image/webp';

export type ExistingImage = {
  id: number;
  url: string | null;
  isMain?: boolean;
};

/** Human-readable reason this file cannot be uploaded, or null when it can. */
export function validateImage(file: File, maxMb: number): string | null {
  if (!ACCEPTED.includes(file.type)) {
    return `${file.name}: only JPG, PNG, GIF or WEBP images are allowed.`;
  }

  if (file.size > maxMb * 1024 * 1024) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `${file.name}: ${mb} MB exceeds the ${maxMb} MB limit.`;
  }

  return null;
}

/** Object URLs for a set of files, revoked when the set changes. */
function usePreviews(files: File[]): string[] {
  // Derived during render rather than in an effect, so the first paint already
  // has the previews instead of flashing empty for a frame.
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  // Without this every re-pick leaks a blob for the lifetime of the tab.
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls]);

  return urls;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="progress mt-2" style={{ height: 6 }}>
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function Thumb({
  src,
  alt,
  onRemove,
  removeTitle,
  badge,
  onBadge,
  badgeTitle,
}: {
  src: string;
  alt: string;
  onRemove?: () => void;
  removeTitle?: string;
  badge?: 'main' | 'set-main';
  onBadge?: () => void;
  badgeTitle?: string;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        width={72}
        height={72}
        style={{ borderRadius: 6, objectFit: 'cover', display: 'block', background: '#f1f3f6' }}
      />

      {onRemove && (
        <button
          type="button"
          title={removeTitle}
          aria-label={removeTitle}
          className="btn btn--sm btn-outline--danger"
          style={{ position: 'absolute', top: -8, right: -8, padding: '0 6px', lineHeight: 1.4 }}
          onClick={onRemove}
        >
          ×
        </button>
      )}

      {badge === 'main' && (
        <span
          className="badge badge--success"
          style={{ position: 'absolute', bottom: 2, left: 2, fontSize: 9 }}
        >
          Main
        </span>
      )}

      {badge === 'set-main' && (
        <button
          type="button"
          title={badgeTitle}
          className="btn btn--sm btn-outline--primary"
          style={{ position: 'absolute', bottom: 2, left: 2, padding: '0 5px', fontSize: 9 }}
          onClick={onBadge}
        >
          Set main
        </button>
      )}
    </div>
  );
}

/**
 * One image, replaceable — categories, brands, and anything else holding a
 * single picture.
 */
export function SingleImagePicker({
  label,
  currentUrl,
  file,
  onChange,
  onClear,
  maxMb = 5,
  hint,
  progress,
}: {
  label: string;
  /** What is stored today, if anything. */
  currentUrl?: string | null;
  /** The replacement chosen but not yet saved. */
  file: File | null;
  onChange: (file: File | null) => void;
  /** Present when the stored image can be removed outright. */
  onClear?: () => void;
  maxMb?: number;
  hint?: string;
  /** 0–100 while a save is uploading; null otherwise. */
  progress?: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const previews = usePreviews(useMemo(() => (file ? [file] : []), [file]));

  const shown = previews[0] ?? currentUrl ?? null;

  function pick(next: File | null) {
    if (!next) {
      setError(null);
      onChange(null);
      return;
    }

    const problem = validateImage(next, maxMb);
    setError(problem);
    onChange(problem ? null : next);
  }

  return (
    <div className="form-group col-12">
      <label className="form-label">{label}</label>

      <div className="d-flex align-items-start gap-3 flex-wrap">
        {shown ? (
          <Thumb src={shown} alt={label} />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 6,
              border: '1px dashed #d5d9e2',
              display: 'grid',
              placeItems: 'center',
              color: '#98a2b3',
              fontSize: 11,
            }}
          >
            None
          </div>
        )}

        <div style={{ flex: 1, minWidth: 220 }}>
          <input
            ref={inputRef}
            className="form-control"
            type="file"
            accept={ACCEPT_ATTR}
            onChange={(event) => pick(event.target.files?.[0] ?? null)}
          />

          <div className="d-flex gap-2 mt-2 flex-wrap">
            {file && (
              <button
                type="button"
                className="btn btn--sm btn-outline--secondary"
                onClick={() => {
                  pick(null);
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                Undo selection
              </button>
            )}

            {onClear && !file && currentUrl && (
              <button type="button" className="btn btn--sm btn-outline--danger" onClick={onClear}>
                Remove image
              </button>
            )}
          </div>

          {typeof progress === 'number' && <ProgressBar percent={progress} />}

          {error ? (
            <small className="d-block mt-2 text--danger">{error}</small>
          ) : (
            <small className="d-block mt-2 text-muted">
              {hint ?? `JPG, PNG, GIF or WEBP. Up to ${maxMb} MB.`}
              {file ? ' Saved when you submit the form.' : ''}
            </small>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A gallery — products. Existing images can be deleted or promoted to main;
 * newly picked ones are previewed and can be dropped before saving.
 */
export function GalleryPicker({
  existing,
  onDeleteExisting,
  onSetExistingMain,
  files,
  onFilesChange,
  mainIndex,
  onMainIndexChange,
  maxMb = 8,
  maxFiles = 10,
  progress,
}: {
  existing: ExistingImage[];
  onDeleteExisting: (id: number) => void;
  /** Absent while creating, since nothing is stored yet. */
  onSetExistingMain?: (id: number) => void;
  files: File[];
  onFilesChange: (files: File[]) => void;
  /** Index into [files] that should become the main image, or null. */
  mainIndex: number | null;
  onMainIndexChange: (index: number | null) => void;
  maxMb?: number;
  maxFiles?: number;
  progress?: number | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const previews = usePreviews(files);

  const room = maxFiles - existing.length;

  function add(picked: File[]) {
    const problems: string[] = [];
    const accepted: File[] = [];

    for (const file of picked) {
      const problem = validateImage(file, maxMb);
      if (problem) problems.push(problem);
      else accepted.push(file);
    }

    const combined = [...files, ...accepted];

    if (combined.length > room) {
      problems.push(`Only ${maxFiles} images per product — ${combined.length - room} not added.`);
    }

    setErrors(problems);
    onFilesChange(combined.slice(0, Math.max(room, 0)));

    // Let the same file be picked again after being removed.
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index));

    if (mainIndex === index) onMainIndexChange(null);
    else if (mainIndex !== null && mainIndex > index) onMainIndexChange(mainIndex - 1);
  }

  const hasMain = existing.some((image) => image.isMain);

  return (
    <>
      {existing.length > 0 && (
        <>
          <small className="d-block mb-2 text-muted">Saved images</small>
          <div className="d-flex flex-wrap gap-3 mb-3">
            {existing.map((image) => (
              <Thumb
                key={image.id}
                src={image.url ?? ''}
                alt="Product"
                onRemove={() => onDeleteExisting(image.id)}
                removeTitle="Delete this image"
                badge={image.isMain ? 'main' : onSetExistingMain ? 'set-main' : undefined}
                onBadge={() => onSetExistingMain?.(image.id)}
                badgeTitle="Use as the main image"
              />
            ))}
          </div>
        </>
      )}

      {files.length > 0 && (
        <>
          <small className="d-block mb-2 text-muted">Selected — uploaded when you save</small>
          <div className="d-flex flex-wrap gap-3 mb-3">
            {files.map((file, index) => (
              <Thumb
                key={`${file.name}-${index}`}
                src={previews[index] ?? ''}
                alt={file.name}
                onRemove={() => removeAt(index)}
                removeTitle="Remove before saving"
                badge={mainIndex === index ? 'main' : 'set-main'}
                onBadge={() => onMainIndexChange(index)}
                badgeTitle="Use as the main image"
              />
            ))}
          </div>
        </>
      )}

      <input
        ref={inputRef}
        className="form-control"
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        disabled={room <= 0}
        onChange={(event) => add(Array.from(event.target.files ?? []))}
      />

      {typeof progress === 'number' && <ProgressBar percent={progress} />}

      {errors.length > 0 && (
        <div className="mt-2">
          {errors.map((message) => (
            <small className="d-block text--danger" key={message}>
              {message}
            </small>
          ))}
        </div>
      )}

      <small className="d-block mt-2 text-muted">
        JPG, PNG, GIF or WEBP, up to {maxMb} MB each, {maxFiles} per product.{' '}
        {room <= 0
          ? 'Delete a saved image to add more.'
          : hasMain || mainIndex !== null
            ? ''
            : 'The first upload becomes the main image when none is set.'}
      </small>
    </>
  );
}
