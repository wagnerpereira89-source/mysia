import { useState } from 'react'
import { X, Plus, Check } from 'lucide-react'
import { Sheet } from './ui/Sheet'
import { useCategories, useCreateCategory } from '../hooks/useCategories'
import { Button } from './ui/Button'

// Ordena categorias colocando cada subcategoria logo abaixo da sua categoria pai.
// Categorias pai ficam em ordem alfabética; subcategorias herdam essa ordem da mãe.
function sortCategoriesHierarchical(categories) {
  const byId      = new Map(categories.map((c) => [c.id, c]))
  const parents   = categories.filter((c) => !c.parent || c.parent === 0)
  const childrenMap = new Map()
  categories.forEach((c) => {
    if (c.parent && c.parent !== 0) {
      if (!childrenMap.has(c.parent)) childrenMap.set(c.parent, [])
      childrenMap.get(c.parent).push(c)
    }
  })

  // Ordena pais e filhas alfabeticamente
  const sortAlpha = (a, b) => a.name.localeCompare(b.name, 'pt-BR')
  parents.sort(sortAlpha)
  childrenMap.forEach((arr) => arr.sort(sortAlpha))

  // Monta lista final: pai → filhas (recursivo, caso haja sub-subcategorias)
  const result = []
  const pushWithChildren = (cat) => {
    result.push(cat)
    const kids = childrenMap.get(cat.id) || []
    kids.forEach(pushWithChildren)
  }
  parents.forEach(pushWithChildren)

  // Casos extremos: categoria com parent que não está na lista carregada — adiciona ao final
  categories.forEach((c) => {
    if (!result.includes(c)) result.push(c)
  })

  return result
}

export function CategorySelector({ selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const { data: categories = [], isLoading } = useCategories()
  const createCat = useCreateCategory()

  // Seleção temporária enquanto o sheet está aberto
  const [tempSelected, setTempSelected] = useState([])

  const handleOpen = () => {
    setTempSelected(selected)
    setOpen(true)
  }

  // Fechar com X OU confirmar — ambos salvam
  const handleClose = () => {
    onChange(tempSelected)
    setOpen(false)
  }

  const toggle = (cat) => {
    const exists = tempSelected.find((c) => c.id === cat.id)
    if (exists) setTempSelected(tempSelected.filter((c) => c.id !== cat.id))
    else setTempSelected([...tempSelected, { id: cat.id, name: cat.name }])
  }

  const removeSelected = (id) => onChange(selected.filter((c) => c.id !== id))

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const cat = await createCat.mutateAsync(newName.trim())
    setTempSelected((prev) => [...prev, { id: cat.id, name: cat.name }])
    setNewName('')
  }

  return (
    <div>
      {/* Tags selecionadas */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selected.map((cat) => (
          <span
            key={cat.id}
            className="inline-flex items-center gap-1 bg-[#f4f4f5] text-[#52525b] text-sm px-3 py-1 rounded-full"
          >
            {cat.name}
            <button onClick={() => removeSelected(cat.id)} className="text-[#a1a1aa] hover:text-red-500">
              <X size={14} />
            </button>
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={handleOpen}
        className="text-sm text-action hover:underline"
      >
        Editar categorias
      </button>

      <Sheet open={open} onClose={handleClose} title="Categorias">
        {/* Criar nova */}
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Criar nova categoria..."
            className="flex-1 h-9 px-3 text-sm border border-[#e4e4e7] rounded-lg focus:outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={createCat.isPending || !newName.trim()}
            className="h-9 px-3 bg-primary text-white rounded-lg text-sm disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </form>

        {/* Lista */}
        {isLoading ? (
          <p className="text-sm text-[#a1a1aa]">Carregando...</p>
        ) : (
          <div className="space-y-1">
            {sortCategoriesHierarchical(categories).map((cat) => {
              const isSelected = tempSelected.some((c) => c.id === cat.id)
              const isChild    = cat.parent && cat.parent !== 0
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggle(cat)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[#f4f4f5] transition-colors"
                  style={isChild ? { paddingLeft: '28px' } : undefined}
                >
                  <span className={`text-sm text-[#1a1a1a] ${isChild ? 'font-normal' : 'font-bold'}`}>
                    {cat.name}
                  </span>
                  {isSelected && <Check size={16} className="text-primary" />}
                </button>
              )
            })}
          </div>
        )}

        <div className="pt-4 border-t border-[#e4e4e7] mt-4">
          <Button fullWidth onClick={handleClose}>
            Confirmar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}
