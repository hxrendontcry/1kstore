import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");
    const { userId, productId } = req.body;

    try {
        // 1. ดึงข้อมูลสินค้า (เช็คว่าขายไปรึยัง)
        const { data: product, error: pError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (pError || !product) return res.status(404).json({ success: false, msg: "ไม่พบสินค้า" });
        if (product.is_sold) return res.status(400).json({ success: false, msg: "สินค้านี้ถูกซื้อไปแล้วครับ" });

        // 2. ดึงข้อมูลลูกค้า (เช็คเงิน)
        const { data: user, error: uError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (uError || !user) return res.status(404).json({ success: false, msg: "ไม่พบข้อมูลผู้ใช้" });
        if (user.points < product.price) return res.status(400).json({ success: false, msg: `พอยท์ไม่พอครับ (ขาดอีก ${product.price - user.points} พอยท์)` });

        // 3. เริ่มการซื้อขาย (Transaction)
        
        // 3.1 ตัดเงิน
        const newPoints = user.points - product.price;
        await supabase.from('users').update({ points: newPoints }).eq('id', userId);

        // 3.2 ตัดสต็อก (Mark as sold)
        await supabase.from('products').update({ is_sold: true }).eq('id', productId);

        // 3.3 บันทึกประวัติ
        await supabase.from('transactions').insert({
            user_id: userId,
            type: 'buy_product',
            amount: product.price,
            detail: `ซื้อสินค้า: ${product.name}`,
            status: 'success'
        });

        // 4. แจ้งเตือน Discord (ถ้ามี)
        if (process.env.DISCORD_WEBHOOK_BUY) {
            fetch(process.env.DISCORD_WEBHOOK_BUY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "🛒 มีการสั่งซื้อใหม่!",
                        description: `สินค้า: **${product.name}**\nราคา: **${product.price}** บาท\nลูกค้า: **${user.username}**`,
                        color: 3447003, // สีฟ้า
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(err => console.error("Discord Error:", err)); // กัน Error แล้วเว็บล่ม
        }

        // 5. ส่งของให้ลูกค้า
        return res.json({ 
            success: true, 
            msg: "ซื้อสินค้าสำเร็จ!", 
            stock: product.stock_content, // ส่งไอดี/รหัสผ่านกลับไป
            newPoints: newPoints
        });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, msg: "ระบบขัดข้อง โปรดติดต่อแอดมิน" });
    }
}