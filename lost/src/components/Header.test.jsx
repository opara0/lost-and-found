import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('Header authentication actions', () => {
    it('does not open signup automatically for logged-out visitors', () => {
        renderHeader()

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
        act(() => authListener.callback('INITIAL_SESSION', null))
        expect(screen.getByRole('button', { name: 'LOG IN' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'SIGN UP' })).toBeInTheDocument()
    })

    it('hides login and signup when signed in', () => {
        renderHeader()

        act(() => authListener.callback('INITIAL_SESSION', { user: { id: 'user-id' } }))
        expect(screen.queryByRole('button', { name: 'LOG IN' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: 'SIGN UP' })).not.toBeInTheDocument()
    })

    it('opens signup when requested and closes it after sign in', async () => {
        renderHeader()

        act(() => authListener.callback('INITIAL_SESSION', null))
        fireEvent.click(screen.getByRole('button', { name: 'SIGN UP' }))
        expect(screen.getByRole('dialog')).toBeInTheDocument()

        act(() => authListener.callback('SIGNED_IN', { user: { id: 'user-id' } }))
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })
})
