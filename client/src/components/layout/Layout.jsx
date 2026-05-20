import { Outlet, useLocation } from 'react-router-dom'
import Header from './Header'
import Footer from './Footer'
import ToastContainer from '@/components/common/Toast'
import GreetingDropdown from '@/components/common/GreetingDropdown'

export default function Layout() {
  const loc = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <ToastContainer />
      <GreetingDropdown />
      <Header />
      <main key={loc.pathname} className="flex-1 page-in">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
