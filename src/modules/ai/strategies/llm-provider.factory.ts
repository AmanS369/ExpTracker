import { LLMProvider } from "../providers/interfaces/llm-provider.interface";
import { GroqProvider } from "../providers/groq/groq.provider";
import { GeminiProvider } from "../providers/gemini/gemini.provider";

export class LLMProviderFactory {
  static createProvider(): LLMProvider {
    const provider = (process.env.AI_PROVIDER || "groq").toLowerCase();

    switch (provider) {
      case "groq":
        return new GroqProvider();
      case "gemini":
        return new GeminiProvider();
      default:
        throw new Error(
          `Unsupported LLM provider "${provider}". Supported providers: "groq", "gemini".`
        );
    }
  }
}
