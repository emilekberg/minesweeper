<script lang="ts">
  import type CellData from "../../interfaces/cell-data";
  import Flag from "./flag.svelte";

  export let cellData: CellData;
</script>

<div class="front-face">
  {#if cellData.hasFlag}<Flag />{/if}
</div>
