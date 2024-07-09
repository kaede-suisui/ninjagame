```
sui_ninja_battle/
│
├── smart_contracts/
│   ├── nft.move
│   ├── battle.move
│   ├── player_stats.move
│   ├── ranking.move
│   └── game_state.move
│
├── src/
│   ├── index.js
│   ├── bot/
│   │   ├── handlers.js
│   │   ├── ui_components.js
│   │   ├── battle_system.js
│   │   ├── nft_management.js
│   │   ├── ranking_system.js
│   │   ├── event_system.js
│   │   └── user_session.js
│   │
│   ├── utils/
│   │   ├── sui_integration.js
│   │   └── error_handling.js
│   │
│   └── localization/
│       ├── en.json
│       ├── ja.json
│       └── i18n.js
│
├── tests/
│   ├── battle_system.test.js
│   ├── nft_management.test.js
│   ├── ranking_system.test.js
│   └── event_system.test.js
│
├── README.md
├── package.json
└── .gitignore
```

主要なファイルの内容：

1. `package.json`:

```json
{
  "name": "sui-ninja-battle",
  "version": "1.0.0",
  "description": "A Telegram bot game running on SUI blockchain",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "test": "jest"
  },
  "dependencies": {
    "telegraf": "^4.12.2",
    "@mysten/sui.js": "^0.37.1",
    "i18next": "^23.2.8"
  },
  "devDependencies": {
    "jest": "^29.6.1"
  }
}
```

2. `src/index.js`:

```javascript
const { Telegraf } = require('telegraf');
const handlers = require('./bot/handlers');
const i18n = require('./localization/i18n');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Middleware for i18n
bot.use((ctx, next) => {
  ctx.i18n = i18n;
  return next();
});

// Command handlers
bot.command('start', handlers.start);

// Callback query handlers
bot.on('callback_query', handlers.handleCallbackQuery);

bot.launch();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
```

3. `src/bot/handlers.js`:

```javascript
const ui = require('./ui_components');
const battleSystem = require('./battle_system');
const nftManagement = require('./nft_management');
const userSession = require('./user_session');

async function start(ctx) {
  await ui.showMainMenu(ctx);
}

async function handleCallbackQuery(ctx) {
  const action = ctx.callbackQuery.data;

  switch (action) {
    case 'start_battle':
      await battleSystem.startBattle(ctx);
      break;
    case 'manage_weapons':
      await ui.showWeaponManagement(ctx);
      break;
    case 'show_rankings':
      await ui.showRankings(ctx);
      break;
    case 'show_events':
      await ui.showEvents(ctx);
      break;
    case 'show_profile':
      await ui.showProfile(ctx);
      break;
    default:
      if (action.startsWith('weapon_')) {
        await nftManagement.handleWeaponAction(ctx);
      } else if (['rock', 'paper', 'scissors'].includes(action)) {
        await battleSystem.handleBattleMove(ctx);
      }
  }
}

module.exports = {
  start,
  handleCallbackQuery
};
```

4. `src/bot/ui_components.js`:

```javascript
const { Markup } = require('telegraf');

async function showMainMenu(ctx) {
  const { i18n } = ctx;
  return ctx.reply(i18n.t('welcome'), Markup.inlineKeyboard([
    [Markup.button.callback(i18n.t('battle_start'), 'start_battle')],
    [Markup.button.callback(i18n.t('manage_weapons'), 'manage_weapons')],
    [Markup.button.callback(i18n.t('rankings'), 'show_rankings')],
    [Markup.button.callback(i18n.t('events'), 'show_events')],
    [Markup.button.callback(i18n.t('profile'), 'show_profile')]
  ]));
}

// ... その他のUI関数 (showWeaponManagement, showRankings, showEvents, showProfile)

module.exports = {
  showMainMenu,
  // ... その他のエクスポート
};
```

5. `src/utils/sui_integration.js`:

```javascript
const { JsonRpcProvider, devnetConnection } = require('@mysten/sui.js');

const provider = new JsonRpcProvider(devnetConnection);

async function callMoveFunction(packageObjectId, moduleName, functionName, typeArguments, arguments, gasBudget) {
  try {
    const result = await provider.executeMoveCall({
      packageObjectId,
      module: moduleName,
      function: functionName,
      typeArguments,
      arguments,
      gasBudget
    });
    return result;
  } catch (error) {
    console.error('Error calling Move function:', error);
    throw error;
  }
}

async function queryObject(objectId) {
  try {
    const object = await provider.getObject(objectId);
    return object;
  } catch (error) {
    console.error('Error querying object:', error);
    throw error;
  }
}

module.exports = {
  callMoveFunction,
  queryObject
};
```

6. `src/localization/i18n.js`:

```javascript
const i18next = require('i18next');
const en = require('./en.json');
const ja = require('./ja.json');

i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    ja: { translation: ja }
  }
});

module.exports = i18next;
```

7. `README.md`:

```markdown
# SUI忍者バトル

SUI忍者バトルは、SUIブロックチェーン上で動作するTelegramボットゲームです。プレイヤーは忍者となり、NFT忍具を使って他のプレイヤーとバトルを行います。

## 特徴

- NFT忍具システム
- リアルタイムバトル
- ランキングとイベントシステム
- 多言語サポート

## セットアップ

1. リポジトリをクローン
2. 依存関係をインストール: `npm install`
3. 環境変数に`BOT_TOKEN`を設定（Telegramボットトークン）
4. `npm start`を実行してボットを起動

## 開発

- `smart_contracts/`ディレクトリにはMoveで書かれたスマートコントラクトが含まれています。
- `src/`ディレクトリにはJavaScriptで書かれたTelegramボットの実装が含まれています。
- `tests/`ディレクトリにはJestを使用したユニットテストが含まれています。

## テスト

テストを実行するには、`npm test`コマンドを使用します。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
```

これらのファイルとプロジェクト構造を使用して、GitHubリポジトリを作成し、コードをアップロードすることができます。`.gitignore`ファイルを適切に設定し、機密情報（ボットトークンなど）がリポジトリに含まれないようにしてください。

このJavaScriptバージョンでは、Node.jsとTelegraf.jsを使用してTelegramボットを実装し、SUIとの連携には@mysten/sui.jsを使用しています。多言語サポートにはi18nextを使用しています。