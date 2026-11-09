import {NextResponse} from 'next/server'

// Helper function to make AI API call with fallback model support
async function makeAIRequest(prompt, primaryModel = "tngtech/deepseek-r1t2-chimera:free", fallbackModel = "openrouter/auto") {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error("OpenRouter API key not configured");
  }

  // Try primary model first
  try {
    console.log(`Attempting report generation with primary model: ${primaryModel}`);
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Kuldetek Auditing",
        },
        body: JSON.stringify({
          model: primaryModel,
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    if (response.ok) {
      const result = await response.json();
      console.log(`Primary model ${primaryModel} succeeded for report generation`);
      return result;
    } else {
      const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
      console.warn(`Primary model ${primaryModel} failed for report:`, errorData);
      throw new Error(`Primary model failed: ${JSON.stringify(errorData)}`);
    }
  } catch (primaryError) {
    console.warn(`Primary model ${primaryModel} error:`, primaryError.message);
    
    // Try fallback model
    try {
      console.log(`Attempting report generation with fallback model: ${fallbackModel}`);
      const fallbackResponse = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Kuldetek Auditing",
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages: [{ role: "user", content: prompt }],
          }),
        }
      );

      if (fallbackResponse.ok) {
        const result = await fallbackResponse.json();
        console.log(`Fallback model ${fallbackModel} succeeded for report generation`);
        return result;
      } else {
        const errorData = await fallbackResponse.json().catch(() => ({ error: "Unknown error" }));
        console.error(`Fallback model ${fallbackModel} also failed for report:`, errorData);
        throw new Error(`Both models failed for report. Fallback error: ${JSON.stringify(errorData)}`);
      }
    } catch (fallbackError) {
      console.error(`Fallback model ${fallbackModel} error:`, fallbackError.message);
      throw new Error(`Both primary (${primaryModel}) and fallback (${fallbackModel}) models failed for report generation`);
    }
  }
}

function getReportPrompt(data) {
  const dataString = JSON.stringify(data);
  return `You are an IT auditor. Using the following input data: ${dataString}, generate a comprehensive IT audit report.

Return ONLY valid JSON (no markdown fences, no extra text, no explanations). The JSON MUST match exactly this schema:
{
  "reportTitle": "",
  "auditScope": "",
  "summary": "",
  "findings": [
    {
      "id": "",
      "title": "",
      "severity": "",
      "description": "",
      "evidence": ""
    }
  ],
  "recommendations": [
    {
      "findingId": "",
      "recommendation": ""
    }
  ],
  "conclusion": ""
}`;
}

function tryExtractJsonFromText(text) {
  if (!text || typeof text !== 'string') return null;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    try { return JSON.parse(fenceMatch[1]); } catch {}
  }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try { return JSON.parse(candidate); } catch {}
  }
  return null;
}


  export async function POST(request){

    try{
        const body = await request.json();

        const {data: providedData } = body;

        let reportData = providedData;


        //get api key
        const apiKey = process.env.OPENROUTER_API_KEY;
        
        if (!apiKey) {
            throw new Error('OPENROUTER_API_KEY environment variable is not set');
        }

        console.log('Making request to OpenRouter API with fallback support...');
        console.log('API Key present:', !!apiKey);

        const prompt = getReportPrompt(reportData);

        // Use the new fallback-enabled AI request function
        const aiResponse = await makeAIRequest(prompt);

            // Try to parse the AI response into JSON robustly
            let structured;
            const content = aiResponse?.choices?.[0]?.message?.content ?? '';
            try {
              structured = JSON.parse(content);
              console.log('structured report: ', structured);
            } catch {
              const extracted = tryExtractJsonFromText(content);
              structured = extracted ?? { raw: content };
            }

            return NextResponse.json({ result: structured });
    }catch (error) {
        console.error('error generating report:', error);
        return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
      }
    
  }