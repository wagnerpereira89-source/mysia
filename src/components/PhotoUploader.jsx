import { useRef } from 'react'
import { Plus, Star, Trash2, Camera } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Item arrastável (uma foto) ────────────────────────────────────────────

function SortablePhoto({ photo, index, onSetMain, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: photo.uid })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 'auto',
    touchAction: 'none',
    WebkitTouchCallout: 'none',
    WebkitUserSelect: 'none',
    userSelect: 'none',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`relative aspect-square rounded-lg overflow-hidden bg-[#f4f4f5] ${
        isDragging ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
    >
      <img
        src={photo.preview || photo.src}
        alt=""
        draggable={false}
        className="w-full h-full object-cover pointer-events-none"
      />

      {/* Estrela = principal */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onSetMain(index)
        }}
        className={`absolute top-1 left-1 p-1 rounded-full z-20 ${
          photo.isMain ? 'text-yellow-400 bg-black/50' : 'text-white/80 bg-black/40'
        }`}
      >
        <Star size={14} fill={photo.isMain ? 'currentColor' : 'none'} />
      </button>

      {/* Lixeira */}
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          onRemove(index)
        }}
        className="absolute top-1 right-1 p-1 rounded-full text-white bg-black/40 z-20"
      >
        <Trash2 size={14} />
      </button>

      {/* Numerador */}
      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center z-10">
        {index + 1}
      </div>

      {photo.isMain && (
        <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[10px] text-center py-0.5 z-10">
          Principal
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────

export function PhotoUploader({ photos, onChange }) {
  const inputRef = useRef(null)

  // Garante que toda foto tem um id estável (necessário pro dnd-kit)
  const withUid = photos.map((p, i) => ({
    ...p,
    uid: p.uid || (p.id ? `id-${p.id}` : `tmp-${i}-${p.preview || p.src || ''}`),
  }))

  // Sensores: TouchSensor com long-press (250ms) → não conflita com scroll
  const sensors = useSensors(
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
  )

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const newPhotos = files.map((file) => ({
      id: null,
      file,
      preview: URL.createObjectURL(file),
      isMain: false,
      uid: `tmp-${Date.now()}-${Math.random()}`,
    }))
    const updated = [...withUid, ...newPhotos]
    if (updated.length > 0 && !updated.some((p) => p.isMain)) {
      updated[0].isMain = true
    }
    onChange(updated)
    e.target.value = ''
  }

  const setMain = (index) => {
    onChange(withUid.map((p, i) => ({ ...p, isMain: i === index })))
  }

  const remove = (index) => {
    const updated = withUid.filter((_, i) => i !== index)
    if (updated.length > 0 && !updated.some((p) => p.isMain)) {
      updated[0].isMain = true
    }
    onChange(updated)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = withUid.findIndex((p) => p.uid === active.id)
    const newIndex = withUid.findIndex((p) => p.uid === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    onChange(arrayMove(withUid, oldIndex, newIndex))
  }

  return (
    <div>
      {/* Estado vazio */}
      {withUid.length === 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-action rounded-xl p-8 flex flex-col items-center gap-2 text-action hover:bg-blue-50 transition-colors"
        >
          <Plus size={28} />
          <span className="text-sm font-medium">Selecione fotos do produto</span>
        </button>
      )}

      {/* Grade ordenável */}
      {withUid.length > 0 && (
        <>
          <p className="text-[11px] text-[#a1a1aa] mb-2">
            Toque e segure para arrastar e reordenar
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={withUid.map((p) => p.uid)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-3 gap-2 mb-3">
                {withUid.map((photo, index) => (
                  <SortablePhoto
                    key={photo.uid}
                    photo={photo}
                    index={index}
                    onSetMain={setMain}
                    onRemove={remove}
                  />
                ))}
                {/* Adicionar mais */}
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-[#e4e4e7] flex items-center justify-center text-[#a1a1aa] hover:border-action hover:text-action transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </SortableContext>
          </DndContext>
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".webp,.png,.jpg,.jpeg,.gif"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <p className="text-xs text-[#a1a1aa] flex items-center gap-1">
        <Camera size={12} />
        Tamanho mínimo recomendado: 1280px / Formatos: WEBP, PNG, JPEG ou GIF
      </p>
    </div>
  )
}
