<script lang="ts">
  import Game from "./game.svelte";
  import Menu from "./menu.svelte";
  import Timer from "./timer.svelte";
  enum GameState {
    Menu,
    Game,
    PostGame
  };
  let gameState = GameState.Menu;
  let numberOfMines: number = 10;
  let width: number = 10;
  let height: number = 10;
  function onGameEnd(e) {
    console.log(e);
    gameState = GameState.PostGame;
    setTimeout(() => {
      gameState = GameState.Menu;
    }, 5000);
    
  }
  function onStart(e: any) {
    ({width, height, numberOfMines } = e.detail);
    gameState = GameState.Game;
  }

  function shouldShowGame(state) {
    return state === GameState.Game || state === GameState.PostGame;
  }
  function shouldShowMenu(state) {
    return state === GameState.Menu;
  }

</script>
<style>
  div {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;

    font-family: 'Varela Round', sans-serif;
    font-size: 2rem;
  }
</style>
<div>
  <h1>Minesweeper</h1>
  {#if shouldShowGame(gameState)}
    <Timer active={gameState === GameState.Game} />
    <Game on:end={onGameEnd} width={width} height={height} numberOfMines={numberOfMines} />
  {:else if shouldShowMenu(gameState)}
    <Menu on:start={onStart}/>
  {/if}
</div>
