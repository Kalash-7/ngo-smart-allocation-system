import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function processSurveyImage(base64Image: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze this survey form image. Extract all key information and present it as:
    1. A short summary of the survey's purpose.
    2. A list of keypoints (structured data).
    
    The output must focus on actionable community needs or volunteer tasks mentioned in the form.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          extractedData: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING },
              location: { type: Type.STRING },
              respondent: { type: Type.STRING },
              needs: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        },
        required: ["summary", "keyPoints"]
      }
    }
  });

  if (!response.text) {
    throw new Error("Failed to extract data from survey.");
  }

  return JSON.parse(response.text);
}

export async function matchVolunteerToTasks(volunteerSkills: string[], tasks: any[]) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Given a volunteer with these skills: ${volunteerSkills.join(", ")}
    And the following open tasks: ${JSON.stringify(tasks)}
    
    Recommend the top 3 matches. Explain why they are a good fit.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            taskId: { type: Type.STRING },
            matchScore: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
}
