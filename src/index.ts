import App from './components/app.svelte';

const app = new App({
  target: document.getElementById('target'),
  props: {
    answer: 42
  }
});
