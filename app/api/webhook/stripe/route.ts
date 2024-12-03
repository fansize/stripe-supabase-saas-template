import { db } from '@/utils/db/db'
import { usersTable } from '@/utils/db/schema'
import { eq } from "drizzle-orm";

/**
 * Stripe Webhook 处理函数
 * 处理来自 Stripe 的 webhook 事件，主要用于更新用户订阅状态
 */
export async function POST(request: Request) {
    try {
        // 解析 webhook 请求体
        const response = await request.json()

        // 只处理订阅相关的事件
        if (response.type.startsWith('customer.subscription')) {
            // 根据不同的订阅事件类型进行处理
            switch (response.type) {
                case 'customer.subscription.created':
                case 'customer.subscription.updated':
                    await db.update(usersTable)
                        .set({
                            plan: response.data.object.id
                        })
                        .where(eq(usersTable.stripe_id, response.data.object.customer));
                    break;

                case 'customer.subscription.deleted':
                    await db.update(usersTable)
                        .set({
                            plan: "none"  // 清除订阅计划
                        })
                        .where(eq(usersTable.stripe_id, response.data.object.customer));
                    break;
            }
        }

    } catch (error: any) {
        // 详细记录错误信息
        console.error('错误详情:', {
            message: error.message,
            stack: error.stack
        })
        return new Response(`Webhook error: ${error.message}`, {
            status: 400,
        })
    }

    return new Response('Success', { status: 200 })
}