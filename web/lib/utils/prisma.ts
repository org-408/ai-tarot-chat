import { ProviderKey as PrismaProviderKey } from "@prisma/client";
import { ProviderKey } from "../../../shared/lib/types";

export const convertFromPrismaProviderKey = (
  provider: PrismaProviderKey | null
): ProviderKey => {
  switch (provider) {
    case PrismaProviderKey.GEMINI20:
      return "GEMINI20";
    case PrismaProviderKey.GEMINI25:
      return "GEMINI25";
    case PrismaProviderKey.GEMINI25PRO:
      return "GEMINI25PRO";
    case PrismaProviderKey.GPT41:
      return "GPT41";
    case PrismaProviderKey.GPT5:
      return "GPT5";
    case PrismaProviderKey.CLAUDE_H:
      return "CLAUDE_H";
    case PrismaProviderKey.CLAUDE_S:
      return "CLAUDE_S";
    case PrismaProviderKey.OFFLINE:
      return "OFFLINE";
    default:
      return "GEMINI20";
  }
};

export const convertToPrismaProviderKey = (
  provider: ProviderKey | null
): PrismaProviderKey => {
  switch (provider) {
    case "GEMINI20":
      return PrismaProviderKey.GEMINI20;
    case "GEMINI25":
      return PrismaProviderKey.GEMINI25;
    case "GEMINI25PRO":
      return PrismaProviderKey.GEMINI25PRO;
    case "GPT41":
      return PrismaProviderKey.GPT41;
    case "GPT5":
      return PrismaProviderKey.GPT5;
    case "CLAUDE_H":
      return PrismaProviderKey.CLAUDE_H;
    case "CLAUDE_S":
      return PrismaProviderKey.CLAUDE_S;
    case "OFFLINE":
      return PrismaProviderKey.OFFLINE;
    default:
      return PrismaProviderKey.GEMINI20;
  }
};
