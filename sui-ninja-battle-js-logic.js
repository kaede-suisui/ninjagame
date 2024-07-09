1. バトルシステム (`src/bot/battle_system.js`):

```javascript
const { callMoveFunction } = require('../utils/sui_integration');
const userSession = require('./user_session');

class BattleSystem {
  constructor() {
    this.activeBattles = new Map();
  }

  async createBattle(player1, player2, weapon1, weapon2) {
    const battleId = `battle_${Math.floor(Math.random() * 9000) + 1000}`;
    this.activeBattles.set(battleId, {
      player1,
      player2,
      weapon1,
      weapon2,
      currentRound: 0,
      maxRounds: 3,
      player1Wins: 0,
      player2Wins: 0,
      moves: { player1: null, player2: null }
    });
    return battleId;
  }

  async makeMove(battleId, player, move) {
    const battle = this.activeBattles.get(battleId);
    if (!battle) {
      throw new Error("Invalid battle ID");
    }

    if (player !== battle.player1 && player !== battle.player2) {
      throw new Error("Invalid player for this battle");
    }

    const playerKey = player === battle.player1 ? 'player1' : 'player2';
    battle.moves[playerKey] = move;

    if (battle.moves.player1 && battle.moves.player2) {
      return this.resolveRound(battleId);
    }
    return { status: "waiting", message: "Waiting for opponent's move" };
  }

  async resolveRound(battleId) {
    const battle = this.activeBattles.get(battleId);
    const { player1, player2 } = battle;
    const move1 = battle.moves.player1;
    const move2 = battle.moves.player2;
    const weapon1 = battle.weapon1;
    const weapon2 = battle.weapon2;

    const power1 = await this.calculatePower(move1, weapon1);
    const power2 = await this.calculatePower(move2, weapon2);

    const result = this.determineWinner(move1, move2, power1, power2);
    battle.currentRound++;

    if (result === "player1") {
      battle.player1Wins++;
    } else if (result === "player2") {
      battle.player2Wins++;
    }

    battle.moves = { player1: null, player2: null };

    if (battle.player1Wins === 2 || battle.player2Wins === 2 || battle.currentRound === battle.maxRounds) {
      return this.endBattle(battleId);
    }

    return {
      status: "ongoing",
      currentRound: battle.currentRound,
      player1Wins: battle.player1Wins,
      player2Wins: battle.player2Wins,
      message: `Round ${battle.currentRound} ended`
    };
  }

  async calculatePower(move, weaponId) {
    const basePower = { rock: 100, paper: 100, scissors: 100 }[move];
    const weaponPower = await callMoveFunction('getWeaponPower', [weaponId]);
    return basePower + weaponPower;
  }

  determineWinner(move1, move2, power1, power2) {
    const moves = { rock: 0, paper: 1, scissors: 2 };
    if (moves[move1] === moves[move2]) {
      return power1 > power2 ? "player1" : "player2";
    }
    return (moves[move1] - moves[move2] + 3) % 3 === 1 ? "player1" : "player2";
  }

  async endBattle(battleId) {
    const battle = this.activeBattles.get(battleId);
    const winner = battle.player1Wins > battle.player2Wins ? battle.player1 : battle.player2;

    await callMoveFunction('recordBattleResult', [winner, battle.player1Wins, battle.player2Wins]);

    this.activeBattles.delete(battleId);
    return {
      status: "ended",
      winner,
      player1Wins: battle.player1Wins,
      player2Wins: battle.player2Wins,
      message: `Battle ended! Winner: ${winner}`
    };
  }
}

const battleSystem = new BattleSystem();

module.exports = battleSystem;
```

2. NFT管理システム (`src/bot/nft_management.js`):

```javascript
const { callMoveFunction, queryObject } = require('../utils/sui_integration');

class NFTManagementSystem {
  async getPlayerWeapons(player) {
    const weapons = await callMoveFunction('getPlayerWeapons', [player]);
    return weapons.map(this.formatWeapon);
  }

  formatWeapon(weapon) {
    return {
      id: weapon.id,
      name: weapon.name,
      type: weapon.weapon_type,
      rarity: weapon.rarity,
      power: weapon.power
    };
  }

  async createWeapon(player, weaponType, rarity) {
    const result = await callMoveFunction('createWeapon', [player, weaponType, rarity]);
    return this.formatWeapon(result.created[0]);
  }

  async upgradeWeapon(player, weaponId) {
    const result = await callMoveFunction('upgradeWeapon', [player, weaponId]);
    return this.formatWeapon(result.modified[0]);
  }

  async mergeWeapons(player, weaponId1, weaponId2) {
    const result = await callMoveFunction('mergeWeapons', [player, weaponId1, weaponId2]);
    return this.formatWeapon(result.created[0]);
  }
}

const nftSystem = new NFTManagementSystem();

module.exports = nftSystem;
```

3. ランキングシステム (`src/bot/ranking_system.js`):

```javascript
const { callMoveFunction } = require('../utils/sui_integration');

class RankingSystem {
  constructor() {
    this.currentSeason = 1;
    this.seasonStart = Date.now();
    this.seasonDuration = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
  }

  async updateRanking(player, points) {
    await callMoveFunction('updatePlayerRanking', [player, points, this.currentSeason]);
  }

  async getLeaderboard(topN = 10) {
    const result = await callMoveFunction('getLeaderboard', [this.currentSeason, topN]);
    return result.leaderboard;
  }

  async checkSeasonEnd() {
    if (Date.now() - this.seasonStart >= this.seasonDuration) {
      await this.endSeason();
      return true;
    }
    return false;
  }

  async endSeason() {
    await callMoveFunction('endSeason', [this.currentSeason]);
    await this.distributeSeasonRewards();
    this.currentSeason++;
    this.seasonStart = Date.now();
    await callMoveFunction('startNewSeason', [this.currentSeason]);
  }

  async distributeSeasonRewards() {
    const topPlayers = await this.getLeaderboard(100);
    for (let i = 0; i < topPlayers.length; i++) {
      const reward = this.calculateReward(i + 1);
      await callMoveFunction('distributeSeasonReward', [topPlayers[i].address, reward, this.currentSeason]);
    }
  }

  calculateReward(rank) {
    if (rank === 1) return 10000;
    if (rank <= 10) return 5000;
    if (rank <= 50) return 2000;
    return 1000;
  }
}

const rankingSystem = new RankingSystem();

module.exports = rankingSystem;
```

これらのJavaScriptバージョンは、以前のPythonバージョンと同じロジックを実装していますが、JavaScriptの構文とイディオムを使用しています。主な違いは：

1. クラスの定義方法（`class`キーワードを使用）
2. 非同期処理の扱い（`async/await`を使用）
3. オブジェクトと配列の操作方法
4. SUI SDKとの連携方法（`callMoveFunction`を使用）

これらのモジュールは、`src/bot/handlers.js`から呼び出されて使用されます。必要に応じて、エラーハンドリングやログ記録をさらに強化することができます。