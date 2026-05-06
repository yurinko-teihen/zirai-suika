
const fruits = [
  { name: "fruit01", radius: 28 },
  { name: "fruit02", radius: 33 },
  { name: "fruit03", radius: 38 },
  { name: "fruit04", radius: 47 },
  { name: "fruit5", radius: 62 },
  { name: "fruit6", radius: 66 },
  { name: "fruit7", radius: 76 },
  { name: "fruit8", radius: 85 },
  { name: "fruit9", radius: 95 },
  { name: "fruit10", radius: 104 },
  { name: "fruit11", radius: 114 },
];

const VERSION = "v0.0.2";
const MAX_INITIAL_FRUIT_INDEX = 5;
const ZIRAI_CHAN_SIZE = 100;

const FRAME_LEFT = 65;
const FRAME_TOP = 175;
const FRAME_WIDTH = 470;
const FRAME_HEIGHT = 798;

class Main extends Phaser.Scene {
  score = 0;
  gameOver = false;
  nextFruitItem = null;

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
    });

    this.load.path = "public/";
    this.load.image("newgame", "New Game Button.png");
    this.load.image("zirai_chan", "zirai_chan.png");

    for (const fruit of fruits) {
      this.load.image(`${fruit.name}`, `${fruit.name}.png`);
    }
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
      .setCircle(fruit.radius)
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
    // --- Game frame (canvas border) ---
    const graphics = this.add.graphics();
    graphics.fillStyle(0x000000, 0.15);
    graphics.fillRect(FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, FRAME_HEIGHT);
    graphics.lineStyle(3, 0xccccff, 0.8);
    graphics.strokeRect(FRAME_LEFT, FRAME_TOP, FRAME_WIDTH, FRAME_HEIGHT);
    graphics.setDepth(-2);

    // --- Score panel ---
    const scorePanel = this.add.graphics();
    scorePanel.fillStyle(0x000000, 0.45);
    scorePanel.fillRoundedRect(80, 15, 210, 100, 12);
    scorePanel.lineStyle(2, 0xccccff, 0.7);
    scorePanel.strokeRoundedRect(80, 15, 210, 100, 12);

    this.add.text(185, 28, "SCORE", {
      fontSize: "14px",
      color: "#aaaaff",
      fontStyle: "bold",
    }).setOrigin(0.5, 0);

    this.scoreText = this.add
      .text(185, 80, "0", {
        fontSize: "42px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5, 0.5);
    this.drawScore();

    // --- Next panel ---
    const nextPanel = this.add.graphics();
    nextPanel.fillStyle(0x000000, 0.45);
    nextPanel.fillRoundedRect(390, 15, 145, 155, 12);
    nextPanel.lineStyle(2, 0xccccff, 0.7);
    nextPanel.strokeRoundedRect(390, 15, 145, 155, 12);

    this.add.text(462, 28, "NEXT", {
      fontSize: "14px",
      color: "#aaaaff",
      fontStyle: "bold",
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

    // --- Physics setup ---
    this.matter.world.setBounds(
      FRAME_LEFT,
      0,
      FRAME_WIDTH,
      +this.game.config.height - 1
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
      this.gameOver = true;
      button.setVisible(true);
      this.dropper.setVisible(false);
      this.ziraiChan.setVisible(false);
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
