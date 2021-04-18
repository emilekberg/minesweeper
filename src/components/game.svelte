<script lang="ts">
import MineSweeper from "../mine-sweeper";

  import Grid from "./grid.svelte";
  import Timer from './timer.svelte';

  var game = new MineSweeper();
</script>
<style>
  div {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>

<div>
  <h1>Mine sweeper</h1>
  <Timer />
  <Grid game={game} />
</div>
