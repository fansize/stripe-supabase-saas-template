import { redirect } from 'next/navigation'

import { createClient } from '@/utils/supabase/server'

export default async function Dashboard() {
    const supabase = createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect('/login')
    }

    return (
        <main className="flex-1">
            <div className="container">
                <h1 className="text-2xl font-bold mb-4">用户信息</h1>
                <div className="space-y-2">
                    <p>邮箱: {data.user.email}</p>
                    <p>ID: {data.user.id}</p>
                    {data.user.user_metadata && (
                        <div>
                            <p>用户元数据:</p>
                            <pre className="bg-gray-100 p-2 rounded">
                                {JSON.stringify(data.user.user_metadata, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </main>
    )
}