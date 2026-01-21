import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    const { userId } = req.query; // รับ userId มาจากหน้าเว็บ

    if (!userId) return res.status(400).json({ error: "User ID is required" });

    // 1. ดึงประวัติธุรกรรมทั้งหมดของคนนี้ (ล่าสุดขึ้นก่อน)
    const { data: history, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50); // เอาแค่ 50 รายการล่าสุดพอ

    if (error) return res.status(500).json({ error: error.message });

    // 2. ดึงข้อมูลสินค้า (เผื่อต้องโชว์ User/Pass อีกรอบ)
    // เราจะแอบส่ง stock_content กลับไปเฉพาะรายการที่เป็น 'buy_product'
    // (ในความเป็นจริงควร join table แต่ทำแบบนี้ง่ายกว่าสำหรับมือใหม่)
    
    // ส่งกลับไป
    return res.json({ history });
}