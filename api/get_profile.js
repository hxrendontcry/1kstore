import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send("Method Not Allowed");
    const { userId } = req.body;

    try {
        // 1. ดึงข้อมูล User
        const { data: user } = await supabase.from('users').select('username, points').eq('id', userId).single();
        
        // 2. ดึงประวัติ 10 รายการล่าสุด
        const { data: history } = await supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        return res.json({ 
            username: user.username, 
            points: user.points, 
            history: history || [] 
        });

    } catch (e) {
        return res.status(500).json({ username: '-', points: 0, history: [] });
    }
}