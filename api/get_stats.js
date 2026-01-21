import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    try {
        // 1. นับจำนวนสมาชิกทั้งหมด
        const { count: memberCount, error: userError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // 2. นับจำนวนสินค้าที่ขายออกไปแล้ว (is_sold = true)
        const { count: soldCount, error: productError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('is_sold', true);

        if (userError || productError) throw new Error("Database error");

        // ส่งตัวเลขกลับไป (ถ้าไม่มีข้อมูลให้เป็น 0)
        return res.json({ 
            members: memberCount || 0, 
            sold: soldCount || 0 
        });

    } catch (e) {
        return res.status(500).json({ members: 0, sold: 0 });
    }
}