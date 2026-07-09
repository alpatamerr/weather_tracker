import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Navbar from './components/Navbar'
import { ForecastPage, HomePage } from './pages'

function App() {
  return (
    <Router>
      <Navbar />
      <div className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/forecast/:city" element={<ForecastPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
