import { useRef, useState } from 'react'
import api from '@/api/axios'
import Icon from './Icon'

export default function ImageUpload({ value, onChange, folder = 'pokevault', label = '이미지 업로드' }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const { data } = await api.post(`/upload?folder=${folder}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      onChange(data.url)
    } catch {
      alert('업로드 실패. Cloudinary 설정을 확인해주세요.')
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div>
      {value ? (
        <div className="relative group">
          <img src={value} alt="preview" className="w-full h-48 object-contain rounded-xl border border-line bg-bone-2" />
          <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
            <button type="button" onClick={() => inputRef.current.click()}
              className="bg-paper text-ink text-xs font-bold px-3 py-1.5 rounded-lg">변경</button>
            <button type="button" onClick={() => onChange('')}
              className="bg-dex text-white text-xs font-bold px-3 py-1.5 rounded-lg">삭제</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => !uploading && inputRef.current.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="border-2 border-dashed border-line hover:border-ink/40 p-10 text-center cursor-pointer rounded-xl bg-bone-2/30 transition-colors">
          {uploading ? (
            <div className="text-sm text-mute font-bold">업로드 중...</div>
          ) : (
            <>
              <Icon name="package" size={32} strokeWidth={1.5} className="text-mute mx-auto mb-3" />
              <div className="text-xs text-mute font-bold">{label}</div>
              <div className="text-[10px] text-mute/60 mt-1">클릭 또는 드래그</div>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  )
}
