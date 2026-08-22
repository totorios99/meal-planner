'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/Icon'

interface Props {
  value: string
  onChange: (url: string) => void
}

// Crop frame aspect matches the meal card image (4:3), exported at 800×600
const OUT_W = 800
const OUT_H = 600

interface CropState {
  img: HTMLImageElement
  zoom: number // 1 = cover
  ox: number // offset of image top-left within frame, px
  oy: number
}

export function PhotoInput({ value, onChange }: Props) {
  const [crop, setCrop] = useState<CropState | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  // The frame's width, measured rather than read from the ref during render. Reading
  // frameRef.current mid-render meant the FIRST render always used the 400 fallback — the ref
  // is null until after commit — and nothing re-measured when the sheet or window resized, so
  // a crop framed at one width stayed scaled for it.
  const [frameW, setFrameW] = useState(400)

  function loadImage(src: string, crossOrigin: boolean) {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => setCrop({ img, zoom: 1, ...centered(img, 1) })
    img.onerror = () =>
      alert(crossOrigin
        ? "Can't adjust this external image (its server blocks cross-origin use) — upload the photo instead."
        : 'Could not load that image.')
    img.src = src
  }

  // Called from handlers and image-load callbacks, never during render, so it can read the
  // live element — that is the most accurate width available at the moment it is needed.
  // `frameW` is only the fallback for the window before the first measurement lands.
  function frameSize() {
    const w = frameRef.current?.clientWidth || frameW
    return { W: w, H: (w * OUT_H) / OUT_W }
  }

  function coverScale(img: HTMLImageElement) {
    const { W, H } = frameSize()
    return Math.max(W / img.naturalWidth, H / img.naturalHeight)
  }

  function centered(img: HTMLImageElement, zoom: number) {
    const { W, H } = frameSize()
    const s = coverScale(img) * zoom
    return { ox: (W - img.naturalWidth * s) / 2, oy: (H - img.naturalHeight * s) / 2 }
  }

  function clamp(c: CropState): CropState {
    const { W, H } = frameSize()
    const s = coverScale(c.img) * c.zoom
    const minX = W - c.img.naturalWidth * s
    const minY = H - c.img.naturalHeight * s
    return { ...c, ox: Math.min(0, Math.max(minX, c.ox)), oy: Math.min(0, Math.max(minY, c.oy)) }
  }

  function setZoom(zoom: number) {
    if (!crop) return
    const { W, H } = frameSize()
    const sOld = coverScale(crop.img) * crop.zoom
    const sNew = coverScale(crop.img) * zoom
    // keep frame centre fixed while zooming
    const cx = (W / 2 - crop.ox) / sOld
    const cy = (H / 2 - crop.oy) / sOld
    setCrop(clamp({ ...crop, zoom, ox: W / 2 - cx * sNew, oy: H / 2 - cy * sNew }))
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!crop) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, ox: crop.ox, oy: crop.oy }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!crop || !drag.current) return
    setCrop(clamp({
      ...crop,
      ox: drag.current.ox + (e.clientX - drag.current.x),
      oy: drag.current.oy + (e.clientY - drag.current.y),
    }))
  }

  async function applyCrop() {
    if (!crop) return
    setBusy(true)
    try {
      const { W, H } = frameSize()
      const s = coverScale(crop.img) * crop.zoom
      const canvas = document.createElement('canvas')
      canvas.width = OUT_W
      canvas.height = OUT_H
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(crop.img, -crop.ox / s, -crop.oy / s, W / s, H / s, 0, 0, OUT_W, OUT_H)
      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.82))
      if (!blob) throw new Error('export failed')
      const form = new FormData()
      form.append('file', blob, 'photo.jpg')
      const res = await fetch('/api/images', { method: 'POST', body: form })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'upload failed')
      onChange((await res.json()).url)
      setCrop(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save the photo')
    } finally {
      setBusy(false)
    }
  }

  // adjusting an existing photo: same-origin and data: URIs are canvas-safe,
  // external URLs need CORS approval from their server — try and fail loudly
  function adjustCurrent() {
    if (!value) return
    const external = /^https?:/.test(value) && !value.startsWith(location.origin)
    loadImage(value, external)
  }

  // Measure after commit, and keep measuring: the modal animates open, so the width at mount
  // is not the width a moment later.
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      if (w > 0) setFrameW(prev => (prev === w ? prev : w))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    return () => { if (crop?.img.src.startsWith('blob:')) URL.revokeObjectURL(crop.img.src) }
  }, [crop])

  // Render must not read the ref: it is null on the first render, and a ref read does not
  // re-render when the element resizes. This mirrors coverScale() against measured state.
  const renderW = frameW
  const renderH = (renderW * OUT_H) / OUT_W
  const s = crop
    ? Math.max(renderW / crop.img.naturalWidth, renderH / crop.img.naturalHeight) * crop.zoom
    : 1

  return (
    <div className="field">
      <label htmlFor="photo-url">Photo</label>

      {crop ? (
        <div className="photo-cropper">
          <div
            ref={frameRef}
            className="photo-crop-frame"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={crop.img.src}
              alt="Adjust crop"
              draggable={false}
              style={{
                width: crop.img.naturalWidth * s,
                height: crop.img.naturalHeight * s,
                transform: `translate(${crop.ox}px, ${crop.oy}px)`,
              }}
            />
          </div>
          <div className="photo-crop-controls">
            <Icon name="search" size={14} />
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={crop.zoom}
              onChange={e => setZoom(Number(e.target.value))}
              aria-label="Zoom"
            />
            <button type="button" className="btn btn-ghost" onClick={() => setCrop(null)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={applyCrop} disabled={busy}>
              {busy ? 'Saving…' : 'Apply'}
            </button>
          </div>
          <p className="photo-crop-hint">Drag to reposition · slide to zoom</p>
        </div>
      ) : (
        <>
          {value && (
            <div className="photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Meal photo" />
            </div>
          )}
          <div className="photo-actions">
            <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
              <Icon name="plus" size={14} /> Upload
            </button>
            {value && (
              <button type="button" className="btn btn-ghost" onClick={adjustCurrent}>
                <Icon name="edit" size={14} /> Adjust
              </button>
            )}
          </div>
          <input
            id="photo-url"
            placeholder="…or paste an image URL"
            value={value.startsWith('data:') ? '(embedded image)' : value}
            onChange={e => onChange(e.target.value)}
            readOnly={value.startsWith('data:')}
          />
        </>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) loadImage(URL.createObjectURL(f), false)
          e.target.value = ''
        }}
      />
    </div>
  )
}
