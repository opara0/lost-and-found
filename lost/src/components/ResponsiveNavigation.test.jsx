import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ResponsiveNavigation from './ResponsiveNavigation'

describe('ResponsiveNavigation', () => {
    it('shows labeled links and marks the current route', () => {
        render(
            <MemoryRouter initialEntries={['/items']}>
                <ResponsiveNavigation />
            </MemoryRouter>
        )

        expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: 'Browse' })).toHaveAttribute('aria-current', 'page')
        expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current')
    })

    it('visually highlights the selected section and Chat while viewing a conversation', () => {
        const { unmount } = render(
            <MemoryRouter initialEntries={['/items']}>
                <ResponsiveNavigation />
            </MemoryRouter>
        )

        expect(screen.getByRole('link', { name: 'Browse' })).toHaveClass('bg-emerald-100', 'text-emerald-900', 'shadow-sm')

        unmount()
        render(
            <MemoryRouter initialEntries={['/chats/claim-id']}>
                <ResponsiveNavigation />
            </MemoryRouter>
        )
        expect(screen.getByRole('link', { name: 'Chat' })).toHaveClass('bg-emerald-100', 'text-emerald-900', 'shadow-sm')
        expect(screen.getByRole('link', { name: 'Claims' })).not.toHaveAttribute('aria-current')
    })

    it('routes to the selected section', () => {
        render(
            <MemoryRouter>
                <ResponsiveNavigation />
            </MemoryRouter>
        )

        fireEvent.click(screen.getByRole('link', { name: 'Claims' }))
        expect(screen.getByRole('link', { name: 'Claims' })).toHaveAttribute('aria-current', 'page')
    })
})
