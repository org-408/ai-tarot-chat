import { ProviderKey as PrismaProviderKey } from "@prisma/client";
import { ProviderKey } from "../../../shared/lib/types";

export const convertFromPrismaProviderKey = (
  provider: PrismaProviderKey | null
): ProviderKey => {
  switch (provider) {
    case PrismaProviderKey.GPT5NANO:
      return "GPT5NANO";
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
      return "GPT5NANO";
  }
};

export const convertToPrismaProviderKey = (
  provider: ProviderKey | null
): PrismaProviderKey => {
  switch (provider) {
    case "GPT5NANO":
      return PrismaProviderKey.GPT5NANO;
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
      return PrismaProviderKey.GPT5NANO;
  }
};
