import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");
    const { userId, productId } = req.body;

    try {
        // 1. ดึงข้อมูลสินค้า (เช็คว่าขายไปยัง?)
        const { data: product, error: pError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (pError || !product) return res.status(404).json({ success: false, msg: "ไม่พบสินค้านี้" });
        if (product.is_sold) return res.status(400).json({ success: false, msg: "สินค้านี้ถูกขายไปแล้วครับ" });

        // 2. ดึงข้อมูลลูกค้า (เช็คเงิน)
        const { data: user, error: uError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (uError || !user) return res.status(404).json({ success: false, msg: "ไม่พบข้อมูลสมาชิก" });
        if (user.points < product.price) return res.status(400).json({ success: false, msg: "พอยท์ไม่พอครับ กรุณาเติมเงิน" });

        // 3. เริ่มการซื้อขาย (ตัดเงิน + ปรับสถานะสินค้า)
        const newPoints = user.points - product.price;

        // 3.1 ตัดเงิน
        await supabase.from('users').update({ points: newPoints }).eq('id', userId);
        
        // 3.2 ปรับสินค้าเป็น "ขายแล้ว"
        await supabase.from('products').update({ is_sold: true }).eq('id', productId);

        // 3.3 บันทึกประวัติ
        await supabase.from('transactions').insert({
            user_id: userId,
            type: 'buy_product',
            amount: product.price,
            detail: `ซื้อสินค้า: ${product.name} | ข้อมูล: ${product.stock_content}`,
            status: 'success'
        });

        // 4. แจ้งเตือนเข้า Discord (แจ้งเจ้าของร้าน)
        if (process.env.DISCORD_WEBHOOK_BUY) {
            fetch(process.env.DISCORD_WEBHOOK_BUY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "🛒 มีรายการสั่งซื้อใหม่!",
                        description: `สินค้า: **${product.name}**\nราคา: **${product.price}** บาท\nโดย: ${user.username}`,
                        color: 16761095, // สีทอง
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(err => console.error("Discord Error:", err));
        }

        // 5. ส่งสินค้าให้ลูกค้า
        return res.json({ success: true, content: product.stock_content });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, msg: "ระบบเกิดข้อผิดพลาด กรุณาติดต่อแอดมิน" });
    }
}