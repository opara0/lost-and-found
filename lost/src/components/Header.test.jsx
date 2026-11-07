import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Header from './Header'

const authListener = vi.hoisted(() => ({ callback: null }))

vi.mock('../supabase', () => ({
    default: {
        auth: {
            onAuthStateChange: vi.fn((callback) => {
                authListener.callback = callback
                return { data: { subscription: { unsubscribe: vi.fn() } } }
            })
        },
    },
}))

function renderHeader() {
    return render(
        <MemoryRouter>
            <Header />
        </MemoryRouter>
    )
}

describe('Header authentication menu', () => {
    it('does not open signup automatically for logged-out visitors', () => {
        renderHeader()

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('opens signup only when requested and closes it after sign in', async () => {
        renderHeader()

        fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
        fireEvent.click(screen.getByRole('button', { name: 'SIGN UP' }))
        expect(screen.getByRole('dialog')).toBeInTheDocument()

        authListener.callback('SIGNED_IN', { user: { id: 'user-id' } })
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
})
