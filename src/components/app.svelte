<script lang="ts">
  import Game from "./game.svelte";
  import Timer from "./timer.svelte";
  let gameActive = true;
  function onGameEnd(e) {
    console.log(e);
    gameActive = false;
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
  <Timer active={gameActive} />
  <Game on:end={onGameEnd} />
</div>
