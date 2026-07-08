import "dotenv/config";
import "dotenv/config";
import express from "express";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";
console.log("--- 診断開始 ---");
console.log("DATABASE_URLの長さ:", process.env.DATABASE_URL?.length || 0);
console.log(
  "DATABASE_URLの最初の10文字:",
  process.env.DATABASE_URL?.substring(0, 10),
);

// PostgreSQL への接続設定（1回だけ定義するぞ）
// index.ts の pool を作るところをこう書き換える
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true, // 明示的に SSL を使うように指定するぞ
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["query"] });

const app = express();
const PORT = process.env.PORT || 8888;

// 画面（EJS）の設定
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(express.urlencoded({ extended: true }));

// メイン画面：ユーザー一覧を表示
app.get("/", async (req, res) => {
  const users = await prisma.user.findMany();
  res.render("index", { users });
});

// ユーザー追加：名前を保存してリダイレクト
app.post("/users", async (req, res) => {
  const name = req.body.name;
  if (name) {
    await prisma.user.create({ data: { name } });
  }
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
