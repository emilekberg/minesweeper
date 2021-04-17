<script lang="ts">
  
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  export let active = true;

  let intervalInstance = setInterval(() => {
    if(!active) {
      return;
    }
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
  if(!active)
  {
    clearInterval(intervalInstance);
  }
  function formatTime(hours, minutes, seconds) {
    const hoursString = leftPad(hours, 2, 0);
    const minutesString = leftPad(minutes, 2, 0);
    const secondsString = leftPad(seconds, 2, 0);
    return `${hoursString}:${minutesString}:${secondsString}`;
  }

  function leftPad(value, numberOfLetters, letter) {
    let valueString = value.toString();
    if(valueString.length >= numberOfLetters) {
      return valueString;
    }
    let prefix = '';
    for(let i = valueString.length; i < numberOfLetters; i++) {
      prefix += letter;
    }
    valueString = prefix + valueString;
    return valueString;
  }

</script>
<div>
  Time: <span>{formatTime(hours, minutes, seconds)}</span>
</div>