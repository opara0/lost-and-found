import { useEffect, useState } from 'react'
import supabase from '../supabase'

export default function useItems({ userId, enabled = true } = {}) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        let isActive = true

        async function getItems() {
            if (!enabled) {
                setItems([])
                setLoading(false)
                return
            }

            setLoading(true)
            setError('')

            const query = supabase
                .from('posts')
                .select('id, user_id, description, location, media_url, media_type, questions')

            const { data, error: fetchError } = userId
                ? await query.eq('user_id', userId)
                : await query

            if (!isActive) return

            if (fetchError) {
                setError(fetchError.message)
                setLoading(false)
                return
            }

            const posts = data ?? []
            const userIds = [...new Set(posts.map((post) => post.user_id).filter(Boolean))]
            let profilesById = new Map()

            if (userIds.length > 0) {
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, first_name, last_name, avatar_url')
                    .in('id', userIds)

                if (!isActive) return

                if (profilesError) {
                    setError(profilesError.message)
                    setLoading(false)
                    return
                }

                profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
            }

            setItems(posts.map((post) => ({
                id: post.id,
                ownerId: post.user_id,
                profile: profilesById.get(post.user_id) ?? null,
                img: post.media_url,
                desc: post.description,
                location: post.location,
                mediaType: post.media_type,
                questions: Array.isArray(post.questions) ? post.questions : [],
            })))
            setLoading(false)
        }

        getItems()

        return () => {
            isActive = false
        }
    }, [enabled, userId])

    return { items, loading, error }
}
