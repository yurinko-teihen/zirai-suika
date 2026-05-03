
const fruits = [
  { name: "fruit01", radius: 30 },
  { name: "fruit2", radius: 35 },
  { name: "fruit3", radius: 40 },
  { name: "fruit4", radius: 50 },
  { name: "fruit5", radius: 65 },
  { name: "fruit6", radius: 70 },
  { name: "fruit7", radius: 80 },
  { name: "fruit8", radius: 90 },
  { name: "fruit9", radius: 100 },
  { name: "fruit10", radius: 110 },
  { name: "fruit11", radius: 120 },
];

class Main extends Phaser.Scene {
  score = 0;
  gameOver = false;

  preload() {
    this.load.path = "public/";
    this.load.image("headstone", "Headstone.png");

    this.load.image("newgame", "New Game Button.png");

    for (const fruit of fruits) {
      this.load.image(`${fruit.name}`, `${fruit.name}.png`);
    }
  }

  updateDropper(fruit) {
    this.dropper
      .setTexture(fruit.name)
      .setName(fruit.name)
      .setDisplaySize(fruit.radius * 2, fruit.radius * 2)
      .setY(fruit.radius + 205);
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

  setDropperX(x) {
    const p = 65;
    const r = this.dropper.displayWidth / 2;
    if (x < r + p) {
      x = r + p;
    } else if (x > +this.game.config.width - r - p) {
      x = +this.game.config.width - r - p;
    }
    this.dropper.setX(x);
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
    this.add
      .nineslice(0, 0, "headstone")
      .setOrigin(0)
      .setDisplaySize(+this.game.config.width, +this.game.config.height)
      .setPipeline("Light2D")
      .setDepth(-2);

    this.matter.world.setBounds(
      65,
      0,
      +this.game.config.width - 130,
      +this.game.config.height - 1
    );
    this.group = this.add.group();

    const light = this.lights
      .addLight(
        this.input.activePointer.x,
        this.input.activePointer.y,
        1000,
        0x99ffff,
        0.75
      )
      .setScrollFactor(0);
    this.lights.enable().setAmbientColor(0xdddddd);

    const emitter = this.add.particles(0, 0, fruits[0].name, {
      lifespan: 1000,
      speed: { min: 200, max: 350 },
      scale: { start: 0.1, end: 0 },
      rotate: { start: 0, end: 360 },
      alpha: { start: 1, end: 0 },
      gravityY: 200,
      emitting: false,
    });

    this.scoreText = this.add
      .text(+this.game.config.width / 2, 150, "0", {
        fontSize: "64px",
        color: "#ffffff",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5, 0.5);
    this.drawScore();

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
    this.updateDropper(fruits[0]);

    this.ceiling = this.matter.add.rectangle(
      +this.game.config.width / 2,
      100,
      +this.game.config.width,
      200
    );
    this.ceiling.isStatic = true;

    const line = this.add
      .rectangle(160, 200, +this.game.config.width - 320, 2, 0xccccff)
      .setOrigin(0)
      .setAlpha(0.1)
      .setDepth(-2);
    line.postFX.addShine();
    line.postFX.addGlow();

    this.input.on("pointermove", (pointer) => {
      this.setDropperX(pointer.x);
      light.setPosition(pointer.x, pointer.y);
    });

    this.input.on("pointerup", () => {
      if (!this.dropper.visible || this.gameOver) {
        return;
      }

      this.dropper.setVisible(false);
      this.time.delayedCall(500, () => this.dropper.setVisible(!this.gameOver));

      const currentFruit = fruits.find(
        (fruit) => fruit.name === this.dropper.name
      );

      const gameObject = this.addFruit(
        this.dropper.x,
        this.dropper.y,
        currentFruit
      );
      this.group.add(gameObject);

      const nextFruit = fruits[Math.floor(Math.random() * 5)];
      this.updateDropper(nextFruit);
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
