import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

export default async function handler(req, res) {
    // ยอมให้หน้าเว็บส่งข้อมูลมา
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST');

    if (req.method !== 'POST') return res.status(405).send("Method not allowed");

    const { name, price, images, stock, description } = req.body;

    // แปลงรูปภาพจากข้อความยาวๆ ให้เป็น Array (คั่นด้วยจุลภาค)
    // เช่น "img1.jpg, img2.jpg" -> ["img1.jpg", "img2.jpg"]
    const imageArray = images.split(',').map(img => img.trim());

    // บันทึกลง Supabase
    const { data, error } = await supabase
        .from('products')
        .insert([{
            name,
            price,
            description,
            images: imageArray,
            stock_content: stock,
            is_sold: false
        }]);

    if (error) {
        return res.status(400).json({ success: false, msg: error.message });
    }

    return res.status(200).json({ success: true, msg: "ลงสินค้าเรียบร้อย!" });
}