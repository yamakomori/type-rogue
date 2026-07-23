# 4コマスプライト仕様

## 出力

- 透過PNG、RGBA
- 全体 `1024 × 256px`
- `256 × 256px` の4セルを横一列
- 全フレーム右向き
- 同じ個体、同じ縮尺、同じ基準線
- 画面上では約48〜80 CSS pxで使う
- `image-rendering: pixelated`

## フレーム

1. 読みやすい休止姿勢
2. 尾、ひれ、脚、触手などを片側へ動かす
3. 反対側または上下へ動かす
4. 休止姿勢へ戻し、小さな泡または種固有の控えめな特徴を加える

第1フレームは動き軽減時の静止画として成立させる。泡や発光を本体から離しすぎない。

## クロマキー

生き物に含まれず、輪郭色から十分離れた純色を選ぶ。

- 青を含まない暖色系: `#0000ff`
- 青い生き物: `#ff00ff` または `#00ff00`
- 緑の生き物: `#ff00ff` または `#0000ff`

背景にはグラデーション、影、光彩を入れない。透過処理で体色が欠けた場合、閾値で無理に救済せずクロマキー色を変えて再生成する。

## 基本プロンプト

```text
Use case: production trial 4-frame pixel-art sprite strip for a calm Japanese typing aquarium game.
Use the referenced completed sprites strictly for pixel density, outline weight, limited palette,
simple shading, scale, spacing, and layout.

Create exactly four equal square animation cells in one horizontal row. Each cell contains the
same single small right-facing [CREATURE], at a consistent scale and baseline.

Identity and markings: [REAL TRAITS].
Animation: neutral, [MOTION A], [MOTION B], neutral with two tiny bubbles or [SPECIES DETAIL].
Flat solid chroma-key background exactly [KEY COLOR].

No transparency, text, labels, UI, borders, dividers, scenery, shadow, glow, or extra creatures.
```

実在生物では、創作的な器官を追加しない。ゲームらしい省略は、輪郭と主要模様を損なわない範囲にする。

## アプリ接続

種データの例:

```js
{
  rarity: "common",
  sprite: {
    src: "/sprites/example-strip.png",
    frames: 4,
    frameMs: 280,
    sourceFacing: "right"
  }
}
```

4フレームの1周は通常 `0.9〜1.4s`。深海の遅い生き物は `1.2〜1.8s` まで許容する。

画像メタデータは `FISH_SPECIES` だけへ置く。捕獲個体、セーブ、進行データへ複製しない。
