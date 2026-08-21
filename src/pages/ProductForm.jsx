import { useState, useEffect, useRef } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProduct, useSaveProduct, useProductVariations } from '../hooks/useProduct'
import { Header } from '../components/Header'
import { Card, CardTitle } from '../components/ui/Card'
import { Input, Textarea } from '../components/ui/Input'
import { PhotoUploader } from '../components/PhotoUploader'
import { CategorySelector } from '../components/CategorySelector'
import { PropertySelector } from '../components/PropertySelector'
import { VariationCard } from '../components/VariationCard'
import { Button } from '../components/ui/Button'
import { uploadMedia } from '../api/media'
import { batchUpdateVariations } from '../api/variations'
import { loadAttributesDraft, clearAttributesDraft, loadFormDraft, clearFormDraft } from '../utils/attributesStore'
import { buildVariationName } from '../utils/formatters'
import toast from 'react-hot-toast'

function cartesian(arrays) {
  return arrays.reduce(
    (acc, arr) => acc.flatMap((combo) => arr.map((val) => [...combo, val])),
    [[]]
  )
}

const emptyDefaults = {
  regular_price: '',
  sale_price: '',
  weight: '',
  length: '',
  width: '',
  height: '',
  stock_quantity: '',
  sku: '',
}

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = !id
  const { data: product, isLoading } = useProduct(id)
  const { data: existingVariations = [] } = useProductVariations(id)
  const saveProduct = useSaveProduct()

  const [form, setForm] = useState({
    name: '',
    description: '',
    categories: [],
    tags: [],
    attributes: [],
    photos: [],
    status: 'publish',
  })
  const [tagInput, setTagInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  // Campos globais aplicados a todas as variações
  const [varDefaults, setVarDefaults] = useState(emptyDefaults)

  // Variações com dados individuais (após "Aplicar a todos" ou edição individual)
  const [variationOverrides, setVariationOverrides] = useState({})

  // Flag: um rascunho foi restaurado (voltamos da tela de Variações).
  // Nesse caso o formulário atual tem edições do usuário e NÃO pode ser
  // sobrescrito quando a resposta do servidor chegar.
  const draftRestoredRef = useRef(false)

  // Populate form when editing
  useEffect(() => {
    if (!product) return
    // Formulário completo veio do rascunho: não sobrescrever nada
    if (draftRestoredRef.current === 'form') return
    setForm((prev) => ({
      name: product.name || '',
      description: product.description || '',
      categories: product.categories?.map((c) => ({ id: c.id, name: c.name })) || [],
      tags: product.tags?.map((t) => t.name) || [],
      // Se só os atributos vieram do rascunho, preserva-os; senão usa os do servidor
      attributes: draftRestoredRef.current === 'attrs'
        ? prev.attributes
        : (product.attributes?.filter((a) => a.variation) || []),
      photos: product.images?.map((img) => ({
        id: img.id,
        src: img.src,
        preview: img.src,
        isMain: img.position === 0,
      })) || [],
      status: product.status || 'publish',
    }))
  }, [product])

  // Carrega os valores das variações existentes nos campos globais
  useEffect(() => {
    if (!existingVariations || existingVariations.length === 0) return

    // Usa a primeira variação como base para os defaults
    const base = existingVariations[0]

    // SKU base: se o SKU contém sufixos das variações (ex: "55666-Amarelo-M"), pega só a parte inicial
    let baseSku = base.sku || ''
    if (baseSku && base.attributes && base.attributes.length > 0) {
      // Tenta remover o sufixo "-Opcao1-Opcao2..." do SKU
      const suffix = base.attributes.map((a) => a.option).join('-')
      const suffixWithDash = `-${suffix}`
      if (baseSku.endsWith(suffixWithDash)) {
        baseSku = baseSku.substring(0, baseSku.length - suffixWithDash.length)
      } else {
        // Tenta também só remover a primeira opção (caso seja única)
        const firstOption = base.attributes[0]?.option
        if (firstOption && baseSku.endsWith(`-${firstOption}`)) {
          baseSku = baseSku.substring(0, baseSku.length - firstOption.length - 1)
        }
      }
    }

    setVarDefaults({
      regular_price: base.regular_price || '',
      sale_price: base.sale_price || '',
      weight: base.weight || '',
      length: base.dimensions?.length || '',
      width: base.dimensions?.width || '',
      height: base.dimensions?.height || '',
      stock_quantity: base.stock_quantity !== null ? String(base.stock_quantity) : '',
      sku: baseSku,
    })

    // Carrega cada variação individual em overrides
    const overrides = {}
    existingVariations.forEach((v) => {
      const key = (v.attributes || [])
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .map((a) => `${a.name}:${a.option}`)
        .join('|')

      // Mesma lógica de limpeza do SKU para cada variação
      let varSku = v.sku || ''
      if (varSku && v.attributes && v.attributes.length > 0) {
        const suffix = v.attributes.map((a) => a.option).join('-')
        const suffixWithDash = `-${suffix}`
        if (varSku.endsWith(suffixWithDash)) {
          varSku = varSku.substring(0, varSku.length - suffixWithDash.length)
        }
      }

      overrides[key] = {
        regular_price: v.regular_price || '',
        sale_price: v.sale_price || '',
        weight: v.weight || '',
        length: v.dimensions?.length || '',
        width: v.dimensions?.width || '',
        height: v.dimensions?.height || '',
        stock_quantity: v.stock_quantity !== null ? String(v.stock_quantity) : '',
        sku: varSku,
        existingId: v.id,
        imageId: v.image?.id || null,
      }
    })
    setVariationOverrides(overrides)
  }, [existingVariations])

  // Restaura formulário inteiro ao voltar da tela de propriedades
  useEffect(() => {
    const attrDraft = loadAttributesDraft()
    const formDraft = loadFormDraft()

    if (formDraft) {
      draftRestoredRef.current = 'form'   // formulário completo restaurado
    } else if (attrDraft) {
      draftRestoredRef.current = 'attrs'  // só os atributos restaurados
    }

    if (formDraft) {
      setForm({
        name: formDraft.name || '',
        description: formDraft.description || '',
        categories: formDraft.categories || [],
        tags: formDraft.tags || [],
        attributes: attrDraft || formDraft.attributes || [],
        photos: formDraft.photos || [],
        status: formDraft.status || 'publish',
      })
      clearFormDraft()
      clearAttributesDraft()
    } else if (attrDraft) {
      setField('attributes', attrDraft)
      clearAttributesDraft()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const setVarDefault = (key, value) => setVarDefaults((prev) => ({ ...prev, [key]: value }))

  // Tags chip input
  const addTag = (val) => {
    const tag = val.trim().replace(/,$/, '')
    if (tag && !form.tags.includes(tag)) setField('tags', [...form.tags, tag])
    setTagInput('')
  }
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
    if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
      setField('tags', form.tags.slice(0, -1))
    }
  }

  const handleRemoveVariationValue = (attr, val) => {
    const updated = form.attributes
      .map((a) =>
        a.id === attr.id || a.name === attr.name
          ? { ...a, options: a.options.filter((o) => o !== val) }
          : a
      )
      .filter((a) => a.options.length > 0)
    setField('attributes', updated)
  }

  const handleRemoveAttribute = (attr) => {
    setField('attributes', form.attributes.filter((a) => a.id !== attr.id && a.name !== attr.name))
  }

  const generateVariations = (attributes) => {
    if (!attributes.length) return []
    const combos = cartesian(attributes.map((a) => a.options.map((opt) => ({ attrId: a.id, attrName: a.name, option: opt }))))
    return combos.map((combo) => ({
      attributes: combo.map((c) => ({ id: c.attrId, name: c.attrName, option: c.option })),
    }))
  }

  // Foto principal
  const mainPhotoSrc = (() => {
    const main = form.photos.find((p) => p.isMain) || form.photos[0]
    return main?.preview || main?.src || null
  })()

  // Chave única para cada variação — ordena atributos por nome para evitar
  // bug de ordem diferente entre combos geradas e variações vindas do Woo
  const varKey = (v) =>
    (v.attributes || [])
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((a) => `${a.name}:${a.option}`)
      .join('|')

  // Aplicar defaults a todas as variações
  const handleApplyAll = () => {
    const combos = generateVariations(form.attributes)
    const newOverrides = {}
    combos.forEach((v) => {
      newOverrides[varKey(v)] = { ...varDefaults }
    })
    setVariationOverrides(newOverrides)
    toast.success('Dados aplicados a todas as variações!')
  }

  // Edição individual de uma variação
  const handleEditVariation = (key, updated) => {
    setVariationOverrides((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),  // ← PRESERVA campos como existingId
        regular_price: updated.regular_price || '',
        sale_price: updated.sale_price || '',
        stock_quantity: updated.stock_quantity ?? '',
        weight: updated.weight || '',
        length: updated.dimensions?.length || '',
        width: updated.dimensions?.width || '',
        height: updated.dimensions?.height || '',
        sku: updated.sku || '',
        imageId: updated.image?.id || null,
      },
    }))
  }

  // Excluir variação: remove a opção do atributo correspondente
  // (assim a combinação some das geradas e a variação antiga será deletada no save)
  const handleDeleteVariation = (variation) => {
    const name = buildVariationName(variation)
    if (!confirm(`Excluir a variação "${name}"?\n\nAtenção: isso vai remover a opção correspondente. Ex: ao excluir "Marrom / G/GG" será removida a opção "G/GG" se for a única combinação com esse tamanho.`)) return

    // Remove cada opção dessa variação dos atributos
    let updated = form.attributes
    variation.attributes.forEach((attr) => {
      updated = updated.map((a) =>
        (a.id === attr.id || a.name === attr.name)
          ? { ...a, options: a.options.filter((o) => o !== attr.option) }
          : a
      )
    })
    // Remove atributos que ficaram sem opção
    updated = updated.filter((a) => a.options.length > 0)
    setField('attributes', updated)

    // Limpa overrides desta variação
    const key = varKey(variation)
    setVariationOverrides((prev) => {
      const copy = { ...prev }
      delete copy[key]
      return copy
    })

    toast.success('Variação removida (lembre de Salvar para confirmar)')
  }

  const handleSave = async () => {
    if (!form.name || form.name.length < 3) {
      toast.error('Nome do produto é obrigatório (mínimo 3 caracteres)')
      return
    }
    setUploading(true)
    try {
      // 1. Upload fotos - cada foto com try/catch individual
      const imageIds = []
      const photosWithFile = form.photos.filter((p) => p.file && !p.id)
      const totalNew = photosWithFile.length
      let uploaded = 0

      for (const photo of form.photos) {
        if (photo.id) {
          imageIds.push({ id: photo.id })
        } else if (photo.file) {
          try {
            const media = await uploadMedia(photo.file)
            if (media && media.id) {
              imageIds.push({ id: media.id })
              uploaded++
              if (totalNew > 1) {
                toast.success(`Foto ${uploaded}/${totalNew} enviada`, { duration: 1500 })
              }
            }
          } catch (uploadErr) {
            console.error('Erro ao enviar foto:', uploadErr)
            toast.error(`Erro ao enviar uma foto. Tente novamente.`)
            // Não interrompe — continua tentando as outras
          }
        }
      }

      // Se tinha fotos para enviar mas nenhuma deu certo, avisa
      if (totalNew > 0 && uploaded === 0) {
        toast.error('Nenhuma foto pôde ser enviada. Verifique sua conexão.')
        setUploading(false)
        return
      }

      const mainIndex = form.photos.findIndex((p) => p.isMain)
      if (mainIndex > 0 && imageIds[mainIndex]) {
        const mainId = imageIds.splice(mainIndex, 1)[0]
        imageIds.unshift(mainId)
      }

      // 2. Produto
      const isVariable = form.attributes.length > 0
      // SKU base: vai no produto pai sempre. As variações recebem sufixo quando há mais de uma.
      const baseSku = (varDefaults.sku || '').trim()
      const productData = {
        name: form.name,
        description: form.description,
        status: form.status,
        sku: baseSku,
        categories: form.categories.map((c) => ({ id: c.id })),
        tags: form.tags.map((t) => ({ name: t })),
        images: imageIds,
        type: isVariable ? 'variable' : 'simple',
        attributes: form.attributes.map((a) => ({
          id: a.id,
          name: a.name,
          options: a.options,
          variation: true,
          visible: true,
        })),
      }
      const savedProduct = await saveProduct.mutateAsync({ id, data: productData })

      // 3. Variações
      if (isVariable) {
        const combos = generateVariations(form.attributes)
        const creates = []
        const updates = []

        combos.forEach((v) => {
          const key = varKey(v)
          const ov = variationOverrides[key] || varDefaults
          const existingId = ov.existingId
          // SKU: vai SOMENTE no produto pai. Variações ficam com SKU em branco
          // (evita conflito de SKU duplicado no WooCommerce).
          const sku = ''

          const payload = {
            attributes: v.attributes,
            status: 'publish',
            regular_price: ov.regular_price || '',
            sale_price: ov.sale_price || '',
            sku,
            weight: ov.weight || '',
            dimensions: {
              length: ov.length || '',
              width: ov.width || '',
              height: ov.height || '',
            },
            manage_stock: ov.stock_quantity !== '',
            stock_quantity: ov.stock_quantity !== ''
              ? parseInt(ov.stock_quantity, 10)
              : null,
            // Foto da variação: se tem imageId próprio, usa ele; senão a primeira foto do produto
            image: ov.imageId
              ? { id: ov.imageId }
              : (imageIds[0] ? { id: imageIds[0].id } : undefined),
          }

          if (existingId) {
            updates.push({ id: existingId, ...payload })
          } else {
            creates.push(payload)
          }
        })

        // IDs das variações existentes que NÃO estão mais nas combos atuais (foram removidas)
        const currentKeys = combos.map(varKey)
        const deletes = existingVariations
          .filter((v) => {
            const k = (v.attributes || [])
              .slice()
              .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
              .map((a) => `${a.name}:${a.option}`)
              .join('|')
            return !currentKeys.includes(k)
          })
          .map((v) => v.id)

        const batchPayload = {}
        if (creates.length > 0) batchPayload.create = creates
        if (updates.length > 0) batchPayload.update = updates
        if (deletes.length > 0) batchPayload.delete = deletes

        if (Object.keys(batchPayload).length > 0) {
          const batchResult = await batchUpdateVariations(savedProduct.id, batchPayload)
          // WooCommerce pode retornar erros DENTRO da resposta sem rejeitar a promise
          const allItems = [
            ...(batchResult?.create || []),
            ...(batchResult?.update || []),
            ...(batchResult?.delete || []),
          ]
          const failed = allItems.filter((item) => item?.error)
          if (failed.length > 0) {
            const first = failed[0].error
            console.error('[ProductForm] Erros no batch:', failed)
            throw new Error(`Variação: ${first.message || first.code || 'erro desconhecido'}`)
          }
        }
      }

      setSaved(true)
      toast.success(isNew ? 'Produto criado com sucesso!' : 'Produto atualizado!')
      navigate('/inventory')
    } catch (err) {
      console.error('[ProductForm] Erro ao salvar:', err)
      console.error('[ProductForm] Response:', err?.response?.data)
      const apiMsg = err?.response?.data?.message
      const apiCode = err?.response?.data?.code
      const detail = apiMsg ? `${apiMsg}${apiCode ? ` (${apiCode})` : ''}` : err.message
      toast.error(detail || 'Erro ao salvar produto', { duration: 6000 })
    } finally {
      setUploading(false)
    }
  }

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  const generatedVariations = generateVariations(form.attributes)

  const inputClass = 'w-full h-11 px-3 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#a1a1aa]'
  const priceInputClass = 'w-full h-11 pl-9 pr-3 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#a1a1aa]'
  const unitInputClass = 'w-full h-11 px-3 pr-10 text-sm bg-white border border-[#e4e4e7] rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-[#a1a1aa]'

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <Header
        title={isNew ? 'Novo produto' : 'Editar produto'}
        right={
          <Button size="sm" loading={uploading || saveProduct.isPending} onClick={handleSave}>
            {saved ? <Check size={16} /> : null}
            Salvar produto
          </Button>
        }
      />

      <div className="max-w-mobile mx-auto px-4 pb-32 space-y-4 py-4">

        {/* Card 1: Nome e descrição */}
        <Card>
          <CardTitle>Nome e descrição</CardTitle>
          <div className="space-y-3">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setField('name', e.target.value)}
              placeholder="Ex: Blusa Floral"
              required
            />
            <Textarea
              label="Descrição"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Descreva o produto..."
            />
          </div>
        </Card>

        {/* Card 2: Fotos */}
        <Card>
          <CardTitle>Fotos e vídeos</CardTitle>
          <PhotoUploader photos={form.photos} onChange={(p) => setField('photos', p)} />
        </Card>

        {/* Card 3: Categorias */}
        <Card>
          <CardTitle>Categorias</CardTitle>
          <CategorySelector
            selected={form.categories}
            onChange={(cats) => setField('categories', cats)}
          />
        </Card>

        {/* Card 4: Variações */}
        <Card>
          <CardTitle>Variações</CardTitle>

          {/* Propriedades */}
          <div className="mb-4">
            <p className="text-[18px] font-semibold text-[#1a1a1a] mb-3">Propriedades</p>
            <PropertySelector
              attributes={form.attributes}
              onRemoveValue={handleRemoveVariationValue}
              onRemoveAttribute={handleRemoveAttribute}
              formSnapshot={form}
            />
          </div>

          {/* Campos globais — só aparecem quando há atributos */}
          {form.attributes.length > 0 && (
            <div className="space-y-4 border-t border-[#e4e4e7] pt-4">

              {/* SKU */}
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[#52525b]">SKU (mesmo para todas as variações)</label>
                <input
                  value={varDefaults.sku}
                  onChange={(e) => setVarDefault('sku', e.target.value)}
                  placeholder="Ex: BLU-001"
                  className={inputClass}
                />
              </div>

              {/* Preços */}
              <p className="text-[15px] font-semibold text-[#1a1a1a]">Preços</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[#52525b]">Preço de venda</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#52525b]">R$</span>
                    <input type="number" step="0.01" min="0" value={varDefaults.regular_price}
                      onChange={(e) => setVarDefault('regular_price', e.target.value)}
                      placeholder="0,00" className={priceInputClass} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[#52525b]">Preço promocional</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#52525b]">R$</span>
                    <input type="number" step="0.01" min="0" value={varDefaults.sale_price}
                      onChange={(e) => setVarDefault('sale_price', e.target.value)}
                      placeholder="0,00" className={priceInputClass} />
                  </div>
                </div>
              </div>

              {/* Estoque */}
              <p className="text-[15px] font-semibold text-[#1a1a1a]">Estoque</p>
              <div className="flex flex-col gap-1">
                <label className="text-[12px] font-medium text-[#52525b]">Quantidade por variação</label>
                <input type="number" min="0" value={varDefaults.stock_quantity}
                  onChange={(e) => setVarDefault('stock_quantity', e.target.value)}
                  placeholder="Ex: 10" className={inputClass} />
              </div>

              {/* Peso e dimensões */}
              <p className="text-[15px] font-semibold text-[#1a1a1a]">Peso e dimensões</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[#52525b]">Peso</label>
                  <div className="relative">
                    <input type="number" step="0.001" min="0" value={varDefaults.weight}
                      onChange={(e) => setVarDefault('weight', e.target.value)}
                      placeholder="0.00" className={unitInputClass} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a1a1aa]">kg</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[#52525b]">Comprimento</label>
                  <div className="relative">
                    <input type="number" step="0.1" min="0" value={varDefaults.length}
                      onChange={(e) => setVarDefault('length', e.target.value)}
                      placeholder="0" className={unitInputClass} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a1a1aa]">cm</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[#52525b]">Largura</label>
                  <div className="relative">
                    <input type="number" step="0.1" min="0" value={varDefaults.width}
                      onChange={(e) => setVarDefault('width', e.target.value)}
                      placeholder="0" className={unitInputClass} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a1a1aa]">cm</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[12px] font-medium text-[#52525b]">Altura</label>
                  <div className="relative">
                    <input type="number" step="0.1" min="0" value={varDefaults.height}
                      onChange={(e) => setVarDefault('height', e.target.value)}
                      placeholder="0" className={unitInputClass} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#a1a1aa]">cm</span>
                  </div>
                </div>
              </div>

              {/* Botão Aplicar a todos */}
              <button
                type="button"
                onClick={handleApplyAll}
                className="w-full h-11 bg-primary text-white rounded-xl text-sm font-medium hover:bg-[#2a3929] active:scale-95 transition-transform"
              >
                Aplicar a todos
              </button>

              {/* Lista de variações geradas */}
              {generatedVariations.length > 0 && (
                <div className="space-y-2 pt-2">
                  <p className="text-[13px] font-medium text-[#52525b]">Variações geradas</p>
                  {generatedVariations.map((v, i) => {
                    const key = varKey(v)
                    const ov  = variationOverrides[key]
                    // Busca a variação existente pelo MESMO conjunto de atributos (não pelo index)
                    const existing = existingVariations.find((ev) => {
                      const evKey = (ev.attributes || [])
                        .slice()
                        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                        .map((a) => `${a.name}:${a.option}`)
                        .join('|')
                      return evKey === key
                    })
                    // Foto da variação no preview do card:
                    // 1. Se há override (foto escolhida no app agora), pega ela
                    // 2. Senão, foto da variação existente no Woo
                    // 3. Por fim, foto principal do produto
                    const overrideSrc = ov?.imageId
                      ? form.photos.find((p) => p.id === ov.imageId)?.src
                      : null
                    const variationImageSrc = overrideSrc || existing?.image?.src || mainPhotoSrc
                    const variationImageId  = ov?.imageId ?? existing?.image?.id ?? null

                    return (
                      <VariationCard
                        key={i}
                        productPhotos={form.photos}
                        variation={{
                          ...v,
                          id: existing?.id,
                          regular_price: ov?.regular_price || varDefaults.regular_price,
                          stock_quantity: ov?.stock_quantity !== undefined
                            ? (ov.stock_quantity !== '' ? parseInt(ov.stock_quantity, 10) : null)
                            : (varDefaults.stock_quantity !== '' ? parseInt(varDefaults.stock_quantity, 10) : null),
                          manage_stock: (ov?.stock_quantity ?? varDefaults.stock_quantity) !== '',
                          sku: ov?.sku || varDefaults.sku,
                          weight: ov?.weight || varDefaults.weight,
                          dimensions: {
                            length: ov?.length || varDefaults.length,
                            width: ov?.width || varDefaults.width,
                            height: ov?.height || varDefaults.height,
                          },
                          image: variationImageSrc
                            ? { id: variationImageId, src: variationImageSrc }
                            : null,
                        }}
                        onEdit={(updated) => handleEditVariation(key, updated)}
                        onDelete={() => handleDeleteVariation(v)}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Card 5: Tags/SEO */}
        <Card>
          <CardTitle>SEO e busca na loja</CardTitle>
          <p className="text-sm text-[#52525b] mb-3">
            Adicione palavras-chave para ajudar seus clientes a encontrar este produto na loja.
          </p>
          <div className="flex flex-wrap gap-2 p-3 border border-[#e4e4e7] rounded-xl min-h-[44px]">
            {form.tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 bg-[#f4f4f5] text-[#52525b] text-sm px-2 py-0.5 rounded-full">
                {tag}
                <button type="button" onClick={() => setField('tags', form.tags.filter((t) => t !== tag))}
                  className="text-[#a1a1aa] hover:text-red-500 text-xs leading-none">×</button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => tagInput && addTag(tagInput)}
              placeholder={form.tags.length === 0 ? 'Digite uma tag e pressione Enter...' : ''}
              className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
            />
          </div>
        </Card>
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#e4e4e7] max-w-mobile mx-auto">
        <Button fullWidth size="lg" loading={uploading || saveProduct.isPending} onClick={handleSave}>
          Salvar produto
        </Button>
      </div>

      {/* Upload overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm font-medium text-[#1a1a1a]">Enviando fotos...</p>
          </div>
        </div>
      )}
    </div>
  )
}
