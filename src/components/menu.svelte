<script lang="ts">
import { createEventDispatcher } from "svelte";


  const dispatcher = createEventDispatcher();

  let width = 10;
  let height = 10;
  let numberOfMines = 10;

  function onStart() {
    dispatcher('start', {width, height, numberOfMines});
  }
</script>

<style>
  #input-fields {
    align-items: center;
    justify-content: center;
    display: flex;
    flex-direction: column;
  }
  #menu {
    display: flex;
    align-items: center;
    justify-content: center;
    
    flex-direction: column;
  }
  button {
    font-size: 1rem;
    padding: 1rem;
    width: 20rem;
  }
</style>

<div id='menu'>
  <button on:click={onStart} id="start">Start</button>
  <div id='input-fields'>
    <label for="width">Width: </label> <input id="width" type="number" bind:value="{width}" />
    <label for="height">Height: </label><input id="height" type="number" bind:value="{height}"/>
    <label for="number-of-mines">Number of Mines: </label><input id="number-of-mines" type="number" bind:value="{numberOfMines}"/>
  </div>
</div>