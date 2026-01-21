import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    // อนุญาตให้ใครก็ได้ดึงข้อมูลสินค้า (เพราะเป็นหน้าร้าน)
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // ดึงข้อมูลจากตาราง products, เรียงจากของใหม่ไปเก่า, เอาเฉพาะที่ยังไม่ขาย (is_sold = false)
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_sold', false) 
        .order('created_at', { ascending: false });

    if (error) return res.status(500).json([]);
    
    return res.status(200).json(data);
}