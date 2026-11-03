import './App.css'
import { Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import Homepage from './components/Homepage'
import Items from './components/Items.jsx'
import ItemsDetails from './components/ItemsDetails.jsx'


function App() {


  return (
    <>
      <Header />
      <Routes>
        <Route path='/' element={<Homepage></Homepage>}></Route>
        <Route path='/items' element={<Items></Items>}></Route>
        <Route path='/items/:id' element={<ItemsDetails />}></Route>
      </Routes>
    </>
  )
}

export default App
