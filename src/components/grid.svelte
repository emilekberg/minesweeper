<script lang="ts">
  import type MineSweeper from "../mine-sweeper";
  import Front from './faces/front.svelte';
  import Back from './faces/back.svelte';
  import Card from "./card.svelte";
  import type CellData from "../interfaces/cell-data";
  export let game: MineSweeper;
  game.init(10, 10, 10);
  let lastClick = {
    x: 0,
    y: 0,
  };

  let grid = getGrid(game.getData());

  function getGrid(data: Readonly<CellData[]>) {
    const result: CellData[][] = [];
    data.forEach((cell) => {
      if (result.length === cell.y) {
        result.push([]);
      }
      result[result.length - 1].push(cell);
    });
    return result;
  }
  function onClick(x: number, y: number) {
    lastClick = { x, y };
    game.reveal(x, y);
    grid = getGrid(game.getData());
  }
  function onRightClick(x: number, y: number) {
    game.toggleFlag(x, y);
    grid = getGrid(game.getData());
  }

  function distanceToLastClick(x: number, y: number) {
    const dX = lastClick.x - x;
    const dY = lastClick.y - y;
    const len = Math.sqrt(dX * dX + dY * dY);
    return len;
  }

  function getAnimationDelay(x: number, y: number) {
    if (game.hasGameFinished()) {
      return 0;
    }

    const len = distanceToLastClick(x, y);
    return len * 0.12;
  }
</script>

<div id="game-grid" class="scene">
  {#each grid as cells, row}
    <div class="row" id="row-{row}">
      {#each cells as cellData}
        <Card
          isFlipped={cellData.isRevealed}
          animationDelay={getAnimationDelay(cellData.x, cellData.y)}
          on:click={() => onClick(cellData.x, cellData.y)}
          on:contextmenu={(e) => {
            e.preventDefault();
            onRightClick(cellData.x, cellData.y);
          }}
        >
          <div slot="front">
            <Front cellData={cellData} />
          </div>
          <div slot="back">
            <Back cellData={cellData} />
          </div>
        </Card>
      {/each}
    </div>
  {/each}
</div>

<style>
  .row {
    display: flex;
  }

  .scene {
    perspective: 600px;
  }
</style>
