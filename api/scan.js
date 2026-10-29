export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешен' });
    }

    const { imageBase64 } = req.body;
    if (!imageBase64) {
        return res.status(400).json({ error: 'Фото не передано' });
    }

    const apiKey = process.env.GEMINI_API_KEY; 

    if (!apiKey) {
        return res.status(500).json({ error: 'API-ключ не настроен на сервере Vercel' });
    }

    try {
        const payload = {
            contents: [{
                parts: [
                    { text: "Analyze the food in this image. Output JSON with strictly these keys: foodName (Russian string), calories (int), protein (int), fat (int), carbs (int). Ensure pure JSON, no markdown formatting." },
                    { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
                ]
            }],
            generationConfig: { responseMimeType: "application/json" }
        };

        // Стучимся ровно в ту версию нейросети, которую потребовал Google (gemini-3.8-flash)
        const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!googleRes.ok) {
            const errData = await googleRes.json().catch(() => null);
            throw new Error((errData && errData.error && errData.error.message) ? errData.error.message : 'Ошибка API Google');
        }

        const result = await googleRes.json();
        let textResponse = result.candidates[0].content.parts[0].text;
        
        // Очищаем от Markdown
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(textResponse);

        return res.status(200).json(aiData);

    } catch (error) {
        console.error("Vercel Server Error:", error);
        return res.status(500).json({ error: error.message });
    }
}