import './App.css'
import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'

import Header from './components/Header'
const Homepage = lazy(() => import('./components/Homepage'))
const Items = lazy(() => import('./components/Items'))
const ItemsDetails = lazy(() => import('./components/ItemsDetails'))
const Profile = lazy(() => import('./components/Profile'))
const Auth = lazy(() => import('./components/Auth'))
const Login = lazy(() => import('./components/Login'))
const ReportFound = lazy(() => import('./components/ReportFound'))
const Myclaims = lazy(() => import('./components/Myclaims'))
const ClaimChat = lazy(() => import('./components/ClaimChat'))

function App() {
  return (
    <>
      <Header />
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
          <Route path='/chats/:claimId' element={<ClaimChat />}></Route>
        </Routes>
      </Suspense>
    </>
  )
}

export default App
