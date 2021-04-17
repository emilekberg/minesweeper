<script>
  export let isFlipped = false;
  export let animationDelay = 0;
</script>

<div
  style="transition: transform .25s linear {animationDelay}s;"
  class="card"
  class:is-flipped={isFlipped}
  on:click
  on:contextmenu
>
  <div class="front-face full-size center-content rounded">
    <slot name="front" />
  </div>
  <div class="back-face full-size center-content rounded">
    <slot name="back" />
  </div>
</div>

<style>
  .card {
    width: 4rem;
    height: 4rem;
    color: white;
    margin: 0.125rem;

    position: relative;
    transition: transform 0.25s linear 0s;
    
    transform-style: preserve-3d;
    cursor: pointer;
    -moz-user-select: none;
  }

  .full-size {
    height: 100%;
    width: 100%;
  }

  .center-content {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .rounded {
    border-radius: 0.5rem;
  }

  .front-face {
    position: absolute;
    backface-visibility: hidden;
    background-color: rgb(24, 42, 42);
  }

  .back-face {
    position: absolute;
    backface-visibility: hidden;
    transform: rotateY(180deg);
    background-color: darkslategray;
  }

  .is-flipped {
    transform: rotateY(180deg);
  }
</style>
