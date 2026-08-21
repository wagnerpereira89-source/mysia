import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, X, Check, Loader2 } from 'lucide-react'
import { Header } from '../components/Header'
import { Button } from '../components/ui/Button'
import { useAttributes, useAttributeTerms, useCreateAttribute, useCreateAttributeTerm } from '../hooks/useAttributes'
import { loadAttributesDraft, saveAttributesDraft } from '../utils/attributesStore'
import toast from 'react-hot-toast'

// Componente que carrega os terms de um attribute específico
function AttributeBlock({ attribute, selectedValues, onToggleValue, onAddCustomValue, customAttrCreation }) {
  const [expanded, setExpanded] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const { data: terms = [], isLoading } = useAttributeTerms(expanded ? attribute.id : null)

  const isChecked = selectedValues.length > 0
  const hasNew = attribute.id == null

  const handleAddCustom = () => {
    const v = customValue.trim()
    if (v && !selectedValues.includes(v)) {
      onAddCustomValue(v)
    }
    setCustomValue('')
  }

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-colors ${isChecked ? 'border-primary' : 'border-[#e4e4e7]'}`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${isChecked ? 'bg-primary border-primary' : 'border-[#d4d4d8]'}`}>
          {isChecked && <Check size={14} className="text-white" />}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1a1a1a]">{attribute.name}</p>
          {selectedValues.length > 0 && (
            <p className="text-xs text-[#52525b] mt-0.5 truncate">{selectedValues.join(', ')}</p>
          )}
        </div>
        {expanded ? <ChevronUp size={18} className="text-[#a1a1aa]" /> : <ChevronDown size={18} className="text-[#a1a1aa]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[#f4f4f5] pt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Valores existentes (chips) */}
              {terms.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {terms.map((term) => {
                    const checked = selectedValues.includes(term.name)
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => onToggleValue(term.name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          checked
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-[#52525b] border border-[#e4e4e7] hover:bg-[#f4f4f5]'
                        }`}
                      >
                        {term.name}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Valores personalizados já adicionados (que não estão na lista de terms) */}
              {selectedValues.filter((v) => !terms.some((t) => t.name === v)).length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedValues.filter((v) => !terms.some((t) => t.name === v)).map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 bg-primary text-white text-xs px-3 py-1.5 rounded-full">
                      {v}
                      <button onClick={() => onToggleValue(v)} className="hover:opacity-70">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Adicionar valor custom */}
              <div className="flex gap-2">
                <input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom() } }}
                  placeholder={`Adicionar ${attribute.name.toLowerCase()}...`}
                  className="flex-1 h-9 px-3 text-sm border border-[#e4e4e7] rounded-lg focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!customValue.trim()}
                  className="h-9 px-3 bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function Properties() {
  const navigate = useNavigate()
  const { data: attributes = [], isLoading } = useAttributes()
  const createAttr = useCreateAttribute()
  const createTerm = useCreateAttributeTerm()

  const draft = loadAttributesDraft() || []

  // Estado: { [attrName]: { id, name, options: [] } }
  const [selectedMap, setSelectedMap] = useState(() => {
    const map = {}
    draft.forEach((d) => { map[d.name] = { id: d.id, name: d.name, options: d.options || [] } })
    return map
  })

  // Novo atributo personalizado
  const [showNewAttr, setShowNewAttr] = useState(false)
  const [newAttrName, setNewAttrName] = useState('')

  const toggleValue = (attr, value) => {
    setSelectedMap((prev) => {
      const current = prev[attr.name] || { id: attr.id, name: attr.name, options: [] }
      const has = current.options.includes(value)
      const newOptions = has ? current.options.filter((v) => v !== value) : [...current.options, value]

      const updated = { ...prev }
      if (newOptions.length === 0) {
        delete updated[attr.name]
      } else {
        updated[attr.name] = { ...current, options: newOptions }
      }
      return updated
    })
  }

  const addCustomValue = (attr, value) => {
    setSelectedMap((prev) => {
      const current = prev[attr.name] || { id: attr.id, name: attr.name, options: [] }
      if (current.options.includes(value)) return prev
      return {
        ...prev,
        [attr.name]: { ...current, options: [...current.options, value] },
      }
    })
  }

  const handleSave = async () => {
    const result = []

    for (const key of Object.keys(selectedMap)) {
      const item = selectedMap[key]
      let attrId = item.id

      // Criar novo atributo no Woo se ele não tem ID
      if (!attrId) {
        try {
          const created = await createAttr.mutateAsync(item.name)
          attrId = created.id
        } catch {
          toast.error(`Erro ao criar atributo ${item.name}`)
          continue
        }
      }

      // Criar terms que ainda não existem (de modo async, em paralelo)
      // Não bloqueia o fluxo principal — o Woo cria sob demanda no salvar do produto
      result.push({
        id: attrId,
        name: item.name,
        options: item.options,
        variation: true,
        visible: true,
      })
    }

    saveAttributesDraft(result)
    navigate(-1)
  }

  const handleCreateNewAttribute = async () => {
    const name = newAttrName.trim()
    if (!name) return
    try {
      const created = await createAttr.mutateAsync(name)
      setSelectedMap((prev) => ({
        ...prev,
        [name]: { id: created.id, name, options: [] },
      }))
      setNewAttrName('')
      setShowNewAttr(false)
      toast.success(`Propriedade "${name}" criada`)
    } catch {
      toast.error('Erro ao criar propriedade')
    }
  }

  const totalSelected = Object.values(selectedMap).reduce((sum, item) => sum + item.options.length, 0)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        title="Variações"
        right={
          <Button size="sm" onClick={handleSave} loading={createAttr.isPending}>
            Salvar
          </Button>
        }
      />

      <div className="max-w-mobile mx-auto px-4 py-4 pb-24">
        <p className="text-sm text-[#52525b] mb-4">
          Marque a propriedade e selecione os valores. As variações serão geradas automaticamente.
        </p>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            {attributes.map((attr) => {
              const item = selectedMap[attr.name]
              return (
                <AttributeBlock
                  key={attr.id}
                  attribute={attr}
                  selectedValues={item?.options || []}
                  onToggleValue={(v) => toggleValue(attr, v)}
                  onAddCustomValue={(v) => addCustomValue(attr, v)}
                />
              )
            })}
          </div>
        )}

        {/* Criar nova propriedade */}
        <div className="mt-4">
          {!showNewAttr ? (
            <button
              type="button"
              onClick={() => setShowNewAttr(true)}
              className="w-full flex items-center justify-center gap-2 h-11 border-2 border-dashed border-[#e4e4e7] rounded-xl text-sm text-[#52525b] hover:bg-[#f4f4f5] hover:border-primary"
            >
              <Plus size={16} /> Criar nova propriedade
            </button>
          ) : (
            <div className="bg-white border border-primary rounded-xl p-4">
              <p className="text-sm font-semibold text-[#1a1a1a] mb-2">Nova propriedade</p>
              <div className="flex gap-2">
                <input
                  value={newAttrName}
                  onChange={(e) => setNewAttrName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewAttribute() } }}
                  placeholder="Ex: Material, Estampa..."
                  autoFocus
                  className="flex-1 h-10 px-3 text-sm border border-[#e4e4e7] rounded-lg focus:outline-none focus:border-primary"
                />
                <button
                  onClick={() => { setShowNewAttr(false); setNewAttrName('') }}
                  className="h-10 px-3 text-sm text-[#52525b] border border-[#e4e4e7] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateNewAttribute}
                  disabled={!newAttrName.trim() || createAttr.isPending}
                  className="h-10 px-3 bg-primary text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {createAttr.isPending ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#e4e4e7] p-4 max-w-mobile mx-auto">
        <Button fullWidth size="lg" onClick={handleSave} loading={createAttr.isPending}>
          Salvar {totalSelected > 0 && `(${totalSelected} valor${totalSelected !== 1 ? 'es' : ''})`}
        </Button>
      </div>
    </div>
  )
}
