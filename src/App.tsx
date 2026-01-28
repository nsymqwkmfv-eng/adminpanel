import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Papa from 'papaparse'
import Cropper from 'react-easy-crop'
import { Trash, Moon, Sun, Upload, Plus, MagnifyingGlass, X } from 'phosphor-react'
import 'react-easy-crop/react-easy-crop.css'
import './App.css'

// Debounce utility for search input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Track loaded images globally to prevent reloading
const loadedImages = new Set<string>()

// Memoized table row component for better performance
const TableRow = memo(({ 
  product, 
  index, 
  onClick,
  issues = []
}: { 
  product: Product
  index: number
  onClick: (product: Product) => void
  issues?: string[]
}) => {
  // Helper to get tag label and color with short abbreviations
  const getIssueTag = (issue: string) => {
    const tagMap: Record<string, { label: string; short: string; color: string }> = {
      'duplicate-slug': { label: 'Duplicate Slug', short: 'DUP-SLUG', color: '#ef4444' },
      'duplicate-title': { label: 'Duplicate Title', short: 'DUP-TITLE', color: '#f97316' },
      'no-price-15ml': { label: 'Missing 15ml Price', short: '15ML', color: '#eab308' },
      'no-price-30ml': { label: 'Missing 30ml Price', short: '30ML', color: '#eab308' },
      'no-price-50ml': { label: 'Missing 50ml Price', short: '50ML', color: '#eab308' },
      'no-image': { label: 'Missing Image', short: 'IMG', color: '#ec4899' },
      'no-top-notes': { label: 'Missing Top Notes', short: 'TOP', color: '#a78bfa' },
      'no-heart-notes': { label: 'Missing Heart Notes', short: 'HEART', color: '#a78bfa' },
      'no-base-notes': { label: 'Missing Base Notes', short: 'BASE', color: '#a78bfa' },
      'no-brand': { label: 'Missing Brand', short: 'BRAND', color: '#06b6d4' },
      'no-link': { label: 'Missing Link', short: 'LINK', color: '#3b82f6' },
      'no-slug': { label: 'Missing Slug', short: 'SLUG', color: '#ef4444' }
    }
    return tagMap[issue] || { label: issue, short: issue.toUpperCase(), color: '#6b7280' }
  }

  // Images are preloaded, so we can use them directly
  return (
    <tr 
      onClick={() => onClick(product)}
      className="table-row"
      data-has-issues={issues.length > 0 ? 'true' : 'false'}
    >
      <td data-label="Title" className="table-cell">
        <div className="title-with-indicators">
          <div className="title-content">
            <div className="row-number">{index + 1}</div>
            <span>{product.title}</span>
          </div>
          {issues.length > 0 && (
            <div className="quality-tags-inline">
              {issues.map((issue) => {
                const tag = getIssueTag(issue)
                return (
                  <span
                    key={issue}
                    className="quality-tag"
                    title={tag.label}
                    style={{ backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }}
                  >
                    {tag.short}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </td>
      <td data-label="Slug" className="table-cell slug-cell">{product.slug}</td>
      <td data-label="Image" className="table-cell">
        <img 
          src={product.image} 
          alt={product.title} 
          className="table-image"
        />
      </td>
      <td data-label="Image Alt" className="table-cell slug-cell">{product.image_alt}</td>
      <td data-label="Gender" className="table-cell">{product.gender}</td>
      <td data-label="Price 15ml" className="table-cell">{product.price_15ml}</td>
      <td data-label="Price 30ml" className="table-cell">{product.price_30ml}</td>
      <td data-label="Price 50ml" className="table-cell">{product.price_50ml}</td>
      <td data-label="Brand" className="table-cell">{product.brand}</td>
      <td data-label="Top Notes" className="table-cell notes-cell">{product.top_notes}</td>
      <td data-label="Heart Notes" className="table-cell notes-cell">{product.heart_notes}</td>
      <td data-label="Base Notes" className="table-cell notes-cell">{product.base_notes}</td>
      <td data-label="Link" className="table-cell link-cell">
        <a href={product.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
          {product.link ? 'Link' : '-'}
        </a>
      </td>
      <td data-label="Stock" className="table-cell">
        <span className="stock-badge" data-stock={product.stock_status}>
          {product.stock_status}
        </span>
      </td>
    </tr>
  )
}, (prevProps, nextProps) => {
  // Only re-render if product data changed, not on parent renders
  return prevProps.product.slug === nextProps.product.slug &&
         prevProps.index === nextProps.index &&
         JSON.stringify(prevProps.issues) === JSON.stringify(nextProps.issues)
})

TableRow.displayName = 'TableRow'

interface Product {
  slug: string
  title: string
  image: string
  image_alt: string
  gender: string
  price_15ml: string
  price_30ml: string
  price_50ml: string
  brand: string
  top_notes: string
  heart_notes: string
  base_notes: string
  link: string
  stock_status: string
}

interface Note {
  Slug: string
  Title: string
  Image: string
  'Image:alt': string
  Content: string
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, 150)
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [noteSearchTerm, setNoteSearchTerm] = useState('')
  const debouncedNoteSearchTerm = useDebounce(noteSearchTerm, 150)
  const [showAddNoteModal, setShowAddNoteModal] = useState(false)
  const [newNote, setNewNote] = useState({ Title: '', Image: '', Content: '' })
  const [showNoteSelector, setShowNoteSelector] = useState<'top' | 'heart' | 'base' | null>(null)
  const [noteSelectorSearch, setNoteSelectorSearch] = useState('')
  const debouncedNoteSelectorSearch = useDebounce(noteSelectorSearch, 150)
  const [editedProduct, setEditedProduct] = useState<Product | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [dataQualityIssues, setDataQualityIssues] = useState<Map<string, string[]>>(new Map())
  const [showQualityFilter, setShowQualityFilter] = useState(false)

  const theme = isDarkMode ? 'dark' : 'light'

  // Function to check data quality issues
  const checkDataQuality = (productsData: Product[]): Map<string, string[]> => {
    const issues = new Map<string, string[]>()
    const slugCounts = new Map<string, number>()
    const titleCounts = new Map<string, number>()

    // Count occurrences for duplicate detection
    productsData.forEach(product => {
      const slug = product.slug?.toLowerCase() || ''
      const title = product.title?.toLowerCase() || ''
      slugCounts.set(slug, (slugCounts.get(slug) || 0) + 1)
      titleCounts.set(title, (titleCounts.get(title) || 0) + 1)
    })

    // Check each product for issues
    productsData.forEach(product => {
      const productIssues: string[] = []

      // Check for duplicate slug
      if ((slugCounts.get(product.slug?.toLowerCase() || '') || 0) > 1) {
        productIssues.push('duplicate-slug')
      }

      // Check for duplicate title
      if ((titleCounts.get(product.title?.toLowerCase() || '') || 0) > 1) {
        productIssues.push('duplicate-title')
      }

      // Check for missing prices
      if (!product.price_15ml || product.price_15ml.trim() === '') {
        productIssues.push('no-price-15ml')
      }
      if (!product.price_30ml || product.price_30ml.trim() === '') {
        productIssues.push('no-price-30ml')
      }
      if (!product.price_50ml || product.price_50ml.trim() === '') {
        productIssues.push('no-price-50ml')
      }

      // Check for missing image
      if (!product.image || product.image.trim() === '') {
        productIssues.push('no-image')
      }

      // Check for missing description/notes
      if (!product.top_notes || product.top_notes.trim() === '') {
        productIssues.push('no-top-notes')
      }
      if (!product.heart_notes || product.heart_notes.trim() === '') {
        productIssues.push('no-heart-notes')
      }
      if (!product.base_notes || product.base_notes.trim() === '') {
        productIssues.push('no-base-notes')
      }

      // Check for missing brand
      if (!product.brand || product.brand.trim() === '') {
        productIssues.push('no-brand')
      }

      // Check for missing link
      if (!product.link || product.link.trim() === '') {
        productIssues.push('no-link')
      }

      // Check for empty slug
      if (!product.slug || product.slug.trim() === '') {
        productIssues.push('no-slug')
      }

      if (productIssues.length > 0) {
        issues.set(product.slug || product.title || 'unknown', productIssues)
      }
    })

    return issues
  }

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const preloadData = async () => {
      try {
        // Load CSVs
        setLoadingProgress(10)
        const [mainResponse, notesResponse] = await Promise.all([
          fetch('/main.csv').then(r => r.text()),
          fetch('/Notes.csv').then(r => r.text())
        ])

        setLoadingProgress(30)

        // Parse CSVs
        const productsData = await new Promise<Product[]>((resolve) => {
          Papa.parse(mainResponse, {
            header: true,
            complete: (results) => resolve(results.data as Product[])
          })
        })

        const notesData = await new Promise<Note[]>((resolve) => {
          Papa.parse(notesResponse, {
            header: true,
            complete: (results) => resolve(results.data as Note[])
          })
        })

        setLoadingProgress(50)

        // Preload all images in parallel batches
        const allImages = [
          ...productsData.map(p => p.image),
          ...notesData.map(n => n.Image)
        ].filter(Boolean)
        .filter((src, idx, arr) => arr.indexOf(src) === idx) // Remove duplicates

        if (allImages.length === 0) {
          setLoadingProgress(95)
          setProducts(productsData)
          setNotes(notesData)
          setTimeout(() => {
            setLoadingProgress(100)
            setIsLoading(false)
          }, 300)
          return
        }

        let loadedCount = 0
        const imagePromises = allImages.map((src) => {
          return new Promise((resolve) => {
            const img = new Image()
            
            const handleLoad = () => {
              loadedImages.add(src)
              loadedCount++
              const progress = 50 + Math.floor((loadedCount / allImages.length) * 45)
              setLoadingProgress(Math.min(progress, 95))
              resolve(true)
            }
            
            const handleError = () => {
              loadedCount++
              const progress = 50 + Math.floor((loadedCount / allImages.length) * 45)
              setLoadingProgress(Math.min(progress, 95))
              console.warn(`Failed to load image: ${src}`)
              resolve(false)
            }
            
            img.onload = handleLoad
            img.onerror = handleError
            img.src = src
          })
        })

        // Load all images in parallel
        await Promise.all(imagePromises)

        setLoadingProgress(95)
        setProducts(productsData)
        setNotes(notesData)
        
        // Check data quality issues
        const issues = checkDataQuality(productsData)
        setDataQualityIssues(issues)
        
        // Small delay for smooth transition
        setTimeout(() => {
          setLoadingProgress(100)
          setIsLoading(false)
        }, 300)
      } catch (error) {
        console.error('Error loading data:', error)
        setIsLoading(false)
      }
    }

    preloadData()
  }, [])

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product =>
      product.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      product.slug?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
    )
    
    // Filter by quality issues if filter is active
    if (showQualityFilter) {
      filtered = filtered.filter(product =>
        dataQualityIssues.has(product.slug || product.title || '')
      )
    }
    
    return filtered
  }, [products, debouncedSearchTerm, showQualityFilter, dataQualityIssues])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const filteredNotes = useMemo(() => {
    return notes.filter(note =>
      note.Title.toLowerCase().includes(debouncedNoteSearchTerm.toLowerCase()) ||
      note.Slug.toLowerCase().includes(debouncedNoteSearchTerm.toLowerCase())
    )
  }, [notes, debouncedNoteSearchTerm])

  const handleAddNote = useCallback(() => {
    if (newNote.Title && newNote.Image) {
      const slug = newNote.Title.toLowerCase().replace(/\s+/g, '-')
      const note: Note = {
        Slug: slug,
        Title: newNote.Title,
        Image: newNote.Image,
        'Image:alt': '',
        Content: newNote.Content || '<p><br></p>'
      }
      setNotes([...notes, note])
      setSelectedNote(note)
      setNewNote({ Title: '', Image: '', Content: '' })
      setShowAddNoteModal(false)
    }
  }, [newNote, notes])

  const filteredNoteSelectorNotes = useMemo(() => {
    return notes.filter(note =>
      note.Title.toLowerCase().includes(debouncedNoteSelectorSearch.toLowerCase())
    )
  }, [notes, debouncedNoteSelectorSearch])

  const parseNotes = (notesString: string): string[] => {
    return notesString ? notesString.split(',').map((n: string) => n.trim()).filter(Boolean) : []
  }

  const getNoteImage = (noteTitle: string): string | null => {
    const note = notes.find(n => n.Title.toLowerCase() === noteTitle.toLowerCase())
    return note ? note.Image : null
  }

  const handleProductUpdate = useCallback((field: string, value: string) => {
    setEditedProduct(prev => {
      const current = prev || selectedProduct
      if (!current) return prev
      const updated = { ...current, [field]: value }
      setHasUnsavedChanges(true)
      return updated
    })
  }, [selectedProduct])

  const addNoteToField = useCallback((noteTitle: string, field: 'top' | 'heart' | 'base') => {
    const current = editedProduct || selectedProduct
    if (!current) return
    
    const fieldMap: Record<string, keyof Product> = {
      top: 'top_notes',
      heart: 'heart_notes',
      base: 'base_notes'
    }
    
    const currentNotes = current[fieldMap[field]] as string
    const notesArray = currentNotes ? currentNotes.split(',').map((n: string) => n.trim()) : []
    
    if (!notesArray.includes(noteTitle)) {
      const updatedNotes = [...notesArray, noteTitle].join(', ')
      handleProductUpdate(fieldMap[field] as string, updatedNotes)
    }
    
    setShowNoteSelector(null)
    setNoteSelectorSearch('')
  }, [editedProduct, selectedProduct, handleProductUpdate])

  const removeNoteFromField = useCallback((noteTitle: string, field: 'top' | 'heart' | 'base') => {
    const current = editedProduct || selectedProduct
    if (!current) return
    
    const fieldMap: Record<string, keyof Product> = {
      top: 'top_notes',
      heart: 'heart_notes',
      base: 'base_notes'
    }
    
    const currentNotes = current[fieldMap[field]] as string
    const notesArray = currentNotes ? currentNotes.split(',').map((n: string) => n.trim()) : []
    const updatedNotes = notesArray.filter((n: string) => n !== noteTitle).join(', ')
    handleProductUpdate(fieldMap[field] as string, updatedNotes)
  }, [editedProduct, selectedProduct, handleProductUpdate])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && selectedProduct) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string
        setCropImage(imageUrl)
        setShowCropModal(true)
      }
      reader.readAsDataURL(file)
    }
  }, [selectedProduct])

  const handleCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const getCroppedImg = useCallback(async () => {
    if (!cropImage || !croppedAreaPixels || !selectedProduct) return

    const image = new Image()
    image.src = cropImage
    await new Promise(resolve => { image.onload = resolve })

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = croppedAreaPixels.width
    canvas.height = croppedAreaPixels.height

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    )

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob)
        handleProductUpdate('image', url)
        setShowCropModal(false)
        setCropImage(null)
      }
    })
  }, [cropImage, croppedAreaPixels, selectedProduct, handleProductUpdate])

  const handleSaveChanges = useCallback(() => {
    if (editedProduct && selectedProduct) {
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.slug === selectedProduct.slug ? editedProduct : p
        )
      )
      setSelectedProduct(editedProduct)
      setEditedProduct(null)
      setHasUnsavedChanges(false)
    }
  }, [editedProduct, selectedProduct])

  const handleDiscardChanges = useCallback(() => {
    setEditedProduct(null)
    setHasUnsavedChanges(false)
    setShowConfirmModal(false)
    if (pendingAction) {
      pendingAction()
      setPendingAction(null)
    }
  }, [pendingAction])

  const handleCloseWithCheck = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setShowDetailPanel(false)
        setSelectedProduct(null)
        setEditedProduct(null)
      })
      setShowConfirmModal(true)
    } else {
      setShowDetailPanel(false)
      setSelectedProduct(null)
      setEditedProduct(null)
    }
  }, [hasUnsavedChanges])

  const handleProductClick = useCallback((product: Product) => {
    if (hasUnsavedChanges) {
      setPendingAction(() => () => {
        setSelectedProduct(product)
        setEditedProduct(null)
        setShowDetailPanel(true)
      })
      setShowConfirmModal(true)
    } else {
      setSelectedProduct(product)
      setEditedProduct(null)
      setShowDetailPanel(true)
    }
  }, [hasUnsavedChanges])

  const handleDeleteProduct = useCallback((product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete ${product.title}?`)) {
      const updatedProducts = products.filter(p => p.slug !== product.slug)
      setProducts(updatedProducts)
      
      if (selectedProduct?.slug === product.slug) {
        setSelectedProduct(updatedProducts[0] || null)
        setShowDetailPanel(false)
      }
    }
  }, [products, selectedProduct])

  if (isLoading) {
    return (
      <div className={`app ${theme} loading-screen`}>
        <div className="loader-container">
          <div className="loader-spinner"></div>
          <h2 className="loader-title">Ətir İdarəsi</h2>
          <p className="loader-text">Yüklənir...</p>
          <div className="loader-progress-bar">
            <div 
              className="loader-progress-fill" 
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <p className="loader-percentage">{loadingProgress}%</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${theme}`}>
      <div className="app-header">
        <div className="header-left">
          <h1>Ətir İdarəsi</h1>
          <div className="search-box">
            <MagnifyingGlass size={20} weight="duotone" />
            <input
              type="text"
              placeholder="Axtar..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="header-actions">
          <button 
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Sun size={20} weight="duotone" /> : <Moon size={20} weight="duotone" />}
          </button>
          <button className="notes-toggle" onClick={() => setShowNotesPanel(true)}>
            Notlar
          </button>
        </div>
      </div>

      <div className="table-container">
        {dataQualityIssues.size > 0 && (
          <div className="quality-summary">
            <strong>⚠️ Data Quality Issues:</strong>
            <span>{dataQualityIssues.size} products need attention</span>
            <button
              className={`quality-filter-btn ${showQualityFilter ? 'active' : ''}`}
              onClick={() => setShowQualityFilter(!showQualityFilter)}
            >
              {showQualityFilter ? 'Show All' : 'Show Issues Only'}
            </button>
          </div>
        )}
        <table className="perfume-table">
          <thead>
            <tr>
              <th>Adı</th>
              <th>Slug</th>
              <th>Şəkil</th>
              <th>Şəkil Alt</th>
              <th>Cins</th>
              <th>15ml</th>
              <th>30ml</th>
              <th>50ml</th>
              <th>Brend</th>
              <th>Top Notlar</th>
              <th>Ürək Notlar</th>
              <th>Baza Notlar</th>
              <th>Link</th>
              <th>Stok</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <TableRow
                key={product.slug}
                product={product}
                index={index}
                onClick={handleProductClick}
                issues={dataQualityIssues.get(product.slug || product.title || '') || []}
              />
            ))}
          </tbody>
        </table>
      </div>

      {showDetailPanel && selectedProduct && (
        <>
          <div className="detail-overlay" onClick={handleCloseWithCheck} />
          <div className="detail-panel">
            <div className="detail-header">
              <h2>Ətir Redaktəsi</h2>
              <div className="detail-header-actions">
                <button className="close-btn" onClick={handleCloseWithCheck}>
                  <X size={24} weight="bold" />
                </button>
              </div>
            </div>

            <div className="detail-body">
              {(() => {
                const currentProduct = editedProduct || selectedProduct
                return (
                  <>
                    <div className="form-card">
                      <label className="card-title">Əsas Şəkil</label>
                      <input
                        type="file"
                        id="image-upload"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                      <div
                        className="image-preview-wrapper"
                        onClick={() => document.getElementById('image-upload')?.click()}
                      >
                        <img src={currentProduct.image} alt={currentProduct.title} />
                        <div className="upload-overlay">
                          <Upload size={32} weight="bold" />
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder="Image URL"
                        value={currentProduct.image}
                        onChange={(e) => handleProductUpdate('image', e.target.value)}
                        className="input-field"
                        style={{ marginTop: '12px' }}
                      />
                    </div>

                    <div className="form-card">
                      <label className="card-title">Məhsul Detalları</label>
                      <div className="form-row">
                        <div className="form-group">
                          <label className="field-label">Adı</label>
                          <input
                            type="text"
                            value={currentProduct.title}
                            onChange={(e) => handleProductUpdate('title', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div className="form-group">
                          <label className="field-label">Brend</label>
                          <input
                            type="text"
                            value={currentProduct.brand}
                            onChange={(e) => handleProductUpdate('brand', e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="field-label">Cins</label>
                          <select
                            value={currentProduct.gender}
                            onChange={(e) => handleProductUpdate('gender', e.target.value)}
                            className="input-field"
                          >
                            <option value="Kişi">Kişi</option>
                            <option value="Qadın">Qadın</option>
                            <option value="Unisex">Unisex</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="field-label">Stok</label>
                          <select
                            value={currentProduct.stock_status}
                            onChange={(e) => handleProductUpdate('stock_status', e.target.value)}
                            className="input-field"
                          >
                            <option value="Stokda Var">Stokda Var</option>
                            <option value="Stokda Yoxdur">Stokda Yoxdur</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="field-label">15ml Qiyməti</label>
                          <input
                            type="number"
                            value={currentProduct.price_15ml}
                            onChange={(e) => handleProductUpdate('price_15ml', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div className="form-group">
                          <label className="field-label">30ml Qiyməti</label>
                          <input
                            type="number"
                            value={currentProduct.price_30ml}
                            onChange={(e) => handleProductUpdate('price_30ml', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div className="form-group">
                          <label className="field-label">50ml Qiyməti</label>
                          <input
                            type="number"
                            value={currentProduct.price_50ml}
                            onChange={(e) => handleProductUpdate('price_50ml', e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-card">
                      <label className="card-title">Ətir Notları</label>
                      
                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <div className="notes-header-section">
                          <label className="field-label">Top Notları</label>
                          <button
                            className="add-note-btn-inline"
                            onClick={() => setShowNoteSelector('top')}
                          >
                            <Plus size={16} weight="bold" />
                            Add Note
                          </button>
                        </div>
                        <div className="note-tags-container">
                          {parseNotes(currentProduct.top_notes).map((note, index) => {
                            const noteImg = getNoteImage(note)
                            return (
                              <div key={index} className="note-tag">
                                {noteImg && <img src={noteImg} alt={note} />}
                                <span>{note}</span>
                                <button
                                  className="note-tag-remove"
                                  onClick={() => removeNoteFromField(note, 'top')}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="form-group" style={{ marginBottom: '16px' }}>
                        <div className="notes-header-section">
                          <label className="field-label">Ürək Notları</label>
                          <button
                            className="add-note-btn-inline"
                            onClick={() => setShowNoteSelector('heart')}
                          >
                            <Plus size={16} weight="bold" />
                            Add Note
                          </button>
                        </div>
                        <div className="note-tags-container">
                          {parseNotes(currentProduct.heart_notes).map((note, index) => {
                            const noteImg = getNoteImage(note)
                            return (
                              <div key={index} className="note-tag">
                                {noteImg && <img src={noteImg} alt={note} />}
                                <span>{note}</span>
                                <button
                                  className="note-tag-remove"
                                  onClick={() => removeNoteFromField(note, 'heart')}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      <div className="form-group">
                        <div className="notes-header-section">
                          <label className="field-label">Baza Notları</label>
                          <button
                            className="add-note-btn-inline"
                            onClick={() => setShowNoteSelector('base')}
                          >
                            <Plus size={16} weight="bold" />
                            Add Note
                          </button>
                        </div>
                        <div className="note-tags-container">
                          {parseNotes(currentProduct.base_notes).map((note, index) => {
                            const noteImg = getNoteImage(note)
                            return (
                              <div key={index} className="note-tag">
                                {noteImg && <img src={noteImg} alt={note} />}
                                <span>{note}</span>
                                <button
                                  className="note-tag-remove"
                                  onClick={() => removeNoteFromField(note, 'base')}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="form-card">
                      <label className="card-title">Əlavə Məlumat</label>
                      <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label className="field-label">Slug</label>
                        <input
                          type="text"
                          value={currentProduct.slug}
                          onChange={(e) => handleProductUpdate('slug', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="form-group">
                        <label className="field-label">Məhsul Linki</label>
                        <input
                          type="text"
                          value={currentProduct.link}
                          onChange={(e) => handleProductUpdate('link', e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button
                        className="delete-btn-full"
                        onClick={(e) => handleDeleteProduct(currentProduct, e)}
                      >
                        <Trash size={18} weight="bold" />
                        Məhsulu Sil
                      </button>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </>
      )}

      {showNotesPanel && (
        <div className="notes-panel">
          <div className="notes-header">
            <h2>Notes</h2>
            <div className="notes-header-actions">
              <button className="add-note-btn" onClick={() => setShowAddNoteModal(true)}>
                <Plus size={18} weight="bold" />
                Add Note
              </button>
              <button className="close-notes-btn" onClick={() => setShowNotesPanel(false)}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="notes-search">
            <MagnifyingGlass size={18} />
            <input
              type="text"
              placeholder="Search notes..."
              value={noteSearchTerm}
              onChange={(e) => setNoteSearchTerm(e.target.value)}
              className="notes-search-input"
            />
          </div>

          <div className="notes-content">
            <div className="notes-list">
              {filteredNotes.map((note) => (
                <div
                  key={note.Slug}
                  className={`note-item ${selectedNote?.Slug === note.Slug ? 'active' : ''}`}
                  onClick={() => setSelectedNote(note)}
                >
                  <img src={note.Image} alt={note.Title} className="note-item-image" />
                  <div className="note-item-content">
                    <h4>{note.Title}</h4>
                  </div>
                </div>
              ))}
            </div>

            {selectedNote && (
              <div className="note-detail">
                <img src={selectedNote.Image} alt={selectedNote.Title} className="note-detail-image" />
                <h3>{selectedNote.Title}</h3>
                <div className="note-detail-content" dangerouslySetInnerHTML={{ __html: selectedNote.Content }} />
              </div>
            )}
          </div>
        </div>
      )}

      {showAddNoteModal && (
        <div className="crop-modal-overlay">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h3>Add New Note</h3>
              <button
                className="crop-close-btn"
                onClick={() => {
                  setShowAddNoteModal(false)
                  setNewNote({ Title: '', Image: '', Content: '' })
                }}
              >
                ✕
              </button>
            </div>

            <div className="add-note-form">
              <div className="form-group">
                <label className="field-label">Title</label>
                <input
                  type="text"
                  value={newNote.Title}
                  onChange={(e) => setNewNote({ ...newNote, Title: e.target.value })}
                  className="input-field"
                  placeholder="Note title..."
                />
              </div>

              <div className="form-group">
                <label className="field-label">Image URL</label>
                <input
                  type="text"
                  value={newNote.Image}
                  onChange={(e) => setNewNote({ ...newNote, Image: e.target.value })}
                  className="input-field"
                  placeholder="https://..."
                />
              </div>

              <div className="form-group">
                <label className="field-label">Content (HTML)</label>
                <textarea
                  value={newNote.Content}
                  onChange={(e) => setNewNote({ ...newNote, Content: e.target.value })}
                  className="input-field textarea"
                  placeholder="<p>Note content...</p>"
                  rows={6}
                />
              </div>

              <div className="crop-actions">
                <button
                  className="crop-cancel-btn"
                  onClick={() => {
                    setShowAddNoteModal(false)
                    setNewNote({ Title: '', Image: '', Content: '' })
                  }}
                >
                  Cancel
                </button>
                <button
                  className="crop-save-btn"
                  onClick={handleAddNote}
                  disabled={!newNote.Title || !newNote.Image}
                >
                  Add Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showNoteSelector && (
        <div className="crop-modal-overlay" onClick={() => setShowNoteSelector(null)}>
          <div className="note-selector-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crop-modal-header">
              <h3>Select {showNoteSelector === 'top' ? 'Top' : showNoteSelector === 'heart' ? 'Heart' : 'Base'} Note</h3>
              <button
                className="crop-close-btn"
                onClick={() => setShowNoteSelector(null)}
              >
                ✕
              </button>
            </div>

            <div className="notes-search">
              <MagnifyingGlass size={18} />
              <input
                type="text"
                placeholder="Search notes..."
                value={noteSelectorSearch}
                onChange={(e) => setNoteSelectorSearch(e.target.value)}
                className="notes-search-input"
              />
            </div>

            <div className="note-selector-grid">
              {filteredNoteSelectorNotes.map((note) => (
                <div
                  key={note.Slug}
                  className="note-selector-item"
                  onClick={() => addNoteToField(note.Title, showNoteSelector)}
                >
                  <img src={note.Image} alt={note.Title} />
                  <span>{note.Title}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showCropModal && cropImage && (
        <div className="crop-modal-overlay">
          <div className="crop-modal">
            <div className="crop-modal-header">
              <h3>Crop Image</h3>
              <button
                className="crop-close-btn"
                onClick={() => {
                  setShowCropModal(false)
                  setCropImage(null)
                }}
              >
                ✕
              </button>
            </div>

            <div className="crop-container">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={3 / 4}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onCropComplete={handleCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div className="crop-controls">
              <div className="zoom-control">
                <label>Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="zoom-slider"
                />
              </div>

              <div className="crop-actions">
                <button
                  className="crop-cancel-btn"
                  onClick={() => {
                    setShowCropModal(false)
                    setCropImage(null)
                  }}
                >
                  Cancel
                </button>
                <button
                  className="crop-save-btn"
                  onClick={getCroppedImg}
                >
                  Crop & Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasUnsavedChanges && !showConfirmModal && (
        <div className="unsaved-changes-modal">
          <div className="unsaved-changes-content">
            <p>Dəyişikliklər edildi</p>
            <div className="unsaved-changes-actions">
              <button
                className="unsaved-discard-btn"
                onClick={handleDiscardChanges}
              >
                İmtina et
              </button>
              <button
                className="unsaved-save-btn"
                onClick={handleSaveChanges}
              >
                Yadda Saxla
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="confirm-modal">
          <div className="confirm-modal-header">
            <h3>Dəyişikliklər yadda saxlanılmayıb</h3>
          </div>
          <div className="confirm-modal-body">
            <p>Etdiyiniz dəyişikliklər yadda saxlanılmayıb. Davam etmək istəyirsiniz?</p>
          </div>
          <div className="confirm-modal-actions">
            <button
              className="confirm-cancel-btn"
              onClick={() => setShowConfirmModal(false)}
            >
              Ləğv et
            </button>
            <button
              className="confirm-discard-btn"
              onClick={handleDiscardChanges}
            >
              Dəyişiklikləri sil
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
