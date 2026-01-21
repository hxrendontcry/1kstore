import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send("Method not allowed");
    const { userId, points, password } = req.body;

    const updates = {};
    if (points !== undefined) updates.points = points;
    if (password) updates.password = password; // (ควร hash ก่อนในโปรดักชั่นจริง)

    const { error } = await supabase.from('users').update(updates).eq('id', userId);

    if (error) return res.json({ success: false, msg: error.message });
    return res.json({ success: true });
}