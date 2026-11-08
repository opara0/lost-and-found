import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import ResponsiveNavigation from './components/ResponsiveNavigation'
const Homepage = lazy(() => import('./components/Homepage'))
const Items = lazy(() => import('./components/Items'))
const ItemsDetails = lazy(() => import('./components/ItemsDetails'))
const Profile = lazy(() => import('./components/Profile'))
const Auth = lazy(() => import('./components/Auth'))
const Login = lazy(() => import('./components/Login'))
const ReportFound = lazy(() => import('./components/ReportFound'))
const Myclaims = lazy(() => import('./components/Myclaims'))
const ClaimChat = lazy(() => import('./components/ClaimChat'))
const ChatInbox = lazy(() => import('./components/ChatInbox'))

function App() {
  return (
    <>
      <Header />
      <ResponsiveNavigation />
      <div className="min-h-screen pb-[4.5rem] md:ml-60 md:pb-0">
        <Suspense fallback={<main className="grid min-h-screen place-items-center">Loading page...</main>}>
          <Routes>
            <Route path='/' element={<Homepage />}></Route>
            <Route path='/items' element={<Items />}></Route>
            <Route path='/items/:id' element={<ItemsDetails />}></Route>
            <Route path='/profile' element={<Profile />}></Route>
            <Route path='/Authentication' element={<Auth />}></Route>
            <Route path='/login' element={<Login />}></Route>
            <Route path='/report-found' element={<ReportFound />}></Route>
            <Route path='/my-claims' element={<Myclaims />}></Route>
            <Route path='/chats' element={<ChatInbox />}></Route>
            <Route path='/chats/:claimId' element={<ClaimChat />}></Route>
          </Routes>
        </Suspense>
      </div>
    </>
  )
}

export default App
