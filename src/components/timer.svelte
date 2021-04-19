<script lang="ts">
  import { beforeUpdate } from "svelte";

  export let active: boolean = true;
  let intervalInstance: number | undefined = undefined;
  let startTime: number|undefined;
  let currentTime: number|undefined;

  beforeUpdate(() => {
    if (active) {
      start();
    } else {
      stop();
    }
  });

  function start() {
    if (intervalInstance !== undefined) return;
    startTime = Date.now();
    intervalInstance = setInterval(() => {
      currentTime = Date.now();
    }, 10);
  }
  function stop() {
    if (intervalInstance === undefined) return;
    clearInterval(intervalInstance);
    intervalInstance = undefined;
  }

  function formatTime(start, current): string {
    if(!start && !current) return;
    const diffInSeconds = (current - start) / 1000;
    
    var seconds = Math.floor(diffInSeconds % 60);
    var ms = Math.floor((diffInSeconds - seconds) * 1000);
    var minutes = Math.floor((diffInSeconds / 60) % 60);
    var hours = Math.floor(diffInSeconds / 60 / 60);
    const hoursString = hours.toString().padStart(2, '0');
    const minutesString = minutes.toString().padStart(2, '0');
    const secondsString = seconds.toString().padStart(2, '0');
    const msString = ms.toString().padStart(3, '0');
    return `${hoursString}:${minutesString}:${secondsString}.${msString}`;
  }
</script>

<span>{formatTime(startTime, currentTime)}</span>
