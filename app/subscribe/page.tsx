'use client'

import { useEffect, useState } from "react"
import StripePricingTable from "@/components/StripePricingTable"
import Image from "next/image"
import { createClient } from '@/utils/supabase/server'
import { createStripeCheckoutSession } from "@/utils/stripe/api"

export default function Subscribe() {
    const [checkoutSessionSecret, setCheckoutSessionSecret] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function initializeCheckoutSession() {
            try {
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()

                if (!user?.email) {
                    throw new Error('用户未登录或无法获取邮箱')
                }

                const secret = await createStripeCheckoutSession(user.email)
                setCheckoutSessionSecret(secret)
            } catch (err) {
                setError(err instanceof Error ? err.message : '发生错误')
            } finally {
                setLoading(false)
            }
        }

        initializeCheckoutSession()
    }, [])

    return (
        <div className="flex flex-col min-h-screen bg-secondary">
            <header className="px-4 lg:px-6 h-16 flex items-center bg-white border-b fixed border-b-slate-200 w-full">
                <Image src="/logo.png" alt="logo" width={50} height={50} />
                <span className="sr-only">Acme Inc</span>
            </header>
            <div className="w-full py-20 lg:py-32 xl:py-40 bg-white">
                <div className="text-center py-6 md:py-10 lg:py-12">
                    <h1 className="font-bold text-xl md:text-3xl lg:text-4xl">Pricing</h1>
                    <h1 className="pt-4 text-muted-foreground text-sm md:text-md lg:text-lg">
                        Choose the right plan for your team! Cancel anytime!
                    </h1>
                </div>
                {loading ? (
                    <div className="flex justify-center">
                        <p>加载中...</p>
                    </div>
                ) : error ? (
                    <div className="flex justify-center text-red-500">
                        <p>{error}</p>
                    </div>
                ) : checkoutSessionSecret ? (
                    <StripePricingTable checkoutSessionSecret={checkoutSessionSecret} />
                ) : null}
            </div>
        </div>
    )
}