import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    const { action, id, name, description, price, images, stock_content, userId } = req.body;

    try {
        // 1. ตรวจสอบสิทธิ์ Admin
        const { data: user } = await supabase.from('users').select('role').eq('id', userId).single();
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ success: false, msg: "Access Denied: Admin Only" });
        }

        // 2. แปลงรูปภาพให้เป็น Array เสมอ (ป้องกัน Error)
        let imageArray = [];
        if (Array.isArray(images)) {
            imageArray = images;
        } else if (typeof images === 'string') {
            imageArray = [images];
        }

        // 3. ทำงานตามคำสั่ง
        if (action === 'add') {
            const { error } = await supabase.from('products').insert({
                name, description, price, 
                images: imageArray, // บันทึกหลายรูป
                stock_content,
                is_sold: false
            });
            if (error) throw error;
            return res.json({ success: true, msg: "เพิ่มสินค้าเรียบร้อย" });
        }

        else if (action === 'delete') {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            return res.json({ success: true, msg: "ลบสินค้าเรียบร้อย" });
        }

        else if (action === 'edit') {
            const { error } = await supabase.from('products').update({
                name, description, price, 
                images: imageArray, // บันทึกหลายรูป
                stock_content
            }).eq('id', id);
            if (error) throw error;
            return res.json({ success: true, msg: "แก้ไขข้อมูลเรียบร้อย" });
        }

        return res.status(400).json({ success: false, msg: "Unknown Action" });

    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, msg: e.message });
    }
}