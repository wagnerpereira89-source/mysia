import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Plus, X, Check } from 'lucide-react'
import { Header } from '../components/Header'
import { useAttributes, useAttributeTerms, useCreateAttribute, useCreateAttributeTerm } from '../hooks/useAttributes'
import { Button } from '../components/ui/Button'
import { loadAttributesDraft, saveAttributesDraft } from '../utils/attributesStore'
import toast from 'react-hot-toast'

export default function NewProperty() {
  const navigate = useNavigate()
  const location = useLocation()
  const editing = location.state?.editing || null

  const currentAttributes = loadAttributesDraft() || []

  const { data: attributes = [] } = useAttributes()
  const createAttr = useCreateAttribute()
  const createTerm = useCreateAttributeTerm()

  const [selectedAttrId, setSelectedAttrId] = useState(editing?.id ? String(editing.id) : '')
  const [selectedAttrName, setSelectedAttrName] = useState(editing?.name || '')
  const [customAttrName, setCustomAttrName] = useState('')
  const [selectedValues, setSelectedValues] = useState(editing?.options || [])
  const [customValue, setCustomValue] = useState('')
  const [showCustomAttrInput, setShowCustomAttrInput] = useState(false)

  const { data: terms = [] } = useAttributeTerms(selectedAttrId || null)

  const handleAttrChange = (e) => {
    const val = e.target.value
    if (val === '__new__') {
      setShowCustomAttrInput(true)
      setSelectedAttrId('')
      setSelectedAttrName('')
    } else {
      const attr = attributes.find((a) => String(a.id) === val)
      setSelectedAttrId(val)
      setSelectedAttrName(attr?.name || '')
      setShowCustomAttrInput(false)
      setSelectedValues([])
    }
  }

  const toggleTerm = (term) => {
    setSelectedValues((prev) =>
      prev.includes(term.name) ? prev.filter((v) => v !== term.name) : [...prev, term.name]
    )
  }

  const addCustomValue = () => {
    const val = customValue.trim()
    if (val && !selectedValues.includes(val)) {
      setSelectedValues((prev) => [...prev, val])
    }
    setCustomValue('')
  }

  const removeValue = (val) => setSelectedValues((prev) => prev.filter((v) => v !== val))

  const handleSave = async () => {
    let attrId = selectedAttrId ? Number(selectedAttrId) : null
    let attrName = selectedAttrName

    if (!attrName && !showCustomAttrInput) {
      toast.error('Selecione ou crie uma propriedade')
      return
    }
    if (selectedValues.length === 0) {
      toast.error('Adicione pelo menos um valor')
      return
    }

    // Create new attribute if needed
    if (showCustomAttrInput) {
      if (!customAttrName.trim()) { toast.error('Digite o nome da propriedade'); return }
      const newAttr = await createAttr.mutateAsync(customAttrName.trim())
      attrId = newAttr.id
      attrName = newAttr.name
    }

    // Create custom terms that don't exist yet in Woo
    if (attrId) {
      const existingTermNames = terms.map((t) => t.name)
      for (const val of selectedValues) {
        if (!existingTermNames.includes(val)) {
          await createTerm.mutateAsync({ attributeId: attrId, name: val })
        }
      }
    }

    const newAttr = { id: attrId, name: attrName, options: selectedValues, variation: true, visible: true }

    // Merge into current attributes and save back to draft
    const updated = currentAttributes.filter(
      (a) => a.id !== attrId && a.name !== attrName
    )
    updated.push(newAttr)
    saveAttributesDraft(updated)

    // Go back to properties list (which reads from sessionStorage)
    navigate(-1)
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        title="Nova propriedade"
        right={
          <Button
            size="sm"
            loading={createAttr.isPending || createTerm.isPending}
            onClick={handleSave}
          >
            Criar
          </Button>
        }
      />

      <div className="max-w-mobile mx-auto px-4 py-4 space-y-4">
        {/* Attribute selector */}
        <div className="bg-white border border-[#e4e4e7] rounded-xl p-4">
          <label className="text-[13px] font-medium text-[#52525b] block mb-2">Propriedade</label>
          <select
            value={selectedAttrId || (showCustomAttrInput ? '__new__' : '')}
            onChange={handleAttrChange}
            className="w-full h-10 px-3 text-sm border border-[#e4e4e7] rounded-lg focus:outline-none focus:border-primary bg-white"
          >
            <option value="">Selecione uma propriedade...</option>
            {attributes.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
            <option value="__new__">+ Criar nova propriedade</option>
          </select>

          {showCustomAttrInput && (
            <input
              value={customAttrName}
              onChange={(e) => setCustomAttrName(e.target.value)}
              placeholder="Nome da nova propriedade (ex: Material)"
              className="mt-2 w-full h-10 px-3 text-sm border border-[#e4e4e7] rounded-lg focus:outline-none focus:border-primary"
            />
          )}
        </div>

        {/* Values section - show once an attribute is selected or being created */}
        {(selectedAttrId || showCustomAttrInput) && (
          <div className="bg-white border border-[#e4e4e7] rounded-xl p-4 space-y-4">
            {/* Selected values */}
            <div>
              <p className="text-[13px] font-medium text-[#52525b] mb-2">Valores selecionados</p>
              {selectedValues.length === 0 ? (
                <p className="text-sm text-[#a1a1aa]">Nenhum valor selecionado ainda</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedValues.map((val) => (
                    <span
                      key={val}
                      className="inline-flex items-center gap-1 bg-primary text-white text-sm px-3 py-1 rounded-full"
                    >
                      {val}
                      <button onClick={() => removeValue(val)} className="hover:opacity-70">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Custom value input */}
            <div>
              <p className="text-[13px] font-medium text-[#52525b] mb-2 flex items-center gap-1">
                <Plus size={14} />
                Adicionar valor personalizado
              </p>
              <div className="flex gap-2">
                <input
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomValue() } }}
                  placeholder="Ex: Tamanho Único"
                  className="flex-1 h-9 px-3 text-sm border border-[#e4e4e7] rounded-lg focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={addCustomValue}
                  disabled={!customValue.trim()}
                  className="h-9 px-3 bg-primary text-white rounded-lg disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Suggested values from Woo */}
            {terms.length > 0 && (
              <div>
                <p className="text-[13px] font-medium text-[#52525b] mb-2">Valores sugeridos</p>
                <div className="space-y-1">
                  {terms.map((term) => {
                    const checked = selectedValues.includes(term.name)
                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => toggleTerm(term)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[#f4f4f5] transition-colors"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center border ${checked ? 'bg-primary border-primary' : 'border-[#e4e4e7]'}`}>
                          {checked && <Check size={12} className="text-white" />}
                        </div>
                        <span className="text-sm text-[#1a1a1a]">{term.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
