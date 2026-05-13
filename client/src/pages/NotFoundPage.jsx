import { Link } from 'react-router-dom'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'

export default function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <div className="mb-6 opacity-50"><Pokeball size={72} /></div>
      <div className="font-display text-7xl font-bold text-mute/30">404</div>
      <h1 className="font-display text-2xl font-bold text-ink mt-3">페이지를 찾을 수 없습니다</h1>
      <p className="text-sm text-mute mt-2 mb-6">요청하신 페이지가 존재하지 않습니다.</p>
      <Link to="/"><Button variant="primary">홈으로 돌아가기</Button></Link>
    </div>
  )
}
