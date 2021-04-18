<script lang="ts">
  import type CellData from "../../interfaces/cell-data";
  import Mine from "./mine.svelte";
  import Number from "./number.svelte";
  export let cellData: CellData;
</script>

<div class="back-face">
  {#if cellData.isMine}<Mine />{/if}
  {#if cellData.numAdjacentMines > 0}<Number
      value={cellData.numAdjacentMines}
    />
  {/if}
</div>
