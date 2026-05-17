
const createRegularPolygonVertices = (radius, sides) => {
  const TWO_PI = Math.PI * 2;
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = -Math.PI / 2 + (TWO_PI * i) / sides;
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }
  return points;
};

const fruits = [
  { name: "fruit01", radius: 28, collisionRadius: 27, collisionPolygonSides: 8 },
  { name: "fruit02", radius: 33, collisionRadius: 30, collisionPolygonSides: 8 },
  { name: "fruit03", radius: 38, collisionRadius: 38, collisionPolygonSides: 9 },
  { name: "fruit04", radius: 47, collisionRadius: 44, collisionPolygonSides: 10 },
  { name: "fruit05", radius: 62, collisionRadius: 59, collisionPolygonSides: 10 },
  { name: "fruit06", radius: 66, collisionRadius: 66, collisionPolygonSides: 12 },
  { name: "fruit7", radius: 76, collisionRadius: 76, collisionPolygonSides: 12 },
  { name: "fruit8", radius: 85, collisionRadius: 85, collisionPolygonSides: 14 },
  { name: "fruit09", radius: 95, collisionRadius: 91, collisionPolygonSides: 14 },
  { name: "fruit10", radius: 104, collisionRadius: 103, collisionPolygonSides: 16 },
  { name: "fruit11", radius: 114, collisionRadius: 114, collisionPolygonSides: 16 },
].map((fruit) => ({
  ...fruit,
  collisionPolygonVertices: createRegularPolygonVertices(
    fruit.collisionRadius,
    fruit.collisionPolygonSides
  ),
}));

const VERSION = "v0.0.2";
const MAX_INITIAL_FRUIT_INDEX = 5;
const ZIRAI_CHAN_SIZE = 100;

const FRAME_LEFT = 65;
const FRAME_TOP = 175;
const FRAME_WIDTH = 470;
const FRAME_HEIGHT = 798;

const PANEL_BG_COLOR = 0x2d1e14;
const PANEL_BG_OPACITY = 0.7;
const PANEL_SHADOW_COLOR = 0x4a3820;
const PANEL_SHADOW_OPACITY = 0.7;
const PANEL_BORDER_COLOR = 0x8b7355;

class Main extends Phaser.Scene {
  score = 0;
  gameOver = false;
  nextFruitItem = null;
  ceilingHitTimer = null;

  preload() {
    const { width, height } = this.cameras.main;

    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const progressBar = this.add.graphics();

    const loadingText = this.add
      .text(width / 2, height / 2 - 55, "Loading...", {
        fontSize: "18px",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);

    this.load.on("progress", (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xaaaaff, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on("complete", () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      const rankingBtn = document.getElementById("ranking-btn");
      if (rankingBtn) rankingBtn.style.display = "block";
    });

    this.load.path = "public/";
    this.load.image("newgame", "New Game Button.png");
    this.load.image("zirai_chan", "zirai_chan.png");

    for (const fruit of fruits) {
      this.load.image(`${fruit.name}`, `${fruit.name}.png`);
    }

    this.load.audio("merge", "Onoma-Pop04-1(High-Dry).mp3");
  }

  updateDropper(fruit) {
    const dropperY = fruit.radius + FRAME_TOP + 5;
    this.dropper
      .setTexture(fruit.name)
      .setName(fruit.name)
      .setDisplaySize(fruit.radius * 2, fruit.radius * 2)
      .setY(dropperY);
    // Position zirai_chan so its bottom edge aligns with the fruit dropper (fruit at lower-left of zirai_chan)
    this.ziraiChan.setY(dropperY - ZIRAI_CHAN_SIZE / 2);
    this.setDropperX(this.input.activePointer.x);

    this.group.getChildren().forEach((gameObject) => {
      if (gameObject instanceof Phaser.GameObjects.Image) {
        gameObject.postFX.clear();

        if (gameObject.name === fruit.name) {
          gameObject.postFX.addShine();
        }
      }
    });
  }

  updateNextPanel(fruit) {
    const size = Math.min(fruit.radius * 2, 80);
    this.nextFruitImage.setTexture(fruit.name).setDisplaySize(size, size);
  }

  setDropperX(x) {
    const p = 65;
    const r = this.dropper.displayWidth / 2;
    if (x < r + p) {
      x = r + p;
    } else if (x > +this.game.config.width - r - p) {
      x = +this.game.config.width - r - p;
    }
    this.dropper.setX(x);
    // Position zirai_chan so its left edge aligns with the dropper (fruit at lower-left of zirai_chan)
    this.ziraiChan.setX(x + ZIRAI_CHAN_SIZE / 2);
  }

  addFruit(x, y, fruit) {
    return this.matter.add
      .image(x, y, fruit.name)
      .setName(fruit.name)
      .setDisplaySize(fruit.radius * 2, fruit.radius * 2)
      .setBody({
        type: "fromVerts",
        verts: fruit.collisionPolygonVertices,
      })
      .setFriction(0.005)
      .setBounce(0.2)
      .setDepth(-1)
      .setOnCollideWith(this.ceiling, () => {
        this.events.emit("ceilinghit");
      });
  }

  drawScore() {
    this.scoreText.setText(this.score.toString());
  }

  create() {
    // --- Game frame (antique gold container) ---
    const frameGraphics = this.add.graphics();
    frameGraphics.setDepth(-2);

    // Inner background: dark semi-transparent brown for depth / container feel
    frameGraphics.fillStyle(0x2d1e14, 0.4);
    frameGraphics.fillRect(FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, FRAME_HEIGHT);

    // Metallic antique gold bars with 3D highlight/shadow effect
    const barW = 8;
    const halfBarWidth = barW / 2;
    const edgeW = 2; // width of highlight / shadow strips

    // Vertical metallic bar helper
    // highlightLeft: true → highlight on left edge (outer), shadow on right edge (inner)
    const drawVBar = (cx, y, h, highlightLeft) => {
      frameGraphics.fillStyle(0x8b7355, 1);
      frameGraphics.fillRect(cx - halfBarWidth, y, barW, h);
      frameGraphics.fillStyle(0xc4a882, 0.85);
      frameGraphics.fillRect(highlightLeft ? cx - halfBarWidth : cx + halfBarWidth - edgeW, y, edgeW, h);
      frameGraphics.fillStyle(0x4a3820, 0.85);
      frameGraphics.fillRect(highlightLeft ? cx + halfBarWidth - edgeW : cx - halfBarWidth, y, edgeW, h);
    };

    // Horizontal metallic bar helper
    // highlightBottom: true → highlight on bottom edge (outer), shadow on top edge (inner)
    const drawHBar = (x, cy, w, highlightBottom) => {
      frameGraphics.fillStyle(0x8b7355, 1);
      frameGraphics.fillRect(x, cy - halfBarWidth, w, barW);
      frameGraphics.fillStyle(0xc4a882, 0.85);
      frameGraphics.fillRect(x, highlightBottom ? cy + halfBarWidth - edgeW : cy - halfBarWidth, w, edgeW);
      frameGraphics.fillStyle(0x4a3820, 0.85);
      frameGraphics.fillRect(x, highlightBottom ? cy - halfBarWidth : cy + halfBarWidth - edgeW, w, edgeW);
    };

    // Top wall: highlight on outer (top) side
    drawHBar(FRAME_LEFT - halfBarWidth, FRAME_TOP, FRAME_WIDTH + barW, false);
    // Left wall: highlight on outer (left) side
    drawVBar(FRAME_LEFT, FRAME_TOP, FRAME_HEIGHT + halfBarWidth, true);
    // Right wall: highlight on outer (right) side
    drawVBar(FRAME_LEFT + FRAME_WIDTH, FRAME_TOP, FRAME_HEIGHT + halfBarWidth, false);
    // Bottom wall: highlight on outer (bottom) side
    drawHBar(FRAME_LEFT - halfBarWidth, FRAME_TOP + FRAME_HEIGHT, FRAME_WIDTH + barW, true);

    // --- Score panel (antique gold style) ---
    const scorePanel = this.add.graphics();
    scorePanel.fillStyle(PANEL_BG_COLOR, PANEL_BG_OPACITY);
    scorePanel.fillRoundedRect(80, 15, 210, 100, 12);
    scorePanel.lineStyle(4, PANEL_SHADOW_COLOR, PANEL_SHADOW_OPACITY);
    scorePanel.strokeRoundedRect(80, 15, 210, 100, 12);
    scorePanel.lineStyle(2, PANEL_BORDER_COLOR, 1);
    scorePanel.strokeRoundedRect(80, 15, 210, 100, 12);

    this.add.text(185, 28, "SCORE", {
      fontSize: "14px",
      fontFamily: "Georgia, serif",
      color: "#f0e68c",
      fontStyle: "bold",
      shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 3, fill: true },
    }).setOrigin(0.5, 0);

    this.scoreText = this.add
      .text(185, 80, "0", {
        fontSize: "42px",
        fontFamily: "Georgia, serif",
        color: "#f0e68c",
        fontStyle: "bold",
        stroke: "#4a3820",
        strokeThickness: 4,
        shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 4, fill: true },
      })
      .setOrigin(0.5, 0.5);
    this.drawScore();

    // --- Next panel (antique gold style) ---
    const nextPanel = this.add.graphics();
    nextPanel.fillStyle(PANEL_BG_COLOR, PANEL_BG_OPACITY);
    nextPanel.fillRoundedRect(390, 15, 145, 155, 12);
    nextPanel.lineStyle(4, PANEL_SHADOW_COLOR, PANEL_SHADOW_OPACITY);
    nextPanel.strokeRoundedRect(390, 15, 145, 155, 12);
    nextPanel.lineStyle(2, PANEL_BORDER_COLOR, 1);
    nextPanel.strokeRoundedRect(390, 15, 145, 155, 12);

    this.add.text(462, 28, "NEXT", {
      fontSize: "14px",
      fontFamily: "Georgia, serif",
      color: "#f0e68c",
      fontStyle: "bold",
      shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 3, fill: true },
    }).setOrigin(0.5, 0);

    this.nextFruitItem = fruits[Math.floor(Math.random() * MAX_INITIAL_FRUIT_INDEX)];
    const initNextSize = Math.min(this.nextFruitItem.radius * 2, 80);
    this.nextFruitImage = this.add
      .image(462, 110, this.nextFruitItem.name)
      .setDisplaySize(initNextSize, initNextSize);

    // --- Version info ---
    this.add.text(597, 5, VERSION, {
      fontSize: "11px",
      color: "#556677",
    }).setOrigin(1, 0);

    this.mergeSound = this.sound.add("merge");

    // --- Physics setup ---
    this.matter.world.setBounds(
      FRAME_LEFT,
      0,
      FRAME_WIDTH,
      FRAME_TOP + FRAME_HEIGHT
    );
    this.group = this.add.group();

    const emitter = this.add.particles(0, 0, fruits[0].name, {
      lifespan: 1000,
      speed: { min: 200, max: 350 },
      scale: { start: 0.1, end: 0 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0 },
      gravityY: 200,
      emitting: false,
    });

    const button = this.add
      .image(
        +this.game.config.width / 2,
        +this.game.config.height / 2,
        "newgame"
      )
      .setScale(0.4)
      .setInteractive({ useHandCursor: true })
      .setVisible(false);
    button.postFX.addGlow(0x000000, 0.75);
    button.on("pointerover", () => {
      this.tweens.add({
        targets: button,
        scale: 0.425,
        ease: "Linear",
        duration: 100,
      });
    });
    button.on("pointerout", () => {
      this.tweens.add({
        targets: button,
        scale: 0.4,
        ease: "Linear",
        duration: 100,
      });
    });
    button.on("pointerup", () => {
      this.score = 0;
      this.gameOver = false;
      this.ceilingHitTimer = null;
      this.scene.restart();
    });

    this.dropper = this.add.image(
      this.input.activePointer.x,
      0,
      fruits[0].name
    );
    const glow = this.dropper.postFX.addGlow(0x99ddff);
    this.tweens.addCounter({
      yoyo: true,
      repeat: -1,
      from: 1,
      to: 3,
      duration: 1000,
      onUpdate: function (tween) {
        glow.outerStrength = tween.getValue();
      },
    });

    this.ziraiChan = this.add
      .image(0, 0, "zirai_chan")
      .setDisplaySize(ZIRAI_CHAN_SIZE, ZIRAI_CHAN_SIZE);

    this.updateDropper(fruits[0]);

    this.ceiling = this.matter.add.rectangle(
      +this.game.config.width / 2,
      FRAME_TOP / 2,
      +this.game.config.width,
      FRAME_TOP
    );
    this.ceiling.isStatic = true;

    // Drop line with shine effect
    const line = this.add
      .rectangle(FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, 2, 0xccccff)
      .setOrigin(0)
      .setAlpha(0.15)
      .setDepth(-1);
    line.postFX.addShine();
    line.postFX.addGlow();

    this.input.on("pointermove", (pointer) => {
      this.setDropperX(pointer.x);
    });

    this.input.on("pointerup", () => {
      if (!this.dropper.visible || this.gameOver) {
        return;
      }

      this.dropper.setVisible(false);
      this.time.delayedCall(500, () => {
        const show = !this.gameOver;
        this.dropper.setVisible(show);
        this.ziraiChan.setVisible(show);
      });

      const currentFruit = fruits.find(
        (fruit) => fruit.name === this.dropper.name
      );

      const gameObject = this.addFruit(
        this.dropper.x,
        this.dropper.y,
        currentFruit
      );
      this.group.add(gameObject);

      const prevNextFruit = this.nextFruitItem;
      this.nextFruitItem = fruits[Math.floor(Math.random() * MAX_INITIAL_FRUIT_INDEX)];
      this.updateDropper(prevNextFruit);
      this.updateNextPanel(this.nextFruitItem);
    });

    this.matter.world.on("collisionstart", (event) => {
      for (const pair of event.pairs) {
        if (pair.bodyA.gameObject?.name === pair.bodyB.gameObject?.name) {
          const fruitIndex = fruits.findIndex(
            (fruit) => fruit.name === pair.bodyA.gameObject?.name
          );

          if (fruitIndex === -1) {
            continue;
          }

          this.score += (fruitIndex + 1) * 2;
          this.drawScore();

          pair.bodyA.gameObject.destroy();
          pair.bodyB.gameObject.destroy();

          emitter.setTexture(fruits[fruitIndex].name);
          emitter.emitParticleAt(
            pair.bodyB.position.x,
            pair.bodyB.position.y,
            10
          );

          const newFruit = fruits[fruitIndex + 1];

          if (!newFruit) {
            continue;
          }

          this.mergeSound.play();

          const gameObject = this.addFruit(
            pair.bodyB.position.x,
            pair.bodyB.position.y,
            newFruit
          );
          this.group.add(gameObject);

          return;
        }
      }
    });

    this.events.on("ceilinghit", () => {
      if (this.gameOver || this.ceilingHitTimer) return;

      this.ceilingHitTimer = this.time.delayedCall(1000, () => {
        const isStillOverCeiling = this.group.getChildren().some((obj) => {
          const fruitData = fruits.find((f) => f.name === obj.name);
          return fruitData && obj.y - fruitData.radius < FRAME_TOP;
        });

        if (isStillOverCeiling) {
          this.gameOver = true;
          button.setVisible(true);
          this.dropper.setVisible(false);
          this.ziraiChan.setVisible(false);

          const rawName =
            prompt(
              `ゲームオーバー！\nスコア: ${this.score}点\n\nランキングに登録する名前を入力してください:`
            )?.trim() ?? '';
          const playerName = rawName.slice(0, 20) || 'Anonymous';

          if (typeof window.saveScoreToFirebase === 'function') {
            window
              .saveScoreToFirebase(playerName, this.score)
              .then(() => {
                if (typeof window.showRanking === 'function') {
                  window.showRanking();
                }
              })
              .catch((e) => {
                console.error('スコアの保存中にエラーが発生しました:', e);
              });
          }
        }
        this.ceilingHitTimer = null;
      });
    });
  }
}

new Phaser.Game({
  scene: [Main],
  width: 600,
  height: 1000,
  scale: {
    mode: Phaser.Scale.ScaleModes.FIT,
  },
  autoCenter: Phaser.Scale.Center.CENTER_HORIZONTALLY,
  transparent: true,
  physics: {
    default: "matter",
    matter: {
      debug: false,
    },
  },
});
