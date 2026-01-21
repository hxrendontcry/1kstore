import { createClient } from '@supabase/supabase-js'

// เชื่อมต่อฐานข้อมูล
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    // ยอมให้หน้าเว็บส่งข้อมูลมาหาเราได้ (แก้ปัญหา CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    
    if (req.method !== 'POST') return res.status(405).send("Method not allowed");

    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, msg: "กรุณากรอกข้อมูลให้ครบ" });
    }

    // สร้าง User ใหม่ในฐานข้อมูล
    const { data, error } = await supabase
        .from('users')
        .insert([{ username, password, points: 0, role: 'user' }]) // เริ่มต้นเงิน 0 บาท
        .select();

    if (error) {
        // ถ้า Error ส่วนใหญ่คือชื่อซ้ำ
        return res.status(400).json({ success: false, msg: "ชื่อผู้ใช้นี้มีคนใช้แล้ว" });
    }

    return res.status(200).json({ success: true, msg: "สมัครสมาชิกสำเร็จ!" });
}