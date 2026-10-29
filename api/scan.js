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
        // 1. АВТО-ОПРЕДЕЛЕНИЕ МОДЕЛИ У GOOGLE
        const modelsReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!modelsReq.ok) throw new Error("Не удалось получить список моделей от Google API");
        
        const modelsData = await modelsReq.json();
        let selectedModel = "models/gemini-1.5-flash"; // Значение по умолчанию
        
        if (modelsData && modelsData.models) {
            const validModels = modelsData.models.filter(m => 
                m.supportedGenerationMethods && 
                m.supportedGenerationMethods.includes('generateContent') && 
                m.name.includes('flash')
            );
            if (validModels.length > 0) {
                selectedModel = validModels[0].name;
            } else {
                const anyModel = modelsData.models.find(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'));
                if (anyModel) selectedModel = anyModel.name;
            }
        }

        // 2. ОТПРАВКА ФОТО В НАЙДЕННУЮ МОДЕЛЬ
        const payload = {
            contents: [{
                parts: [
                    { text: "Analyze the food in this image. Output JSON with strictly these keys: foodName (Russian string), calories (int), protein (int), fat (int), carbs (int). Ensure pure JSON, no markdown formatting." },
                    { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
                ]
            }],
            generationConfig: { responseMimeType: "application/json" }
        };

        const googleRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/${selectedModel}:generateContent?key=${apiKey}`, {
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
        
        // Очищаем от Markdown (```json ... ```)
        textResponse = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const aiData = JSON.parse(textResponse);

        // Отправляем результат обратно в интерфейс
        return res.status(200).json(aiData);

    } catch (error) {
        console.error("Vercel Server Error:", error);
        return res.status(500).json({ error: error.message });
    }
}