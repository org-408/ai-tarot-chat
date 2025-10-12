import { ProviderKey as PrismaProviderKey } from "@prisma/client";
import { ProviderKey } from "../../../shared/lib/types";

export const convertFromPrismaProviderKey = (
  provider: PrismaProviderKey | null
): ProviderKey => {
  switch (provider) {
    case PrismaProviderKey.GROQ:
      return "GROQ";
    case PrismaProviderKey.GEMINI:
      return "GEMINI";
    case PrismaProviderKey.MISTRAL:
      return "MISTRAL";
    case PrismaProviderKey.GEMINI_PRO:
      return "GEMINI_PRO";
    case PrismaProviderKey.GPT:
      return "GPT";
    case PrismaProviderKey.XAI:
      return "XAI";
    case PrismaProviderKey.CLAUDE:
      return "CLAUDE";
    case PrismaProviderKey.OFFLINE:
      return "OFFLINE";
    default:
      return "GROQ";
  }
};
