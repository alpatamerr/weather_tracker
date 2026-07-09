import { render, screen } from '@testing-library/react'
import App from '../App'

describe('Weather app UI', () => {
  it('renders the search experience and main controls', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: /weather tracker/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/search for cities/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /get weather/i })).toBeInTheDocument()
  })
})
