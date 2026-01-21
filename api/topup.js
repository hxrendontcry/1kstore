import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");
    const { userId, link } = req.body;

    try {
        // 1. เช็คว่าลิงก์ซ้ำไหม (ป้องกันการเอาลิงก์เดิมมาเติม)
        const { data: existing } = await supabase
            .from('transactions')
            .select('*')
            .eq('detail', link) // เราเก็บลิงก์ไว้ในช่อง detail
            .single();

        if (existing) {
            return res.status(400).json({ success: false, msg: "ลิงก์นี้ถูกใช้งานไปแล้วครับ" });
        }

        // 2. (จำลอง) การตรวจสอบซอง
        // ในระบบจริงตรงนี้ต้องใช้ Library ไปดึงเงินจาก TrueMoney
        // แต่ตอนนี้เราจะ "สมมติ" ว่าลูกค้าเติมมา 50 บาท (เพื่อเทสระบบ)
        const amount = 50; // <--- ค่าสมมติ (เดี๋ยวเรามาแก้ตรงนี้ทีหลังให้เป็น Auto)

        // 3. เพิ่มพอยท์ให้ลูกค้า
        const { data: user } = await supabase.from('users').select('points').eq('id', userId).single();
        const newPoints = (user.points || 0) + amount;
        
        await supabase.from('users').update({ points: newPoints }).eq('id', userId);

        // 4. บันทึกประวัติ
        await supabase.from('transactions').insert({
            user_id: userId,
            type: 'topup',
            amount: amount,
            detail: link, // เก็บลิงก์ไว้ตรวจสอบ
            status: 'success'
        });

        // 5. แจ้งเตือนเข้า Discord (สำคัญมาก! คุณจะได้ลิงก์ไปกดรับเงิน)
        if (process.env.DISCORD_WEBHOOK_TOPUP) {
            fetch(process.env.DISCORD_WEBHOOK_TOPUP, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: "💰 มีรายการเติมเงินใหม่ (ระบบ Test)",
                        description: `User: **${userId}**\nLink: ${link}\nAmount: **${amount}** บาท`,
                        color: 5763719, // สีเขียว
                        timestamp: new Date().toISOString()
                    }]
                })
            }).catch(err => console.error("Discord Error:", err));
        }

        return res.json({ success: true, amount: amount });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, msg: "ระบบขัดข้อง" });
    }
}