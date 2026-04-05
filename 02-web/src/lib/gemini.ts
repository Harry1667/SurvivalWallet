import { GoogleGenAI } from "@google/genai";
import type { Category, IncomeCategory } from '../types';

// Priority: runtime override (set by SettingsModal) → env var
const getApiKey = () =>
  (window as any).__GEMINI_API_KEY_OVERRIDE__ || import.meta.env.VITE_GEMINI_API_KEY || '';

export interface ParsedTransaction {
  transaction_type: 'expense' | 'income';
  amount: number;
  item: string;
  category: Category | IncomeCategory;
}

const EXPENSE_CATEGORIES = ['生存正餐', '快樂水/零食', '生活日用', '交通通勤', '娛樂社交', '自我投資', '其他雜項'];
const INCOME_CATEGORIES = ['基礎補給', '任務賞金', '天降寶箱', '裝備變現', '被動生息', '其他補血'];

export const parseTransaction = async (text: string): Promise<ParsedTransaction | null> => {
  const apiKey = getApiKey();

  // Fallback if no API key
  if (!apiKey) {
    console.warn("⚠️ 未設定 API Key，將使用模擬解析");
    const amountMatch = text.match(/\d+/);
    const amount = amountMatch ? Number(amountMatch[0]) : 0;
    const isIncome = /賺|收|薪|獎|發|中|入帳/.test(text);
    return {
      transaction_type: isIncome ? 'income' : 'expense',
      amount,
      item: text.replace(/\d+/g, '').trim() || "未知品項",
      category: isIncome ? '其他補血' : '其他雜項',
    };
  }

  // Create a fresh client with the current key each call
  const genAI = new GoogleGenAI({ apiKey });

  try {
    const prompt = `你是一個記帳 AI，請分析以下這段自然語言，判斷是「支出」還是「收入」，並提取相關記帳資訊。

文字：「${text}」

判斷規則：
- 若提到「花費」「買」「吃」「搭車」「繳」「付」等，通常是支出
- 若提到「賺」「收到」「薪水」「收入」「獎金」「賣掉」「利息」等，通常是收入

支出分類（擇一）：${EXPENSE_CATEGORIES.join('、')}
收入分類（擇一）：${INCOME_CATEGORIES.join('、')}

請只回傳一個 JSON 物件，格式如下：
{
  "transaction_type": "expense" 或 "income",
  "amount": 數字（必填，整數）,
  "item": "品項名稱（簡短描述）",
  "category": "從上方對應分類中選一個"
}`;

    const response = await genAI.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const jsonText = response.text || "{}";
    console.log('🤖 AI 解析結果:', jsonText);
    const parsed = JSON.parse(jsonText);
    return {
      transaction_type: parsed.transaction_type === 'income' ? 'income' : 'expense',
      amount: Math.floor(Math.abs(Number(parsed.amount) || 0)),
      item: parsed.item || '未分類',
      category: parsed.category || (parsed.transaction_type === 'income' ? '其他補血' : '其他雜項'),
    };
  } catch (error) {
    console.error("❌ Gemini parsing error:", error);
    return null;
  }
};

// Keep backward-compatible alias for older call sites
export const parseExpense = parseTransaction;
