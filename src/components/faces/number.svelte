<script>
  export let value = 0;
</script>
<style>
  span {
    font-family: 'Varela Round', sans-serif;
    font-size: 2rem;
    color: red;
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
</style>

<span class="adjacent-count count-{value}">{value}</span>
