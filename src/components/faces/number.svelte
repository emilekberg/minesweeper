<script>
  export let value = 0;
</script>
<style>
  span {
    font-family: 'Varela Round', sans-serif;
    font-size: 2rem;
  }
  .count-1 {
    color: yellow;
  }
  .count-2 {
    color: orange;
  }
  .count-3 {
    color: orangered;
  }
  .count-4 {
    color: red;
  }
</style>

<span class="neighbour-count count-{value}">{value}</span>
