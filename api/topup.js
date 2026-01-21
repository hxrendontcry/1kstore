import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ success: false, msg: "Method Not Allowed" });
    
    const { userId, method, link, amount, date, time } = req.body;

    try {
        const { data: user } = await supabase.from('users').select('username, points').eq('id', userId).single();
        if(!user) return res.status(404).json({ success: false, msg: "ไม่พบข้อมูลสมาชิก" });

        // -------------------------------------------------------
        // 🧧 กรณี 1: เติมผ่านซองของขวัญ (Real Auto)
        // -------------------------------------------------------
        if (method === 'gift') {
            if (!process.env.WALLET_PHONE) {
                return res.status(500).json({ success: false, msg: "Server Error: WALLET_PHONE not set" });
            }

            // 1. แกะรหัสซองจากลิงก์
            // ลิงก์มาประมาณนี้: https://gift.truemoney.com/campaign/?v=xxxxxxxxxxxx
            const url = new URL(link);
            const voucherHash = url.searchParams.get('v');

            if (!voucherHash) {
                return res.status(400).json({ success: false, msg: "รูปแบบลิงก์ไม่ถูกต้อง" });
            }

            // 2. เช็คใน Database ก่อนว่าลิงก์นี้เคยใช้ยัง (กันคนหัวหมอ)
            const { data: existing } = await supabase.from('transactions').select('*').eq('detail', link).single();
            if (existing) {
                return res.status(400).json({ success: false, msg: "ลิงก์นี้ถูกใช้งานไปแล้ว ❌" });
            }

            // 3. ยิงไปรับเงินที่ TrueMoney (รับเข้าเบอร์คุณ)
            const tmRes = await fetch(`https://gift.truemoney.com/campaign/vouchers/${voucherHash}/redeem`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mobile: process.env.WALLET_PHONE, // เบอร์คุณที่ตั้งใน Vercel
                    voucher_hash: voucherHash
                })
            });
            
            const tmData = await tmRes.json();

            // 4. เช็คผลลัพธ์จาก TrueMoney
            if (tmData.status.code !== 'SUCCESS') {
                // กรณีรับไม่ได้ (เช่น ซองหมด, ซองเสีย, หรือรับไปแล้ว)
                return res.status(400).json({ 
                    success: false, 
                    msg: "เติมเงินไม่สำเร็จ: " + (tmData.status.message || "ซองนี้อาจถูกรับไปแล้ว หรือหมดอายุ") 
                });
            }

            // 5. ถ้าสำเร็จ -> ดึงยอดเงินจริงที่ได้รับ
            // (ต้องแปลงจากหน่วยสตางค์ หรือ string เป็น number ให้ชัวร์)
            const receivedAmount = parseFloat(tmData.data.my_ticket.amount_baht); 

            // 6. เติมพอยท์ให้ลูกค้า
            const newPoints = parseFloat(user.points) + receivedAmount;
            await supabase.from('users').update({ points: newPoints }).eq('id', userId);

            // 7. บันทึกประวัติ
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'topup_gift',
                amount: receivedAmount,
                detail: link, // เก็บลิงก์ไว้กันซ้ำ
                status: 'success'
            });

            // แจ้งเตือน Discord
            sendDiscord(`🧧 **เติมซองสำเร็จ!** (Auto)\nUser: ${user.username}\nยอดเงิน: **${receivedAmount}** บาท\nLink: ||${link}||`, 5763719); // สีเขียว

            return res.json({ success: true, amount: receivedAmount });
        } 
        
        // -------------------------------------------------------
        // 🏦 กรณี 2: แจ้งโอนธนาคาร (Manual Check)
        // -------------------------------------------------------
        else if (method === 'bank') {
            // บันทึกลงฐานข้อมูล (รอแอดมินมาเติมให้)
            await supabase.from('transactions').insert({
                user_id: userId,
                type: 'topup_bank',
                amount: amount,
                detail: `แจ้งโอน KBank | วันที่: ${date} ${time}`,
                status: 'pending' 
            });

            // แจ้งเตือน Discord
            sendDiscord(`🏦 **แจ้งโอนเงินใหม่** (รอตรวจสอบ)\nUser: ${user.username}\nยอดเงิน: **${amount}** บาท\nเวลา: ${date} ${time}\n\n*แอดมินโปรดเช็คยอดแล้วเติมพอยท์ให้ลูกค้า*`, 16776960); // สีเหลือง

            return res.json({ success: true, msg: "ส่งข้อมูลแล้ว กรุณารอแอดมินตรวจสอบ" });
        }

    } catch (e) {
        console.error("Topup Error:", e);
        return res.status(500).json({ success: false, msg: "ระบบขัดข้อง กรุณาลองใหม่" });
    }
}

// Helper ส่ง Discord
function sendDiscord(message, color) {
    if (process.env.DISCORD_WEBHOOK_TOPUP) {
        fetch(process.env.DISCORD_WEBHOOK_TOPUP, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{ description: message, color: color, timestamp: new Date().toISOString() }]
            })
        }).catch(err => console.error(err));
    }
}