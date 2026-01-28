import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import Papa from 'papaparse'
import Cropper from 'react-easy-crop'
import { Trash, Moon, Sun, Upload, Plus, MagnifyingGlass, X } from 'phosphor-react'
import 'react-easy-crop/react-easy-crop.css'
import './App.css'

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

// Memoized Product Item Component
const ProductItem = memo(({ 
  product, 
  index, 
  isActive, 
  onSelect
}: {
  product: Product
  index: number
  isActive: boolean
  onSelect: (product: Product) => void
}) => (
  <div
    className={`product-item ${isActive ? 'active' : ''}`}
    onClick={() => onSelect(product)}
  >
    <div className="product-item-number">{index + 1}</div>
    <div className="product-item-content">
      <div className="product-item-name">{product.title}</div>
      <div className="product-item-brand">{product.brand}</div>
    </div>
  </div>
))

ProductItem.displayName = 'ProductItem'

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImage, setCropImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [noteSearchTerm, setNoteSearchTerm] = useState('')
  const [showAddNoteModal, setShowAddNoteModal] = useState(false)
  const [newNote, setNewNote] = useState({ Title: '', Image: '', Content: '' })
  const [showNoteSelector, setShowNoteSelector] = useState<'top' | 'heart' | 'base' | null>(null)
  const [noteSelectorSearch, setNoteSelectorSearch] = useState('')
  const [showDetailPanel, setShowDetailPanel] = useState(false)

  const theme = isDarkMode ? 'dark' : 'light'

  useEffect(() => {
    // Apply theme to document
    const root = document.documentElement
    if (isDarkMode) {
      root.setAttribute('data-theme', 'dark')
    } else {
      root.setAttribute('data-theme', 'light')
    }
  }, [isDarkMode])

  useEffect(() => {
    // Load CSV from public folder
    fetch('/main.csv')
      .then(response => response.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Product[]
            setProducts(data)
            if (data.length > 0) {
              setSelectedProduct(data[0])
            }
          },
          error: (error: Error) => {
            console.error('Error parsing CSV:', error)
          }
        })
      })
    
    // Load Notes CSV
    fetch('/Notes.csv')
      .then(response => response.text())
      .then(text => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            const data = results.data as Note[]
            setNotes(data)
            if (data.length > 0) {
              setSelectedNote(data[0])
            }
          },
          error: (error: Error) => {
            console.error('Error parsing Notes CSV:', error)
          }
        })
      })
  }, [])

  // Memoized filtered products - only recalculate when products or searchTerm changes
  const filteredProducts = useMemo(() => {
    return products.filter(product =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.slug.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [products, searchTerm])

  const handleSearch = useCallback((term: string) => {
    setSearchTerm(term)
  }, [])

  const filteredNotes = useMemo(() => {
    return notes.filter(note =>
      note.Title.toLowerCase().includes(noteSearchTerm.toLowerCase()) ||
      note.Slug.toLowerCase().includes(noteSearchTerm.toLowerCase())
    )
  }, [notes, noteSearchTerm])

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
      note.Title.toLowerCase().includes(noteSelectorSearch.toLowerCase())
    )
  }, [notes, noteSelectorSearch])

  const parseNotes = (notesString: string): string[] => {
    return notesString ? notesString.split(',').map((n: string) => n.trim()).filter(Boolean) : []
  }

  const getNoteImage = (noteTitle: string): string | null => {
    const note = notes.find(n => n.Title.toLowerCase() === noteTitle.toLowerCase())
    return note ? note.Image : null
  }


  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product)
  }

  const handleProductUpdate = useCallback((field: string, value: string) => {
    setSelectedProduct(prev => {
      if (!prev) return prev
      const updated = { ...prev, [field]: value }
      
      setProducts(prevProducts =>
        prevProducts.map(p =>
          p.slug === prev.slug ? updated : p
        )
      )
      
      return updated
    })
  }, [])

  const addNoteToField = useCallback((noteTitle: string, field: 'top' | 'heart' | 'base') => {
    if (!selectedProduct) return
    
    const fieldMap: Record<string, keyof Product> = {
      top: 'top_notes',
      heart: 'heart_notes',
      base: 'base_notes'
    }
    
    const currentNotes = selectedProduct[fieldMap[field]] as string
    const notesArray = currentNotes ? currentNotes.split(',').map((n: string) => n.trim()) : []
    
    if (!notesArray.includes(noteTitle)) {
      const updatedNotes = [...notesArray, noteTitle].join(', ')
      handleProductUpdate(fieldMap[field] as string, updatedNotes)
    }
    
    setShowNoteSelector(null)
    setNoteSelectorSearch('')
  }, [selectedProduct, handleProductUpdate])

  const removeNoteFromField = useCallback((noteTitle: string, field: 'top' | 'heart' | 'base') => {
    if (!selectedProduct) return
    
    const fieldMap: Record<string, keyof Product> = {
      top: 'top_notes',
      heart: 'heart_notes',
      base: 'base_notes'
    }
    
    const currentNotes = selectedProduct[fieldMap[field]] as string
    const notesArray = currentNotes ? currentNotes.split(',').map((n: string) => n.trim()) : []
    const updatedNotes = notesArray.filter((n: string) => n !== noteTitle).join(', ')
    handleProductUpdate(fieldMap[field] as string, updatedNotes)
  }, [selectedProduct, handleProductUpdate])

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

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (err) => reject(err))
      image.setAttribute('crossOrigin', 'anonymous')
      image.src = url
    })

  const getCroppedImg = useCallback(async () => {
    if (!cropImage || !croppedAreaPixels) return

    try {
      const image = await createImage(cropImage)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      if (!ctx) return

      const { width, height, x, y } = croppedAreaPixels

      canvas.width = width
      canvas.height = height

      ctx.drawImage(
        image,
        x,
        y,
        width,
        height,
        0,
        0,
        width,
        height
      )

      const croppedImage = canvas.toDataURL('image/jpeg')
      handleProductUpdate('image', croppedImage)
      setShowCropModal(false)
      setCropImage(null)
    } catch (error) {
      console.error('Error cropping image:', error)
    }
  }, [cropImage, croppedAreaPixels])

  const handleDeleteProduct = useCallback((product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (window.confirm(`Are you sure you want to delete "${product.title}"?`)) {
      setProducts(prevProducts => {
        const updatedProducts = prevProducts.filter(p => p.slug !== product.slug)
        
        if (selectedProduct?.slug === product.slug) {
          setSelectedProduct(updatedProducts[0] || null)
        }
        
        return updatedProducts
      })
    }
  }, [selectedProduct])

  return (
    <div className={`app ${theme}`}>
      {/* Header */}
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

      {/* Table View */}
      <div className="table-container">
        <table className="perfume-table">
          <thead>
            <tr>
              <th>Adi</th>
              <th>Slug</th>
              <th>Şəkil</th>
              <th>Cins</th>
              <th>15ml qiymət</th>
              <th>30ml qiymət</th>
              <th>50ml qiymət</th>
              <th>Brend adı</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product, index) => (
              <tr 
                key={product.slug}
                onClick={() => {
                  setSelectedProduct(product)
                  setShowDetailPanel(true)
                }}
                className="table-row"
              >
                <td>
                  <div className="row-number">{index + 1}</div>
                  {product.title}
                </td>
                <td className="slug-cell">{product.slug}</td>
                <td>
                  <img src={product.image} alt={product.title} className="table-image" />
                </td>
                <td>{product.gender}</td>
                <td>{product.price_15ml}</td>
                <td>{product.price_30ml}</td>
                <td>{product.price_50ml}</td>
                <td>{product.brand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {showDetailPanel && selectedProduct && (
        <>
          <div className="detail-overlay" onClick={() => setShowDetailPanel(false)} />
          <div className="detail-panel">
            <div className="detail-header">
              <h2>Ətir Redaktəsi</h2>
              <button className="close-btn" onClick={() => setShowDetailPanel(false)}>
                <X size={24} weight="bold" />
              </button>
            </div>

            <div className="detail-body">
              {/* Image Section */}
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
                  <img src={selectedProduct.image} alt={selectedProduct.title} />
                  <div className="upload-overlay">
                    <Upload size={32} weight="bold" />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Image URL"
                  value={selectedProduct.image}
                  onChange={(e) => handleProductUpdate('image', e.target.value)}
                  className="input-field"
                  style={{ marginTop: '12px' }}
                />
              </div>

              {/* Details Section */}
              <div className="form-card">
                <label className="card-title">Məhsul Detalları</label>
                  {/* Row 1: Title and Brand */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="field-label">Adı</label>
                      <input
                        type="text"
                        value={selectedProduct.title}
                        onChange={(e) => handleProductUpdate('title', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label className="field-label">Brend</label>
                      <input
                        type="text"
                        value={selectedProduct.brand}
                        onChange={(e) => handleProductUpdate('brand', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  {/* Row 2: Gender and Stock */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="field-label">Cins</label>
                      <select
                        value={selectedProduct.gender}
                        onChange={(e) => handleProductUpdate('gender', e.target.value)}
                        className="input-field"
                      >
                        <option value="Kişi">Kişi</option>
                        <option value="Qadın">Qadın</option>
                        <option value="Unisex">Unisex</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="field-label">Stok Vəziyyəti</label>
                      <select
                        value={selectedProduct.stock_status}
                        onChange={(e) => handleProductUpdate('stock_status', e.target.value)}
                        className="input-field"
                      >
                        <option value="Stokda Var">Stokda Var</option>
                        <option value="Stokda Yoxdur">Stokda Yoxdur</option>
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Prices */}
                  <div className="form-row">
                    <div className="form-group">
                      <label className="field-label">15ml Qiyməti</label>
                      <input
                        type="number"
                        value={selectedProduct.price_15ml}
                        onChange={(e) => handleProductUpdate('price_15ml', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label className="field-label">30ml Qiyməti</label>
                      <input
                        type="number"
                        value={selectedProduct.price_30ml}
                        onChange={(e) => handleProductUpdate('price_30ml', e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label className="field-label">50ml Qiyməti</label>
                      <input
                        type="number"
                        value={selectedProduct.price_50ml}
                        onChange={(e) => handleProductUpdate('price_50ml', e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fragrance Notes Section */}
              <div className="form-card">
                <label className="card-title">Ətir Notları</label>
                <div className="form-group">
                  <div className="notes-header-section">
                    <label className="field-label">Top Notları</label>
                    <button
                      className="add-note-to-field-btn"
                      onClick={() => setShowNoteSelector('top')}
                    >
                      <Plus size={16} weight="bold" />
                      Add Note
                    </button>
                  </div>
                  <div className="notes-display">
                    {parseNotes(selectedProduct.top_notes).map((note, index) => {
                      const noteImg = getNoteImage(note)
                      return (
                        <div key={index} className="note-tag">
                          {noteImg && <img src={noteImg} alt={note} className="note-tag-image" />}
                          <span>{note}</span>
                          <button
                            className="remove-note-btn"
                            onClick={() => removeNoteFromField(note, 'top')}
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
                    <label className="field-label">Ürək Notları</label>
                    <button
                      className="add-note-to-field-btn"
                      onClick={() => setShowNoteSelector('heart')}
                    >
                      <Plus size={16} weight="bold" />
                      Add Note
                    </button>
                  </div>
                  <div className="notes-display">
                    {parseNotes(selectedProduct.heart_notes).map((note, index) => {
                      const noteImg = getNoteImage(note)
                      return (
                        <div key={index} className="note-tag">
                          {noteImg && <img src={noteImg} alt={note} className="note-tag-image" />}
                          <span>{note}</span>
                          <button
                            className="remove-note-btn"
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
                      className="add-note-to-field-btn"
                      onClick={() => setShowNoteSelector('base')}
                    >
                      <Plus size={16} weight="bold" />
                      Add Note
                    </button>
                  </div>
                  <div className="notes-display">
                    {parseNotes(selectedProduct.base_notes).map((note, index) => {
                      const noteImg = getNoteImage(note)
                      return (
                        <div key={index} className="note-tag">
                          {noteImg && <img src={noteImg} alt={note} className="note-tag-image" />}
                          <span>{note}</span>
                          <button
                            className="remove-note-btn"
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

              {/* Links Section */}
              <div className="form-card">
                <label className="card-title">Əlavə Məlumat</label>
                <div className="form-group">
                  <label className="field-label">Slug</label>
                  <input
                    type="text"
                    value={selectedProduct.slug}
                    onChange={(e) => handleProductUpdate('slug', e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label className="field-label">Məhsul Linki</label>
                  <input
                    type="text"
                    value={selectedProduct.link}
                    onChange={(e) => handleProductUpdate('link', e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Delete Action */}
              <div className="form-actions">
                <button
                  className="delete-btn-full"
                  onClick={() => handleDeleteProduct(selectedProduct, { stopPropagation: () => {} } as React.MouseEvent)}
                >
                  <Trash size={18} weight="bold" />
                  Məhsulu Sil
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Notes Panel */}
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

      {/* Add Note Modal */}
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

      {/* Note Selector Modal */}
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

      {/* Crop Modal */}
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
    </div>
  )
}

export default App
