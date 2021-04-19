export default class Timer {
  protected intervalId: number;
  seconds: number = 0;

  constructor(start: boolean) {
    if (start) {
      this.start();
    }
  }
  start() {
    this.seconds = 0;
    setInterval(() => {
      this.seconds++;
    }, 1000);
  }

  stop() {
    clearInterval(this.intervalId);
  }

  toString() {
    var seconds = this.seconds % 60;
    var minutes = Math.floor((this.seconds / 60) % 60);
    var hours = Math.floor(this.seconds / 60 / 60);
    var secondsString = seconds.toString().padStart(2, '0');
    var minutesString = minutes.toString().padStart(2, '0');
    var hourString = hours.toString().padStart(2, '0');
    return `${hourString}:${minutesString}:${secondsString}`;
  }
}