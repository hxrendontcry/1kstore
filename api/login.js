import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');

    if (req.method !== 'POST') return res.status(405).send("Method not allowed");

    const { username, password } = req.body;

    // ค้นหา User ที่ชื่อและรหัสตรงกัน
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

    if (error || !user) {
        return res.status(401).json({ success: false, msg: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
    }

    // ส่งข้อมูลกลับไปให้หน้าเว็บ (ไม่ส่งรหัสผ่านกลับไป)
    return res.status(200).json({ 
        success: true, 
        user: { id: user.id, username: user.username, points: user.points, role: user.role } 
    });
}