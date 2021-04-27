<script lang="ts">
import Markers from "../../constants/markers";

  import type CellData from "../../interfaces/cell-data";
  import Flag from "./flag.svelte";
import Questionmark from "./questionmark.svelte";

  export let cellData: CellData;
</script>

<div class="front-face">
  {#if cellData.icon === Markers.FLAG}<Flag />{/if}
  {#if cellData.icon === Markers.QUESTION_MARK}<Questionmark />{/if}
</div>
