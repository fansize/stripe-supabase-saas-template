import { db } from '@/utils/db/db'
import { usersTable } from '@/utils/db/schema'
import { eq } from "drizzle-orm";

/**
 * Stripe Webhook 处理函数
 * 处理来自 Stripe 的 webhook 事件，主要用于更新用户订阅状态
 */
export async function POST(request: Request) {
    // 记录 webhook 接收日志
    console.log('Webhook received')

    try {
        // 解析 webhook 请求体
        const response = await request.json()

        // 添加详细的调试日志
        console.log('完整的 webhook 响应:', JSON.stringify(response, null, 2))
        console.log('事件类型:', response.type)
        console.log('数据对象:', response.data.object)
        console.log('订阅 ID:', response.data.object.subscription)
        console.log('客户 ID:', response.data.object.customer)


        // 只处理订阅相关的事件
        if (response.type.startsWith('customer.subscription')) {

            // 更新数据库中的用户订阅计划
            // 使用 subscription 字段而不是 id
            await db.update(usersTable)
                .set({ plan: response.data.object.subscription })
                .where(eq(usersTable.stripe_id, response.data.object.customer));

            // 记录更新操作的详情
            console.log('数据库更新完成:', {
                stripe_id: response.data.object.customer,
                new_plan: response.data.object.subscription
            })
        }

    } catch (error: any) {
        // 详细记录错误信息
        console.error('Webhook 处理错误:', error)
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