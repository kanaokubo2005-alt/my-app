# ToDone

## 必須設定

`.env.example` を `.env` にコピーして値を設定します。Gemini を使うには
`GEMINI_API_KEY` が必要です。Google カレンダーを再ログイン後も同期するには、
アプリ運営者がGoogle Cloud ConsoleでCalendar APIを有効化し、OAuth同意画面と
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` を設定してください。これらを
ユーザーが入力・閲覧することはありません。

開発時は API を `http://localhost:8888`、フロントエンドを `client` ディレクトリで
起動します。
