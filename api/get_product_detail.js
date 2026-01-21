import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const { id } = req.query; // รับ id จาก URL (เช่น ?id=5)

    if (!id) return res.status(400).json({ error: "No ID provided" });

    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single(); // single() แปลว่าเอามาแค่ชิ้นเดียว

    if (error) return res.status(404).json({ error: "Product not found" });

    return res.status(200).json(data);
}