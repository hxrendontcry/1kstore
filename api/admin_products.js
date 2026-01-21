import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    const { action, id, name, description, price, image, stock_content, userId } = req.body;

    try {
        // 1. ตรวจสอบก่อนว่าคนสั่ง เป็น Admin จริงไหม? (ความปลอดภัย)
        const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, msg: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ (Admin Only)" });
        }

        // 2. แยกการทำงานตามคำสั่ง (Action)
        
        // --- เพิ่มสินค้า (ADD) ---
        if (action === 'add') {
            const { error } = await supabase.from('products').insert({
                name, description, price, 
                images: [image], // เก็บเป็น Array
                stock_content,
                is_sold: false
            });
            if (error) throw error;
            return res.json({ success: true, msg: "เพิ่มสินค้าเรียบร้อย" });
        }

        // --- ลบสินค้า (DELETE) ---
        else if (action === 'delete') {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            return res.json({ success: true, msg: "ลบสินค้าเรียบร้อย" });
        }

        // --- แก้ไขสินค้า (EDIT) ---
        else if (action === 'edit') {
            const { error } = await supabase.from('products').update({
                name, description, price, 
                images: [image],
                stock_content
            }).eq('id', id);
            if (error) throw error;
            return res.json({ success: true, msg: "แก้ไขข้อมูลเรียบร้อย" });
        }

        return res.status(400).json({ success: false, msg: "ไม่พบคำสั่งที่ต้องการ" });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, msg: "Server Error: " + e.message });
    }
}