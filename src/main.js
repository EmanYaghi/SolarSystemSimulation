import App from './App.js';

(async function main() {
    const app = new App(document.body);
    await app.init();
})();
