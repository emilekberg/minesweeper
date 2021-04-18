<script lang="ts">
  import leftPad from "../utilities/left-pad";
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  let intervalInstance = setInterval(() => {
    seconds++;
    if(seconds >= 60) {
      seconds = 0;
      minutes++;
    }
    if(minutes >= 60) {
      minutes = 0;
      hours++;
    }
  }, 1000);

  function formatTime(hours: number, minutes: number, seconds: number): string {
    const hoursString = leftPad(hours, 2, '0');
    const minutesString = leftPad(minutes, 2, '0');
    const secondsString = leftPad(seconds, 2, '0');
    return `${hoursString}:${minutesString}:${secondsString}`;
  }
</script>
<div>
  Time: <span>{formatTime(hours, minutes, seconds)}</span>
</div>