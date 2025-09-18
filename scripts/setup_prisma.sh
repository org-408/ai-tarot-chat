#!/bin/bash

#
# prisma セットアップスクリプト
# このスクリプトは、 Web の prisma 環境をセットアップするためのスクリプトです。
#
# 前提条件:
# - Node.js がインストールされていること
# - npm がインストールされていること
# - root/web ディレクトリが存在すること(このスクリプトは root/web に Next.js + shadcn/ui がセットアップされていることを前提としています)

# エラー時に処理を中断する
set -e

echo "Web セットアップを開始します..."

# Node.jsがインストールされているか確認
if ! command -v node &> /dev/null; then
    echo "Node.jsがインストールされていません。インストールしてください。"
    exit 1
fi

# Npmがインストールされているか確認
if ! command -v npm &> /dev/null; then
    echo "Npmがインストールされていません。インストールしてください。"
    exit 1
fi

# 必要なディレクトリに移動
cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"

# ROOT_DIR/web ディレクトリが存在するか確認
if [ ! -d "$ROOT_DIR/web" ]; then
  echo "$ROOT_DIR/web ディレクトリが存在しません。セットアップを中止します。"
  exit 1
fi

# web ディレクトリに移動
cd "$ROOT_DIR/web"

echo "依存パッケージをインストールしています..."

# Prisma 関連のパッケージをインストール
echo "Prisma 関連のパッケージをインストールしています..."
npm install prisma tsx --save-dev
# npm install @prisma/extension-accelerate @prisma/client
npm install @prisma/client
rm -rf prisma
# npx prisma init --db --output ../prisma
npx prisma init --datasource-provider postgresql
npx prisma migrate dev --name init

mkdir -p ./prisma
cat > ./prisma/prisma.ts << EOF
import { PrismaClient } from "@prisma/client"
 
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }
 
export const prisma = globalForPrisma.prisma || new PrismaClient()
 
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
EOF

cat > ./prisma/schema.prisma << EOF
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
 
generator client {
  provider = "prisma-client-js"
}
 
model User {
  id            String          @id @default(cuid())
  name          String?
  email         String          @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  // Optional for WebAuthn support
  Authenticator Authenticator[]
 
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
 
model Account {
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
 
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
 
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
 
  @@id([provider, providerAccountId])
}
 
model Session {
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
 
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
 
model VerificationToken {
  identifier String
  token      String
  expires    DateTime
 
  @@id([identifier, token])
}
 
// Optional for WebAuthn support
model Authenticator {
  credentialID         String  @unique
  userId               String
  providerAccountId    String
  credentialPublicKey  String
  counter              Int
  credentialDeviceType String
  credentialBackedUp   Boolean
  transports           String?
 
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
 
  @@id([userId, credentialID])
}
EOF

# .env, .env.local ファイルをアップデート
echo "環境変数ファイルをアップデートしています..."
cat >> ./.env.local << EOF
AUTH_GOOGLE_ID=922187527148-9pu98mm47bm1sappj3r3ga4fbctp7pl4.apps.googleusercontent.com
AUTH_GOOGLE_SECRET=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
AUTH_GOOGLE_CALLBACK=http://localhost:3000/api/auth/callback/google
AUTH_GITHUB_ID=Ov23livj6icjFHLmqdHZ
AUTH_GITHUB_SECRET=b0473cd46a3cb1775cbacc55096ce367961da557
AUTH_GITHUB_CALLBACK=http://localhost:3000/api/auth/callback/github

# Next.js
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
EOF

cat > ./.env << EOF
# db
DB_USER=aitarot
DB_PASSWORD=nhf99VbZBfbrUpTH
DB_NAME=aitarot
DB_HOST=localhost
DB_PORT=5432

# This was inserted by `prisma init`:
# Environment variables declared in this file are automatically made available to Prisma.
# See the documentation for more detail: https://pris.ly/d/prisma-schema#accessing-environment-variables-from-the-schema

# Prisma supports the native connection string format for PostgreSQL, MySQL, SQLite, SQL Server, MongoDB and CockroachDB.
# See the documentation for all the connection string options: https://pris.ly/d/connection-strings

DATABASE_URL="postgresql://aitarot:nhf99VbZBfbrUpTH@localhost:5432/aitarot?schema=public"
EOF

# jqがインストールされているか確認し、なければインストール
if ! command -v jq &> /dev/null; then
  echo "jqがインストールされていません。Homebrewでインストールします..."
  if command -v brew &> /dev/null; then
    brew install jq
  else
    echo "Homebrewがインストールされていません。jqを手動でインストールしてください。"
    exit 1
  fi
fi

# package.jsonのscriptsセクションに新しいコマンドを追加
echo "package.jsonを更新しています..."
if command -v jq &> /dev/null; then
  echo "jqを使ってpackage.jsonを更新しています..."
  
  # 既存のpackage.jsonを読み込み、scriptsに新しいエントリを追加
  jq '.scripts += {
    "db:migrate": "npx prisma migrate dev",
    "db:reset": "npx prisma migrate reset --force",
    "db:reset+": "npx prisma migrate reset --force && npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:push": "npx prisma db push",
    "db:studio": "npx prisma studio"
  }' package.json > package.json.tmp && mv package.json.tmp package.json
fi

echo "Web セットアップが完了しました。"