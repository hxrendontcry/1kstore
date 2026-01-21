import { createClient } from '@supabase/supabase-js'
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    // 1. ดึงยอดเติมเงินทั้งหมด (Transactions ที่เป็น topup)
    const { data: transactions } = await supabase
        .from('transactions') // หรือ topup_history ตามที่คุณตั้งชื่อตารางไว้
        .select('amount, created_at')
        .eq('type', 'topup_truemoney'); // หรือรวม topup_bank ด้วยถ้ามี

    // คำนวณยอด วัน/เดือน/ปี
    const now = new Date();
    let daily = 0, monthly = 0, yearly = 0, total = 0;

    transactions.forEach(t => {
        const tDate = new Date(t.created_at);
        const amount = parseFloat(t.amount || 0);
        total += amount;

        if(tDate.toDateString() === now.toDateString()) daily += amount;
        if(tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()) monthly += amount;
        if(tDate.getFullYear() === now.getFullYear()) yearly += amount;
    });

    // 2. ดึงข้อมูลสมาชิกทั้งหมด
    const { data: users } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

    // 3. ดึงประวัติการเติมเงิน 50 รายการล่าสุด
    const { data: history } = await supabase
        .from('transactions') // หรือ topup_history
        .select('*, users(username)') // Join เอาชื่อ user มาด้วย
        .order('created_at', { ascending: false })
        .limit(50);

    return res.json({
        stats: { daily, monthly, yearly, total },
        users: users,
        history: history
    });
}