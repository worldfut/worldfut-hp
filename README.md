# WorldFut：Cloudflare Pages＋更新管理画面

添付された `worldfut_hp1003.html` を元に、News & Topicsを日本語の管理画面から更新できる構成です。公開中のGitHubリポジトリ `worldfut/worldfut-hp` とは別の作業コピーです。本番サイト・DNSはまだ変更していません。

- 管理画面：`/admin/`（Decap CMS 3.17.1、配布ファイル同梱）
- 更新できる範囲：新着・掲載記事、タイトル、日付、紹介文、本文、写真、関連リンク、表示順、掲載のオン／オフ
- 本文を入力した記事には詳細ページができます。本文は普通の文章で入力します。
- 初期データ：既存6記事・写真32点。団体概要・活動内容は現段階ではHTMLのままです。
- 公開処理：管理画面 → GitHubへ保存 → Cloudflare Pagesがビルド → HP更新

## 手元で開く（制作担当者向け）

Node.js 22以上を使用してください。

```sh
npm ci --ignore-scripts
npm run dev
```

HP：<http://localhost:4173/> ／ 管理画面：<http://localhost:4173/admin/>

ローカルでは「ログイン」を押すと、このフォルダ内を直接編集できます。公開中のHPには影響しません。開発サーバーは信頼できる自分のパソコンでだけ起動してください。Cloudflareに `npm run dev` を設定しないでください。

公開用の生成と確認：

```sh
npm test
npm run build
```

公開するファイルは `dist/` に生成されます。`dist/` は編集せず、元データを変更して再生成します。`node_modules/`・`dist/`・秘密キーはGitHubへ登録しません。

## 最初に読むもの

- [公開設定の手順](docs/公開設定.md)
- [更新担当者の操作手順](docs/更新担当者向け.md)
- [実装と確認状況](docs/確認状況.md)

## 費用

静的HPの配信はCloudflare Pagesの無料枠を利用します。GitHub・オープンソース版Decap CMSも無料枠／無料ソフトで運用する構成です。ログイン時だけPages Functionsを使い、Workers Freeの利用枠が適用されます。無料枠やサービス条件は各社の現行条件を確認してください。独自ドメインの更新費用・既存問い合わせサービスの料金は別です。

## 配布ファイル

`public/admin/vendor` はnpmの `decap-cms@3.17.1` の公式配布物です。利用ライブラリのライセンス表示は `decap-cms.js.LICENSE.txt` に同梱しています。配布元：https://www.npmjs.com/package/decap-cms

Cloudflare Pagesの仕様：https://developers.cloudflare.com/pages/
Decap CMSの仕様：https://decapcms.org/docs/
