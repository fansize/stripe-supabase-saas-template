import { Stripe } from 'stripe';
import { db } from '../db/db';
import { usersTable } from '../db/schema';
import { eq } from "drizzle-orm";

// 初始化 Stripe 客户端
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// 设置网站 URL，如果环境变量未设置则使用本地开发地址
const PUBLIC_URL = process.env.NEXT_PUBLIC_WEBSITE_URL ? process.env.NEXT_PUBLIC_WEBSITE_URL : "http://localhost:3000"

/**
 * 获取用户的 Stripe 订阅计划信息
 * @param email - 用户邮箱地址
 * @returns 返回产品名称，如果用户没有订阅计划则返回 null
 * @throws 当查询过程中发生错误时抛出异常
 */
export async function getStripePlan(email: string) {
    try {
        // 记录开始获取用户订阅计划的日志
        console.log(`开始获取用户 ${email} 的订阅计划信息`);

        // 从数据库查询用户信息
        // 使用 Drizzle ORM 的 select 方法查询 usersTable
        const user = await db.select().from(usersTable).where(eq(usersTable.email, email));

        // 验证用户是否存在
        // 如果查询结果为空或长度为0，表示用户不存在
        if (!user || user.length === 0) {
            console.error(`未找到邮箱为 ${email} 的用户`);
            throw new Error('用户不存在');
        }

        // 验证用户是否有关联的订阅计划
        // 如果用户记录中没有 plan 字段，表示未订阅
        if (!user[0].plan) {
            console.warn(`用户 ${email} 没有关联的订阅计划`);
            return null;
        }

        // 记录正在获取订阅详情的日志
        console.log(`正在获取订阅ID ${user[0].plan} 的详细信息`);

        // 调用 Stripe API 获取订阅详情
        // 包含订阅状态、计费周期、价格等信息
        const subscription = await stripe.subscriptions.retrieve(user[0].plan);

        // 记录订阅信息的关键字段
        console.log('订阅信息:', {
            status: subscription.status,                    // 订阅状态（active/canceled 等）
            currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),  // 当前计费周期结束时间
            customerId: subscription.customer              // 客户 ID
        });

        // 验证订阅项目数据是否存在
        // subscription.items.data 应该包含至少一个订阅项目
        if (!subscription.items.data || subscription.items.data.length === 0) {
            console.error('订阅信息中没有产品数据');
            throw new Error('订阅信息异常');
        }

        // 从订阅信息中提取产品 ID
        const productId = subscription.items.data[0].plan.product as string;
        console.log(`正在获取产品ID ${productId} 的详细信息`);

        // 调用 Stripe API 获取产品详情
        const product = await stripe.products.retrieve(productId);

        // 记录产品信息的关键字段
        console.log('产品信息:', {
            name: product.name,           // 产品名称
            active: product.active,       // 产品是否激活
            description: product.description  // 产品描述
        });

        // 返回产品名称
        return product.name;
    } catch (error) {
        // 统一的错误处理逻辑
        console.error('获取订阅计划时发生错误:', error);

        // 根据错误类型抛出适当的错误信息
        if (error instanceof Error) {
            throw new Error(`获取订阅计划失败: ${error.message}`);
        } else {
            throw new Error('获取订阅计划时发生未知错误');
        }
    }
}

// 在 Stripe 中创建新客户
export async function createStripeCustomer(id: string, email: string, name?: string) {
    // 创建 Stripe 客户记录
    const customer = await stripe.customers.create({
        name: name ? name : "",
        email: email,
        metadata: {
            supabase_id: id  // 存储关联的 Supabase 用户 ID
        }
    });
    return customer.id
}

// 创建 Stripe Checkout 会话
export async function createStripeCheckoutSession(email: string) {
    // 查询用户信息
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email))
    // 创建客户会话，启用定价表格组件
    const customerSession = await stripe.customerSessions.create({
        customer: user[0].stripe_id,
        components: {
            pricing_table: {
                enabled: true,
            },
        },
    });
    return customerSession.client_secret
}

// 生成 Stripe 账单管理门户链接
export async function generateStripeBillingPortalLink(email: string) {
    // 查询用户信息
    const user = await db.select().from(usersTable).where(eq(usersTable.email, email))
    // 创建账单门户会话，设置返回 URL 为仪表板
    const portalSession = await stripe.billingPortal.sessions.create({
        customer: user[0].stripe_id,
        return_url: `${PUBLIC_URL}/dashboard`,
    });
    return portalSession.url
}